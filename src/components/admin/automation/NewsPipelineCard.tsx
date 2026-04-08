import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Newspaper, Layers, Sparkles, Play, RefreshCw, CheckCircle2, Square,
  Clock, Loader2, ChevronRight, Tag, Plus, X, Settings2, Zap,
  Activity, ArrowUpRight, AlertTriangle, Radio, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCuratedPostsStats, useAutoPromoteCurated, useAutoPromotePolling } from '@/hooks/useCuratedPosts';
import { usePipelineConfig } from '@/hooks/usePipelineConfig';
import {
  getWorkflows,
  activateWorkflow,
  deactivateWorkflow,
  executeWorkflow,
  getExecutions,
  CronWorkflowError,
} from '@/services/n8n';
import type { N8nWorkflow, N8nExecution } from '@/types/automation';

/* ── Pipeline step descriptor ── */
interface PipelineStep {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  nameMatch: string;
  delayAfterMs: number;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    key: 'wf01',
    label: 'Coleta RSS',
    shortLabel: 'Coleta',
    description: 'Recolha de notícias via feeds',
    icon: Newspaper,
    nameMatch: 'WF-01',
    delayAfterMs: 60_000,
  },
  {
    key: 'wf02',
    label: 'Cluster & Dedup',
    shortLabel: 'Cluster',
    description: 'Agrupamento e deduplicação',
    icon: Layers,
    nameMatch: 'WF-02',
    delayAfterMs: 30_000,
  },
  {
    key: 'wf03',
    label: 'IA Reescrita',
    shortLabel: 'IA',
    description: 'Geração de artigos por IA',
    icon: Sparkles,
    nameMatch: 'WF-03',
    delayAfterMs: 0,
  },
];

/* ── Activity log entry ── */
interface LogEntry {
  id: string;
  timestamp: Date;
  step: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'running';
}

/** Deduplicate workflows by name — keep first occurrence only */
function deduplicateWorkflows(wfs: N8nWorkflow[]): N8nWorkflow[] {
  const seen = new Map<string, N8nWorkflow>();
  for (const wf of wfs) {
    const name = wf.name ?? '';
    if (!seen.has(name)) {
      seen.set(name, wf);
    }
  }
  return [...seen.values()];
}

function matchWorkflow(workflows: N8nWorkflow[], nameMatch: string): N8nWorkflow | undefined {
  return workflows.find((w) => w.name?.includes(nameMatch));
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const LOG_TYPE_STYLES: Record<string, string> = {
  info: 'text-gray-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warn: 'text-amber-400',
  running: 'text-cyan-400',
};

/* ── LocalStorage persistence keys ── */
const LS_KEY_LOG = 'pipeline:activityLog';
const LS_KEY_SHOW_LOG = 'pipeline:showLog';

function loadPersistedLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY_LOG);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<LogEntry, 'timestamp'> & { timestamp: string }>;
    return parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) })).slice(0, 100);
  } catch {
    return [];
  }
}

function persistLog(entries: LogEntry[]) {
  try {
    localStorage.setItem(LS_KEY_LOG, JSON.stringify(entries.slice(0, 100)));
  } catch { /* quota exceeded — ignore */ }
}

function loadPersistedShowLog(): boolean {
  try {
    return localStorage.getItem(LS_KEY_SHOW_LOG) === 'true';
  } catch {
    return false;
  }
}

export function NewsPipelineCard() {
  const { toast } = useToast();
  const { data: stats } = useCuratedPostsStats();
  const autoPromote = useAutoPromoteCurated();
  const polling = useAutoPromotePolling();
  const {
    activeConfig,
    updateTags,
    createConfig,
    isSaving,
  } = usePipelineConfig();

  /* ── n8n state ── */
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<N8nExecution[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Pipeline execution state ── */
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [failedSteps, setFailedSteps] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);

  /* ── Activity log state (persisted) ── */
  const [activityLog, setActivityLog] = useState<LogEntry[]>(() => loadPersistedLog());
  const [showLog, setShowLog] = useState(() => loadPersistedShowLog());
  const logIdRef = useRef(0);

  /* ── Tag editing state ── */
  const [showConfig, setShowConfig] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  /* ── Persist activity log and showLog to localStorage ── */
  useEffect(() => { persistLog(activityLog); }, [activityLog]);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY_SHOW_LOG, String(showLog)); } catch { /* ignore */ }
  }, [showLog]);

  const addLogEntry = useCallback((step: string, message: string, type: LogEntry['type'] = 'info') => {
    logIdRef.current += 1;
    const entry: LogEntry = {
      id: `log-${logIdRef.current}`,
      timestamp: new Date(),
      step,
      message,
      type,
    };
    setActivityLog((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await getWorkflows();
      setWorkflows(deduplicateWorkflows(raw));
      addLogEntry('Sistema', `${raw.length} workflow(s) carregados do n8n`, 'info');
    } catch {
      addLogEntry('Sistema', 'Falha ao carregar workflows do n8n', 'warn');
    } finally {
      setLoading(false);
    }
  }, [addLogEntry]);

  const fetchRecentExecutions = useCallback(async () => {
    try {
      const execs = await getExecutions(10);
      setRecentExecutions(execs);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchWorkflows();
    void fetchRecentExecutions();
  }, [fetchWorkflows, fetchRecentExecutions]);

  // Poll executions every 15s while pipeline is running
  useEffect(() => {
    if (!pipelineRunning) return;
    const interval = setInterval(() => void fetchRecentExecutions(), 15_000);
    return () => clearInterval(interval);
  }, [pipelineRunning, fetchRecentExecutions]);

  /* ── Derived state ── */
  const pipelineWorkflows = PIPELINE_STEPS.map((step) => ({
    step,
    wf: matchWorkflow(workflows, step.nameMatch),
  })).filter((x) => x.wf !== undefined);

  const allActive = pipelineWorkflows.length > 0 && pipelineWorkflows.every((x) => x.wf?.active === true);
  const someActive = pipelineWorkflows.some((x) => x.wf?.active === true);
  const pipelineFound = pipelineWorkflows.length > 0;

  // Check if any recent execution is still running
  const hasRunningExecution = recentExecutions.some((e) => e.status === 'running');

  /* ── Toggle all workflows ── */
  const handleToggleAll = async () => {
    const target = !allActive;
    addLogEntry('Sistema', target ? 'A ativar todos os workflows...' : 'A desativar todos os workflows...', 'running');
    for (const { wf, step } of pipelineWorkflows) {
      if (!wf) continue;
      try {
        if (target) await activateWorkflow(String(wf.id));
        else await deactivateWorkflow(String(wf.id));
        addLogEntry(step.shortLabel, target ? 'Ativado' : 'Desativado', 'success');
      } catch {
        addLogEntry(step.shortLabel, target ? 'Falha ao ativar' : 'Falha ao desativar', 'error');
      }
    }
    toast({
      title: target ? 'Pipeline ativado' : 'Pipeline desativado',
      description: target
        ? 'Workflows serão executados automaticamente nos intervalos definidos.'
        : 'Execução automática pausada.',
    });
    await fetchWorkflows();
  };

  /* ── Run full pipeline sequentially ── */
  const handleRunPipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    setCompletedSteps(new Set());
    setFailedSteps(new Set());
    abortRef.current = false;
    setShowLog(true);

    addLogEntry('Pipeline', 'Iniciando pipeline de notícias IA...', 'running');

    for (const { step, wf } of pipelineWorkflows) {
      if (abortRef.current) {
        addLogEntry('Pipeline', 'Pipeline cancelado pelo utilizador', 'warn');
        break;
      }
      if (!wf) continue;

      setCurrentStep(step.key);
      addLogEntry(step.shortLabel, `Executando workflow "${wf.name}" (ID: ${wf.id})...`, 'running');

      try {
        const result = await executeWorkflow(String(wf.id));
        setCompletedSteps((prev) => new Set([...prev, step.key]));
        addLogEntry(step.shortLabel, `Execução disparada com sucesso (${result.method})`, 'success');

        if (step.delayAfterMs > 0 && !abortRef.current) {
          addLogEntry(step.shortLabel, `Aguardando ${Math.round(step.delayAfterMs / 1000)}s antes do próximo passo...`, 'info');
          await new Promise((r) => setTimeout(r, step.delayAfterMs));
        }
      } catch (err) {
        if (err instanceof CronWorkflowError) {
          // Cron workflow — not an error, it runs automatically on schedule
          setCompletedSteps((prev) => new Set([...prev, step.key]));
          addLogEntry(step.shortLabel, 'Workflow ativo — executa automaticamente por cron/schedule', 'info');
          continue;
        }

        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        setFailedSteps((prev) => new Set([...prev, step.key]));
        addLogEntry(step.shortLabel, `Erro: ${msg}`, 'error');
        toast({
          title: `Erro em ${step.label}`,
          description: msg,
          variant: 'destructive',
        });
        break;
      }
    }

    setCurrentStep(null);
    setPipelineRunning(false);

    // Auto-promote ready curated posts → drafts
    addLogEntry('Promoção', 'Verificando artigos curados prontos para rascunhos...', 'running');
    try {
      const result = await autoPromote.mutateAsync();
      if (result && result.promoted > 0) {
        addLogEntry('Promoção', `${result.promoted} artigo(s) promovido(s) para rascunhos. Email de notificação enviado.`, 'success');
      } else {
        addLogEntry('Promoção', 'Nenhum artigo curado com status "ready". Aguarde os workflows cron gerarem novos artigos.', 'info');
      }
    } catch (err) {
      addLogEntry('Promoção', `Erro: ${err instanceof Error ? err.message : 'Falha'}`, 'error');
    }

    const cronSteps = [...completedSteps].length;
    const failedCount = [...failedSteps].length;
    if (failedCount === 0) {
      addLogEntry('Pipeline', `Pipeline concluído — ${cronSteps} workflow(s) verificados`, 'success');
    } else {
      addLogEntry('Pipeline', `Pipeline concluído com ${failedCount} erro(s)`, 'warn');
    }
    void fetchRecentExecutions();
  };

  /* ── Promote curated posts without n8n (works offline) ── */
  const handlePromoteOnly = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    setShowLog(true);

    addLogEntry('Promoção', 'Verificando artigos curados com status "ready"...', 'running');
    try {
      const result = await autoPromote.mutateAsync();
      if (result && result.promoted > 0) {
        addLogEntry('Promoção', `${result.promoted} artigo(s) movido(s) para rascunhos editoriais. Email enviado ao admin.`, 'success');
        toast({
          title: `${result.promoted} artigo(s) em rascunhos`,
          description: 'Verifique a secção de Posts > Rascunhos para rever e publicar.',
        });
      } else {
        addLogEntry('Promoção', 'Nenhum artigo curado com status "ready" para promover. Aguarde os workflows cron do n8n gerarem novos artigos.', 'info');
        toast({
          title: 'Nenhum artigo pronto',
          description: 'Os workflows cron do n8n geram artigos automaticamente. Aguarde a próxima execução.',
        });
      }
    } catch (err) {
      addLogEntry('Promoção', `Erro: ${err instanceof Error ? err.message : 'Falha'}`, 'error');
    } finally {
      setPipelineRunning(false);
    }
  };

  /* ── Tag management ── */
  const openConfig = () => {
    setEditTags(activeConfig?.tags ?? []);
    setNewTag('');
    setShowConfig(true);
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || editTags.includes(tag)) return;
    setEditTags([...editTags, tag]);
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  const saveTags = async () => {
    if (editTags.length === 0) {
      toast({ title: 'Adicione pelo menos uma tag', variant: 'destructive' });
      return;
    }
    if (activeConfig) {
      await updateTags({ id: activeConfig.id, tags: editTags });
    } else {
      await createConfig({ label: 'Padrão', tags: editTags });
    }
    addLogEntry('Config', `Tags atualizadas: ${editTags.join(', ')}`, 'success');
    setShowConfig(false);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-500/30 shadow-lg shadow-cyan-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${pipelineRunning || hasRunningExecution ? 'bg-cyan-500/20 animate-pulse' : 'bg-cyan-500/10'}`}>
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-white">
                  Pipeline de Notícias IA
                </CardTitle>
                {(pipelineRunning || hasRunningExecution) && (
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] px-1.5 py-0 animate-pulse">
                    <Radio className="w-2.5 h-2.5 mr-1" />
                    AO VIVO
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {pipelineWorkflows.length} workflow{pipelineWorkflows.length !== 1 ? 's' : ''} · Coleta → Cluster → Reescrita
                {someActive && !allActive && <span className="text-amber-400 ml-1">· Parcial</span>}
                {allActive && <span className="text-emerald-400 ml-1">· Todos ativos</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-white" onClick={openConfig}>
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configurar tags de pesquisa</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-white" onClick={() => { void fetchWorkflows(); void fetchRecentExecutions(); }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-7 w-7 p-0 ${showLog ? 'text-cyan-400' : 'text-gray-400'} hover:text-white`}
                  onClick={() => setShowLog(!showLog)}
                >
                  <Activity className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log de atividade</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-700">
              <span className="text-[10px] text-gray-500">Auto</span>
              <Switch
                checked={allActive}
                disabled={!pipelineFound}
                onCheckedChange={() => void handleToggleAll()}
                className="data-[state=checked]:bg-cyan-600"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ── Search Tags ── */}
        {activeConfig && activeConfig.tags.length > 0 && !showConfig && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="w-3 h-3 text-gray-500" />
            {activeConfig.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/30 text-cyan-400">
                {tag}
              </Badge>
            ))}
            <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] text-gray-500 hover:text-cyan-400" onClick={openConfig}>
              editar
            </Button>
          </div>
        )}

        {/* ── Tag Config Panel ── */}
        {showConfig && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">Tags de Pesquisa</span>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-gray-500" onClick={() => setShowConfig(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {editTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-2 py-0.5 border-cyan-500/30 text-cyan-400 gap-1 cursor-pointer hover:border-red-500/30 hover:text-red-400"
                  onClick={() => removeTag(tag)}
                >
                  {tag} <X className="w-2.5 h-2.5" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                placeholder="Ex: tech, IA, mundo..."
                className="h-7 text-xs bg-slate-900 border-slate-700"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button size="sm" variant="outline" className="h-7 border-slate-600 px-2" onClick={addTag}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-[10px] text-gray-500">
              Separe por Enter ou vírgula. Ex: tech, IA, notícias hoje, cibersegurança
            </p>
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowConfig(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-6 text-xs bg-cyan-600 hover:bg-cyan-700" disabled={isSaving} onClick={() => void saveTags()}>
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        )}

        {/* ── Pipeline Steps Visual ── */}
        <div className="flex items-center gap-1">
          {PIPELINE_STEPS.map((step, idx) => {
            const wf = matchWorkflow(workflows, step.nameMatch);
            if (!wf) return null;

            const isActive = wf.active === true;
            const isRunning = currentStep === step.key;
            const isCompleted = completedSteps.has(step.key);
            const isFailed = failedSteps.has(step.key);
            const StepIcon = step.icon;

            const nextStep = PIPELINE_STEPS[idx + 1];
            const nextExists = nextStep ? !!matchWorkflow(workflows, nextStep.nameMatch) : false;

            // Find last execution for this workflow
            const wfExec = recentExecutions.find((e) => String(e.workflowId) === String(wf.id));

            return (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <div
                  className={`flex-1 rounded-lg border p-2.5 transition-all ${
                    isRunning
                      ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/20'
                      : isFailed
                      ? 'border-red-500/40 bg-red-500/5'
                      : isCompleted
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : isActive
                      ? 'border-slate-600/50 bg-slate-800/50'
                      : 'border-slate-700/30 bg-slate-900/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    ) : isFailed ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <StepIcon className={`w-3.5 h-3.5 ${isActive ? 'text-gray-400' : 'text-gray-600'}`} />
                    )}
                    <span className="text-xs font-medium text-white">{step.shortLabel}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto" title="Workflow ativo" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">{step.description}</p>

                  {/* Status badge */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${
                        isRunning
                          ? 'border-cyan-400/30 text-cyan-400'
                          : isFailed
                          ? 'border-red-500/30 text-red-400'
                          : isCompleted
                          ? 'border-emerald-500/30 text-emerald-400'
                          : isActive
                          ? 'border-emerald-600/40 text-emerald-400'
                          : 'border-slate-700 text-slate-600'
                      }`}
                    >
                      {isRunning ? 'Executando...' : isFailed ? 'Erro' : isCompleted ? 'Concluído' : isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {/* Workflow meta info */}
                  <div className="mt-1.5 space-y-0.5">
                    <span className="text-[9px] font-mono text-gray-600 block">
                      ID: {wf.id}
                    </span>
                    {wfExec && (
                      <span className={`text-[9px] block ${
                        wfExec.status === 'success' ? 'text-emerald-500' :
                        wfExec.status === 'error' ? 'text-red-500' :
                        wfExec.status === 'running' ? 'text-cyan-500' : 'text-gray-500'
                      }`}>
                        {wfExec.status === 'running' ? 'A correr' : wfExec.status} · {formatRelativeTime(wfExec.startedAt)}
                      </span>
                    )}
                    {wf.updatedAt && (
                      <span className="text-[9px] text-gray-600 block">
                        Atualizado: {formatRelativeTime(wf.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
                {nextExists && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Activity Log ── */}
        {showLog && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/60">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-white">Log de Atividade</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-600 text-slate-400">
                  {activityLog.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {activityLog.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[10px] text-gray-500 hover:text-white"
                    onClick={() => setActivityLog([])}
                  >
                    Limpar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-gray-500 hover:text-white"
                  onClick={() => setShowLog(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[180px]">
              <div className="p-2 space-y-0.5">
                {activityLog.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">Nenhuma atividade registada. Execute o pipeline para ver os logs.</p>
                ) : (
                  activityLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 py-0.5 hover:bg-slate-800/30 px-1 rounded">
                      <span className="text-[9px] text-gray-600 font-mono shrink-0 mt-0.5 tabular-nums">
                        {formatTime(entry.timestamp)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-1 py-0 shrink-0 mt-0.5 ${
                          entry.type === 'running' ? 'border-cyan-500/30 text-cyan-400' :
                          entry.type === 'success' ? 'border-emerald-500/30 text-emerald-400' :
                          entry.type === 'error' ? 'border-red-500/30 text-red-400' :
                          entry.type === 'warn' ? 'border-amber-500/30 text-amber-400' :
                          'border-slate-600 text-slate-400'
                        }`}
                      >
                        {entry.step}
                      </Badge>
                      <span className={`text-[10px] ${LOG_TYPE_STYLES[entry.type] ?? 'text-gray-400'}`}>
                        {entry.type === 'running' && <Loader2 className="w-2.5 h-2.5 inline animate-spin mr-1" />}
                        {entry.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ── Recent n8n Executions ── */}
        {recentExecutions.length > 0 && !showLog && (
          <div className="flex items-center gap-2 flex-wrap">
            <Eye className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] text-gray-500">Recentes:</span>
            {recentExecutions.slice(0, 5).map((exec) => (
              <Badge
                key={String(exec.id)}
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${
                  exec.status === 'success' ? 'border-emerald-500/30 text-emerald-400' :
                  exec.status === 'error' ? 'border-red-500/30 text-red-400' :
                  exec.status === 'running' ? 'border-cyan-500/30 text-cyan-400 animate-pulse' :
                  'border-slate-600 text-slate-400'
                }`}
              >
                {exec.status === 'running' && <Loader2 className="w-2 h-2 animate-spin mr-0.5" />}
                WF-{exec.workflowId} · {exec.status} · {formatRelativeTime(exec.startedAt)}
              </Badge>
            ))}
          </div>
        )}

        {/* ── Actions + Stats ── */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-2">
            {pipelineFound ? (
              <>
                <Button
                  size="sm"
                  className={`h-8 text-xs gap-1.5 ${pipelineRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                  disabled={pipelineRunning}
                  onClick={() => void handleRunPipeline()}
                >
                  {pipelineRunning ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pipeline a correr...</>
                  ) : (
                    <><Play className="w-3.5 h-3.5" /> Executar Pipeline</>
                  )}
                </Button>
                {!pipelineRunning && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10"
                    disabled={pipelineRunning || !stats?.ready}
                    onClick={() => void handlePromoteOnly()}
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    Promover Curados{stats?.ready ? ` (${stats.ready})` : ''}
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-700"
                disabled={pipelineRunning}
                onClick={() => void handlePromoteOnly()}
              >
                {pipelineRunning ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> A promover...</>
                ) : (
                  <><Play className="w-3.5 h-3.5" /> Promover Curados para Rascunhos</>
                )}
              </Button>
            )}
            {pipelineRunning && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-red-400 hover:text-red-300 gap-1" onClick={() => { abortRef.current = true; }}>
                <Square className="w-3 h-3" /> Parar
              </Button>
            )}
          </div>

          {stats && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">
                <Clock className="w-3 h-3 inline mr-0.5" />{stats.total} curados
              </span>
              {stats.ready > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400 animate-pulse">
                  {stats.ready} prontos
                </Badge>
              )}
              {stats.draft > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                  {stats.draft} rascunhos
                </Badge>
              )}
              {stats.published > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400">
                  {stats.published} promovidos
                </Badge>
              )}
              {stats.avgScore > 0 && (
                <span className="text-[10px] text-gray-500">
                  Score: <span className="text-cyan-400 font-medium">{stats.avgScore}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Cron schedule info + auto-promote toggle ── */}
        {pipelineFound && allActive && !pipelineRunning && (
          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-xs text-emerald-300">
                  <span className="font-medium">Pipeline automático ativo</span> — Workflows executam por cronograma no n8n.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-500/10">
              <div className="flex items-center gap-2">
                <Zap className={`w-3.5 h-3.5 ${polling.isActive ? 'text-emerald-400' : 'text-gray-500'}`} />
                <div>
                  <p className="text-xs text-white font-medium">
                    Promoção automática
                    {polling.isActive && (
                      <Badge className="ml-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1 py-0 animate-pulse">
                        ATIVO
                      </Badge>
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {polling.isActive
                      ? `Verifica a cada 2 min · ${polling.totalPromoted} promovido(s)${polling.lastCheck ? ` · Último check: ${formatRelativeTime(polling.lastCheck)}` : ''}`
                      : 'Ativa para mover curated_posts → rascunhos automaticamente com notificação'}
                  </p>
                </div>
              </div>
              <Switch
                checked={polling.isActive}
                onCheckedChange={(checked) => checked ? polling.start() : polling.stop()}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        )}

        {/* ── No workflows warning ── */}
        {!loading && !pipelineFound && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-center">
            <p className="text-xs text-amber-400">
              n8n offline ou nenhum workflow do pipeline encontrado. Use "Promover Curados para Rascunhos" para mover artigos curados existentes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
