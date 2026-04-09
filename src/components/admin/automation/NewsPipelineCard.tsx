import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Newspaper, Layers, Sparkles, Play, RefreshCw, CheckCircle2, Square,
  Clock, Loader2, ChevronRight, Tag, X, Settings2, Zap,
  Activity, ArrowUpRight, AlertTriangle, Radio, Eye, Database, Shield, Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCuratedPostsStats, useAutoPromoteCurated, useAutoPromotePolling } from '@/hooks/useCuratedPosts';
import { usePipelineConfig } from '@/hooks/usePipelineConfig';
import { usePipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import {
  DEFAULT_PIPELINE_POST_TAGS,
  DEFAULT_PIPELINE_THEME_RULES,
  sanitizeStringList,
  type PipelineThemeRule,
} from '@/lib/pipelineThemes';
import {
  getWorkflows,
  activateWorkflow,
  deactivateWorkflow,
  executeWorkflow,
  getExecutions,
  CronWorkflowError,
  deduplicateN8nWorkflows,
} from '@/services/n8n';
import type { N8nWorkflow, N8nExecution } from '@/types/automation';
import { setKeepAlivePipelineBusy } from '@/hooks/useN8nKeepAlive';
import { PipelineSettingsPanel } from './PipelineSettingsPanel';

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

function parseListInput(value: string): string[] {
  return sanitizeStringList(value.split(/[\n,;]+/));
}

const LOG_TYPE_STYLES: Record<string, string> = {
  info: 'text-gray-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warn: 'text-amber-400',
  running: 'text-cyan-400',
};

export function NewsPipelineCard() {
  const { toast } = useToast();
  const { data: stats } = useCuratedPostsStats();
  const autoPromote = useAutoPromoteCurated();
  const polling = useAutoPromotePolling();
  const {
    activeConfig,
    schemaMode,
    saveConfig,
    isSaving,
  } = usePipelineConfig();
  const {
    data: diagnostics,
    error: diagnosticsError,
    refetch: refetchDiagnostics,
  } = usePipelineDiagnostics();

  /* ── n8n state ── */
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<N8nExecution[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Pipeline execution state ── */
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [failedSteps, setFailedSteps] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);
  useEffect(() => {
    setKeepAlivePipelineBusy(pipelineRunning);
  }, [pipelineRunning]);

  /* ── Activity log state (session-only; truth source stays in n8n + DB) ── */
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const logIdRef = useRef(0);

  /* ── Tag editing state ── */
  const [showConfig, setShowConfig] = useState(false);
  const [editConfigLabel, setEditConfigLabel] = useState('Padrão');
  const [editLanguage, setEditLanguage] = useState('pt-PT');
  const [editRegion, setEditRegion] = useState('PT');
  const [editDefaultPostTags, setEditDefaultPostTags] = useState<string[]>(DEFAULT_PIPELINE_POST_TAGS);
  const [newDefaultPostTag, setNewDefaultPostTag] = useState('');
  const [editThemeRules, setEditThemeRules] = useState<PipelineThemeRule[]>(DEFAULT_PIPELINE_THEME_RULES);

  /* ── Settings panel state ── */
  const [showSettings, setShowSettings] = useState(false);

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

  const fetchWorkflows = useCallback(async (attempt = 1) => {
    try {
      setLoading(true);
      const raw = await getWorkflows();
      setWorkflows(deduplicateN8nWorkflows(raw));
      if (attempt === 1) {
        addLogEntry('Sistema', `${raw.length} workflow(s) carregados do n8n`, 'info');
      } else {
        addLogEntry('Sistema', `n8n ativo — ${raw.length} workflow(s) carregados (tentativa ${attempt})`, 'info');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      const is503 = /503/.test(msg);
      
      if (attempt < 3) {
        // Cold start — retry with exponential backoff (40s, 60s)
        const delaySec = attempt === 1 ? 40 : 60;
        if (attempt === 1) {
          addLogEntry('Sistema', `n8n a arrancar (cold start ${is503 ? '503' : 'timeout'}) — aguarde ${delaySec}s...`, 'warn');
        } else {
          addLogEntry('Sistema', `Ainda a arrancar — tentativa ${attempt + 1}/3 em ${delaySec}s...`, 'warn');
        }
        setTimeout(() => void fetchWorkflows(attempt + 1), delaySec * 1000);
      } else {
        addLogEntry('Sistema', 'n8n não respondeu após 3 tentativas. Clique ↻ para tentar novamente ou aguarde 2 minutos.', 'warn');
      }
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

  useEffect(() => {
    const handleFocus = () => {
      void fetchWorkflows();
      void fetchRecentExecutions();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
  const editorialSchemaLegacy = schemaMode === 'legacy' || diagnostics?.configSchemaMode === 'legacy';

  // Check if any recent execution is still running
  const hasRunningExecution = recentExecutions.some((e) => e.status === 'running');

  /* ── Toggle all workflows ── */
  const handleToggleAll = async () => {
    const target = !allActive;
    addLogEntry('Sistema', target ? 'A ativar todos os workflows...' : 'A desativar todos os workflows...', 'running');
    for (const { wf, step } of pipelineWorkflows) {
      if (!wf) continue;
      try {
        if (target) await activateWorkflow(wf);
        else await deactivateWorkflow(String(wf.id));
        addLogEntry(step.shortLabel, target ? 'Ativado' : 'Desativado', 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`[Pipeline] Failed to ${target ? 'activate' : 'deactivate'} workflow ${wf.id}:`, err);
        addLogEntry(step.shortLabel, `Falha: ${msg}`, 'error');
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
    const completedStepKeys = new Set<string>();
    const failedStepKeys = new Set<string>();
    let wasAborted = false;

    addLogEntry('Pipeline', 'Iniciando pipeline de notícias IA...', 'running');

    for (const { step, wf } of pipelineWorkflows) {
      if (abortRef.current) {
        addLogEntry('Pipeline', 'Pipeline cancelado pelo utilizador', 'warn');
        wasAborted = true;
        break;
      }
      if (!wf) continue;

      setCurrentStep(step.key);
      addLogEntry(step.shortLabel, `Executando workflow "${wf.name}" (ID: ${wf.id})...`, 'running');

      try {
        const result = await executeWorkflow(wf);
        completedStepKeys.add(step.key);
        setCompletedSteps(new Set(completedStepKeys));
        addLogEntry(step.shortLabel, `✓ "${wf.name}" executado com sucesso (método: ${result.method})`, 'success');

        // Add contextual detail per step
        if (step.key === 'wf01') {
          addLogEntry(step.shortLabel, 'Coleta RSS iniciada — feeds configurados serão processados', 'info');
        } else if (step.key === 'wf02') {
          addLogEntry(step.shortLabel, 'Agrupamento e deduplicação de artigos em andamento', 'info');
        } else if (step.key === 'wf03') {
          addLogEntry(step.shortLabel, 'IA a gerar artigos reescritos com título, resumo e conteúdo', 'info');
        }

        if (step.delayAfterMs > 0 && !abortRef.current) {
          addLogEntry(step.shortLabel, `Aguardando ${Math.round(step.delayAfterMs / 1000)}s antes do próximo passo...`, 'info');
          await new Promise((r) => setTimeout(r, step.delayAfterMs));
        }
      } catch (err) {
        if (err instanceof CronWorkflowError) {
          // Cron workflow — not an error, it runs automatically on schedule
          completedStepKeys.add(step.key);
          setCompletedSteps(new Set(completedStepKeys));
          addLogEntry(step.shortLabel, 'Workflow ativo — executa automaticamente por cron/schedule', 'info');
          continue;
        }

        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        failedStepKeys.add(step.key);
        setFailedSteps(new Set(failedStepKeys));
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

    const confirmedCount = completedStepKeys.size;
    const failedCount = failedStepKeys.size;
    if (wasAborted) {
      addLogEntry('Pipeline', `Pipeline cancelado após ${confirmedCount} confirmação(ões)`, 'warn');
    } else if (failedCount === 0) {
      addLogEntry('Pipeline', `Pipeline concluído — ${confirmedCount} workflow(s) cron confirmados e ativos`, 'success');
    } else {
      addLogEntry('Pipeline', `Pipeline concluído com ${failedCount} erro(s) após ${confirmedCount} confirmação(ões)`, 'warn');
    }

    // Refresh executions after pipeline finishes
    void fetchRecentExecutions();
    void refetchDiagnostics();
  };

  /* ── Shared promotion logic ── */
  const promoteReadyPosts = async () => {
    setPromoting(true);
    setShowLog(true);
    addLogEntry('Promoção', 'Verificando artigos curados com status "ready"...', 'running');
    try {
      const result = await autoPromote.mutateAsync();
      if (result && result.promoted > 0) {
        const extras = [
          result.duplicates ? `${result.duplicates} duplicado(s) encerrado(s)` : null,
          result.alreadyPublished ? `${result.alreadyPublished} já promovido(s)` : null,
        ].filter(Boolean).join(' · ');
        addLogEntry(
          'Promoção',
          `${result.promoted} artigo(s) movido(s) para rascunhos editoriais.${extras ? ` ${extras}.` : ' Email enviado ao admin.'}`,
          'success',
        );
        toast({
          title: `${result.promoted} artigo(s) em rascunhos`,
          description: 'Verifique Conteúdo → Posts → Rascunhos para rever e publicar.',
        });
      } else if (result && ((result.duplicates ?? 0) > 0 || (result.alreadyPublished ?? 0) > 0)) {
        addLogEntry(
          'Promoção',
          `${result.duplicates ?? 0} duplicado(s) encerrado(s) · ${result.alreadyPublished ?? 0} já promovido(s). Nenhum novo rascunho criado.`,
          'info',
        );
      } else {
        addLogEntry('Promoção', 'Nenhum artigo curado com status "ready". Os cron do n8n geram novos artigos periodicamente.', 'info');
      }
    } catch (err) {
      addLogEntry('Promoção', `Erro: ${err instanceof Error ? err.message : 'Falha'}`, 'error');
    } finally {
      setPromoting(false);
      void refetchDiagnostics();
    }
  };

  /* ── Promote curated posts (works anytime, independent of pipeline) ── */
  const handlePromoteOnly = async () => {
    if (promoting) return;
    await promoteReadyPosts();
  };

  /* ── Tag management ── */
  const openConfig = () => {
    setEditConfigLabel(activeConfig?.label ?? 'Padrão');
    setEditLanguage(activeConfig?.language ?? 'pt-PT');
    setEditRegion(activeConfig?.region ?? 'PT');
    setEditDefaultPostTags(activeConfig?.defaultPostTags ?? DEFAULT_PIPELINE_POST_TAGS);
    setNewDefaultPostTag('');
    setEditThemeRules(activeConfig?.themeRules?.length ? activeConfig.themeRules : DEFAULT_PIPELINE_THEME_RULES);
    setShowConfig(true);
  };

  const addDefaultPostTag = () => {
    const tag = newDefaultPostTag.trim().toLowerCase();
    if (!tag || editDefaultPostTags.includes(tag)) return;
    setEditDefaultPostTags([...editDefaultPostTags, tag]);
    setNewDefaultPostTag('');
  };

  const removeDefaultPostTag = (tag: string) => {
    setEditDefaultPostTags(editDefaultPostTags.filter((item) => item !== tag));
  };

  const addThemeRule = () => {
    setEditThemeRules((prev) => ([
      ...prev,
      {
        id: `theme_${Date.now().toString(36)}`,
        slug: '',
        label: '',
        searchTerms: [],
        postTags: [],
      },
    ]));
  };

  const updateThemeRule = (ruleId: string, patch: Partial<PipelineThemeRule>) => {
    setEditThemeRules((prev) => prev.map((rule) => (
      rule.id === ruleId
        ? { ...rule, ...patch }
        : rule
    )));
  };

  const removeThemeRule = (ruleId: string) => {
    setEditThemeRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  };

  const saveEditorialConfig = async () => {
    const cleanedRules = editThemeRules
      .map((rule) => ({
        ...rule,
        label: rule.label.trim(),
        slug: rule.slug.trim(),
        searchTerms: sanitizeStringList(rule.searchTerms),
        postTags: sanitizeStringList(rule.postTags),
      }))
      .filter((rule) => rule.label || rule.slug || rule.searchTerms.length > 0);

    if (cleanedRules.length === 0) {
      toast({ title: 'Adicione pelo menos um tema editorial', variant: 'destructive' });
      return;
    }

    await saveConfig({
      id: activeConfig?.id,
      label: editConfigLabel,
      language: editLanguage,
      region: editRegion,
      themeRules: cleanedRules,
      defaultPostTags: editDefaultPostTags,
    });

    const totalSearchTerms = cleanedRules.reduce((sum, rule) => sum + rule.searchTerms.length, 0);
    addLogEntry(
      'Config',
      `Configuração editorial guardada: ${cleanedRules.length} tema(s), ${totalSearchTerms} termo(s) de pesquisa, tags finais [${editDefaultPostTags.join(', ')}]`,
      'success',
    );
    setShowConfig(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm">
      {/* Decorative gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="relative border-b border-white/5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl">
        <div className="px-5 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title & Status */}
            <div className="flex items-start gap-4 min-w-0">
              <div className={`p-3.5 rounded-2xl shrink-0 bg-gradient-to-br transition-all duration-300 ${
                pipelineRunning || hasRunningExecution 
                  ? 'from-cyan-500/30 via-cyan-400/20 to-cyan-500/30 shadow-lg shadow-cyan-500/30 animate-pulse' 
                  : 'from-cyan-500/20 via-cyan-400/10 to-violet-500/20 shadow-xl shadow-cyan-500/10'
              }`}>
                <Zap className={`w-6 h-6 ${pipelineRunning || hasRunningExecution ? 'text-cyan-300' : 'text-cyan-400'}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white via-cyan-50 to-violet-200 bg-clip-text text-transparent">
                    {activeConfig?.label ? `${activeConfig.label} — Pipeline IA` : 'Pipeline de Notícias IA'}
                  </h2>
                  {(pipelineRunning || hasRunningExecution) && (
                    <Badge className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-400/40 text-xs px-2.5 py-0.5 animate-pulse shadow-lg shadow-cyan-500/30">
                      <Radio className="w-3 h-3 mr-1.5" />
                      AO VIVO
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Workflow className="w-3.5 h-3.5" />
                    {pipelineWorkflows.length} workflow{pipelineWorkflows.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span>Coleta → Cluster → Reescrita</span>
                  {someActive && !allActive && <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] px-1.5 py-0">Parcial</Badge>}
                  {allActive && <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] px-1.5 py-0">Todos ativos</Badge>}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/5" onClick={openConfig}>
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configurar temas editoriais</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/5" onClick={() => { void fetchWorkflows(); void fetchRecentExecutions(); }}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 w-8 p-0 ${showSettings ? 'text-amber-400' : 'text-gray-400'} hover:text-white hover:bg-white/5`}
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Shield className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configurações & Chaves API</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 w-8 p-0 ${showLog ? 'text-cyan-400' : 'text-gray-400'} hover:text-white hover:bg-white/5`}
                    onClick={() => setShowLog(!showLog)}
                  >
                    <Activity className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Log da sessão</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
                <span className="text-xs text-gray-400 hidden sm:inline">Auto</span>
                <Switch
                  checked={allActive}
                  disabled={!pipelineFound}
                  onCheckedChange={() => void handleToggleAll()}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative px-5 py-6 space-y-6">
        {editorialSchemaLegacy && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-200">
            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Modo compatibilidade do schema ativo
            </div>
            <p className="mt-1 text-[11px] text-amber-200/90">
              O Supabase live ainda não tem as colunas `theme_rules` e `default_post_tags`. A dashboard continua funcional,
              mas até aplicar a migration só as tags de pesquisa e o locale ficam persistidos.
            </p>
          </div>
        )}

        {/* ── Editorial Theme Summary ── */}
        {activeConfig && !showConfig && (
          <div className="rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-cyan-500/10">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-gray-300">Temas editoriais configurados</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {activeConfig.themeRules.map((theme) => (
                <Badge key={theme.id} variant="outline" className="text-sm px-3 py-1 border-cyan-500/40 text-cyan-300 bg-cyan-500/5">
                  {theme.label}
                </Badge>
              ))}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" onClick={openConfig}>
                Editar temas
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
              <Badge variant="outline" className="text-xs px-2.5 py-1 border-slate-600 text-slate-300 bg-slate-800/50">
                <span className="text-gray-400 mr-1.5">Idioma:</span>{activeConfig.language}
              </Badge>
              <Badge variant="outline" className="text-xs px-2.5 py-1 border-slate-600 text-slate-300 bg-slate-800/50">
                <span className="text-gray-400 mr-1.5">Região:</span>{activeConfig.region}
              </Badge>
              {activeConfig.defaultPostTags.map((tag) => (
                <Badge key={`post-${tag}`} variant="outline" className="text-xs px-2.5 py-1 border-emerald-500/40 text-emerald-300 bg-emerald-500/5">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ── Editorial Config Panel ── */}
        {showConfig && (
          <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Settings2 className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm font-semibold text-white">Configuração Editorial</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-white/5" onClick={() => setShowConfig(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <span className="text-xs font-medium text-gray-300 block mb-1.5">Nome editorial</span>
                <Input
                  value={editConfigLabel}
                  onChange={(e) => setEditConfigLabel(e.target.value)}
                  className="h-9 text-sm bg-slate-900/80 border-slate-700/50 focus:border-cyan-500/50"
                  placeholder="Ex: Tecnologia Portugal"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-300 block mb-1.5">Idioma</span>
                <Input
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="h-9 text-sm bg-slate-900/80 border-slate-700/50 focus:border-cyan-500/50"
                  placeholder="pt-PT"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-300 block mb-1.5">Região</span>
                <Input
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="mt-1 h-8 text-xs bg-slate-900 border-slate-700"
                  placeholder="PT"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Tags finais dos posts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editDefaultPostTags.map((tag) => (
                  <Badge
                    key={`default-${tag}`}
                    variant="outline"
                    className="text-xs px-2 py-0.5 border-emerald-500/30 text-emerald-400 gap-1 cursor-pointer hover:border-red-500/30 hover:text-red-400"
                    onClick={() => removeDefaultPostTag(tag)}
                  >
                    {tag} <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Ex: portal, tecnologia, portugal"
                  className="h-7 text-xs bg-slate-900 border-slate-700"
                  value={newDefaultPostTag}
                  onChange={(e) => setNewDefaultPostTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                      e.preventDefault();
                      addDefaultPostTag();
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Temas editoriais</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300" onClick={addThemeRule}>
                  Novo tema
                </Button>
              </div>
              <div className="space-y-2">
                {editThemeRules.map((theme, index) => (
                  <div key={theme.id} className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-400">Tema {index + 1}</span>
                      <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] text-red-400 hover:text-red-300" onClick={() => removeThemeRule(theme.id)}>
                        Remover
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-[10px] text-gray-500">Nome visível</span>
                        <Input
                          value={theme.label}
                          onChange={(e) => updateThemeRule(theme.id, { label: e.target.value })}
                          className="mt-1 h-7 text-xs bg-slate-950 border-slate-700"
                          placeholder="Ex: Inteligência Artificial"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500">Slug do tema</span>
                        <Input
                          value={theme.slug}
                          onChange={(e) => updateThemeRule(theme.id, { slug: e.target.value })}
                          className="mt-1 h-7 text-xs bg-slate-950 border-slate-700"
                          placeholder="Ex: ia"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500">Termos de pesquisa</span>
                      <Input
                        value={theme.searchTerms.join(', ')}
                        onChange={(e) => updateThemeRule(theme.id, { searchTerms: parseListInput(e.target.value) })}
                        className="mt-1 h-7 text-xs bg-slate-950 border-slate-700"
                        placeholder="Ex: inteligência artificial, openai, agentes IA"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500">Tags finais desse tema</span>
                      <Input
                        value={theme.postTags.join(', ')}
                        onChange={(e) => updateThemeRule(theme.id, { postTags: parseListInput(e.target.value) })}
                        className="mt-1 h-7 text-xs bg-slate-950 border-slate-700"
                        placeholder="Ex: ia, inteligência artificial, agentes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-gray-500">
              Cada tema controla os termos usados na coleta e as tags finais aplicadas aos posts promovidos para o portal.
            </p>

            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowConfig(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-6 text-xs bg-cyan-600 hover:bg-cyan-700" disabled={isSaving} onClick={() => void saveEditorialConfig()}>
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        )}

        {/* ── Pipeline Settings Panel ── */}
        {showSettings && (
          <PipelineSettingsPanel diagnostics={diagnostics} onClose={() => setShowSettings(false)} />
        )}

        {/* ── Pipeline DB Diagnostics ── */}
        {diagnosticsError instanceof Error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-300">
            Falha ao consultar o estado real do pipeline no banco: {diagnosticsError.message}
          </div>
        )}

        {diagnostics && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-medium text-gray-300">Estado do Pipeline (DB)</span>
              </div>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-gray-500 hover:text-white" onClick={() => void refetchDiagnostics()}>
                <RefreshCw className="w-2.5 h-2.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              <span className="text-gray-400">
                Staging: <span className={diagnostics.staging.total > 0 ? 'text-cyan-400 font-medium' : 'text-gray-500'}>{diagnostics.staging.total}</span>
                {diagnostics.staging.unprocessed > 0 && (
                  <span className="text-amber-400 ml-1">({diagnostics.staging.unprocessed} não processados)</span>
                )}
              </span>
              <span className="text-gray-400">
                Clusters: <span className={diagnostics.clusters.total > 0 ? 'text-cyan-400 font-medium' : 'text-gray-500'}>{diagnostics.clusters.total}</span>
                {diagnostics.clusters.highConfidence > 0 && (
                  <span className="text-emerald-400 ml-1">({diagnostics.clusters.highConfidence} ≥60%)</span>
                )}
              </span>
              <span className="text-gray-400">
                Curados: <span className={diagnostics.curated.total > 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>{diagnostics.curated.total}</span>
                {diagnostics.curated.ready > 0 && <span className="text-emerald-400 ml-1">({diagnostics.curated.ready} prontos)</span>}
                {diagnostics.curated.draft > 0 && <span className="text-amber-400 ml-1">({diagnostics.curated.draft} rascunho)</span>}
              </span>
              {diagnostics.configLabel && (
                <span className="text-gray-400">
                  Editorial: <span className="text-slate-200">{diagnostics.configLabel}</span>
                  {diagnostics.themeRuleCount > 0 && <span className="text-cyan-400 ml-1">({diagnostics.themeRuleCount} tema(s))</span>}
                </span>
              )}
              {diagnostics.configLanguage && diagnostics.configRegion && (
                <span className="text-gray-400">
                  Locale: <span className="text-slate-200">{diagnostics.configLanguage} / {diagnostics.configRegion}</span>
                </span>
              )}
            </div>
            {diagnostics.defaultPostTags.length > 0 && (
              <div className="flex flex-wrap gap-1 text-[10px] text-gray-400">
                <span>Tags finais:</span>
                {diagnostics.defaultPostTags.map((tag) => (
                  <Badge key={`diag-${tag}`} variant="outline" className="px-1 py-0 text-[9px] border-emerald-500/30 text-emerald-400">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            {/* Tag sync warning */}
            {diagnostics.configTags.length > 0 && activeConfig && (
              (() => {
                const dbTags = [...diagnostics.configTags].sort().join(',');
                const dashTags = [...activeConfig.tags].sort().join(',');
                const synced = dbTags === dashTags;
                return synced ? (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Tags sincronizadas: {diagnostics.configTags.join(', ')}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Tags no DB diferem da dashboard! DB: [{diagnostics.configTags.join(', ')}] · Dashboard: [{activeConfig.tags.join(', ')}]
                  </div>
                );
              })()
            )}
            {diagnostics.configTags.length === 0 && (
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <AlertTriangle className="w-2.5 h-2.5" />
                Nenhuma config ativa no DB — n8n usará tags padrão (IA, cibersegurança, automação)
              </div>
            )}
            {/* Bottleneck detection */}
            {diagnostics.staging.total > 0 && diagnostics.clusters.total === 0 && (
              <div className="text-[10px] text-amber-400">
                ⚠ {diagnostics.staging.total} artigos em staging mas 0 clusters — WF-02 ainda não processou ou falhou
              </div>
            )}
            {diagnostics.clusters.highConfidence > 0 && diagnostics.curated.total === 0 && (
              <div className="text-[10px] text-red-400">
                ⚠ {diagnostics.clusters.highConfidence} cluster(s) com confiança ≥60% mas 0 curados — WF-03 (IA) pode ter falha na API Groq ou ainda não executou
              </div>
            )}
            {diagnostics.staging.total === 0 && diagnostics.clusters.total === 0 && diagnostics.curated.total === 0 && (
              <div className="text-[10px] text-gray-500">
                Pipeline vazio — execute os workflows ou aguarde os crons automáticos
              </div>
            )}
          </div>
        )}

        {/* ── Pipeline Steps Visual ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Fluxo de Execução</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {PIPELINE_STEPS.map((step, idx) => {
              const wf = matchWorkflow(workflows, step.nameMatch);
              if (!wf) return null;

              const isActive = wf.active === true;
              const isRunning = currentStep === step.key;
              const isCompleted = completedSteps.has(step.key);
              const isFailed = failedSteps.has(step.key);
              const StepIcon = step.icon;
              const wfExec = recentExecutions.find((e) => String(e.workflowId) === String(wf.id));

              return (
                <div key={step.key} className="relative group">
                  {/* Connecting arrow for lg+ screens */}
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-[18px] -translate-y-1/2 z-10">
                      <ChevronRight className="w-5 h-5 text-cyan-400/50" />
                    </div>
                  )}

                  {/* Step Card */}
                  <div className={`relative overflow-hidden rounded-xl p-5 transition-all duration-300 ${
                    isRunning
                      ? 'bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-blue-500/20 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/30'
                      : isFailed
                      ? 'bg-gradient-to-br from-red-500/10 via-red-400/5 to-red-500/10 ring-1 ring-red-500/30'
                      : isCompleted
                      ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-emerald-500/10 ring-1 ring-emerald-500/30'
                      : isActive
                      ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 ring-1 ring-white/10 hover:ring-cyan-400/30'
                      : 'bg-gradient-to-br from-slate-900/50 to-slate-950/50 ring-1 ring-white/5 opacity-60'
                  }`}>
                    {/* Decorative gradient */}
                    {isRunning && (
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-blue-500/10 animate-pulse pointer-events-none" />
                    )}

                    <div className="relative space-y-4">
                      {/* Icon & Title */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            isRunning
                              ? 'bg-cyan-500/20 ring-2 ring-cyan-400/50'
                              : isFailed
                              ? 'bg-red-500/20 ring-1 ring-red-500/30'
                              : isCompleted
                              ? 'bg-emerald-500/20 ring-1 ring-emerald-500/30'
                              : isActive
                              ? 'bg-gradient-to-br from-cyan-500/10 to-violet-500/10'
                              : 'bg-slate-800/50'
                          }`}>
                            {isRunning ? (
                              <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />
                            ) : isFailed ? (
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <StepIcon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-600'}`} />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white">{step.label}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50 animate-pulse" title="Workflow ativo" />
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs px-2.5 py-0.5 ${
                          isRunning
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                            : isFailed
                            ? 'bg-red-500/20 text-red-300 border-red-400/40'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                            : isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                          {isRunning ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Executando...</>
                          ) : isFailed ? (
                            'Erro'
                          ) : isCompleted ? (
                            '✓ Concluído'
                          ) : isActive ? (
                            'Ativo'
                          ) : (
                            'Inativo'
                          )}
                        </Badge>
                        {wfExec && (
                          <Badge variant="outline" className={`text-xs px-2 py-0.5 ${
                            wfExec.status === 'success' ? 'border-emerald-500/30 text-emerald-400' :
                            wfExec.status === 'error' ? 'border-red-500/30 text-red-400' :
                            wfExec.status === 'running' ? 'border-cyan-500/30 text-cyan-400' : 'border-slate-600 text-slate-400'
                          }`}>
                            {formatRelativeTime(wfExec.startedAt)}
                          </Badge>
                        )}
                      </div>

                      {/* Workflow Meta */}
                      <div className="pt-3 border-t border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Workflow ID</span>
                          <span className="font-mono text-gray-400">{wf.id}</span>
                        </div>
                        {wfExec && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Última exec.</span>
                            <span className={`font-medium ${
                              wfExec.status === 'success' ? 'text-emerald-400' :
                              wfExec.status === 'error' ? 'text-red-400' :
                              wfExec.status === 'running' ? 'text-cyan-400' : 'text-gray-400'
                            }`}>
                              {wfExec.status === 'running' ? 'A correr' : wfExec.status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Activity Log ── */}
        {showLog && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/60">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-white">Log da Sessão</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-cyan-500/30 text-cyan-300">
                  Sessão
                </Badge>
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
                  <p className="text-xs text-gray-600 text-center py-4">Nenhuma atividade nesta sessão. O estado real continua disponível via n8n e banco.</p>
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
            {recentExecutions.slice(0, 5).map((exec) => {
              const wfName = workflows.find((w) => String(w.id) === String(exec.workflowId))?.name;
              const statusLabel = exec.status === 'success' ? 'OK' : exec.status === 'error' ? 'Erro' : exec.status === 'running' ? 'A correr' : exec.status;
              return (
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
                  {wfName ?? `WF-${exec.workflowId}`} · {statusLabel} · {formatRelativeTime(exec.startedAt)}
                </Badge>
              );
            })}
          </div>
        )}

        {/* ── Actions & Stats ── */}
        <div className="space-y-4">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {pipelineFound && (
                <Button
                  size="lg"
                  className={`h-11 px-6 text-sm font-medium gap-2 shadow-lg transition-all duration-300 ${
                    pipelineRunning 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/30' 
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-cyan-500/30'
                  }`}
                  disabled={pipelineRunning}
                  onClick={() => void handleRunPipeline()}
                >
                  {pipelineRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pipeline a correr...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Executar Pipeline
                    </>
                  )}
                </Button>
              )}

              {(stats?.ready ?? 0) > 0 && (
                <Button
                  size="lg"
                  className={`h-11 px-6 text-sm font-medium gap-2 shadow-lg transition-all duration-300 ${
                    pipelineFound
                      ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 text-emerald-300 border-2 border-emerald-500/50 hover:border-emerald-400/60'
                      : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/30'
                  }`}
                  disabled={promoting}
                  onClick={() => void handlePromoteOnly()}
                >
                  {promoting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A promover...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      Promover ({stats?.ready})
                    </>
                  )}
                </Button>
              )}

              {pipelineRunning && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-11 px-6 text-sm font-medium text-red-400 border-red-500/40 hover:bg-red-500/10 hover:text-red-300 gap-2" 
                  onClick={() => { abortRef.current = true; }}
                >
                  <Square className="w-4 h-4" />
                  Parar
                </Button>
              )}
            </div>

            {/* Stats */}
            {stats && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{stats.total} curados</span>
                </div>
                {stats.ready > 0 && (
                  <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border-emerald-500/40 px-3 py-1.5 text-sm animate-pulse shadow-lg shadow-emerald-500/20">
                    {stats.ready} prontos
                  </Badge>
                )}
                {stats.draft > 0 && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 px-3 py-1.5 text-sm">
                    {stats.draft} rascunhos
                  </Badge>
                )}
                {stats.published > 0 && (
                  <Badge variant="outline" className="border-blue-500/40 text-blue-300 px-3 py-1.5 text-sm">
                    {stats.published} promovidos
                  </Badge>
                )}
                {stats.avgScore > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <span className="text-xs text-gray-400">Score</span>
                    <span className="text-sm font-semibold text-cyan-400">{stats.avgScore}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Cron schedule info + auto-promote toggle ── */}
        {pipelineFound && allActive && (
          <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-emerald-500/10 p-5 space-y-3 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 shrink-0">
                <Clock className="w-4 h-4 text-emerald-300" />
              </div>
              <p className="text-sm text-emerald-200">
                <span className="font-semibold">Pipeline automático ativo</span>
                <span className="hidden sm:inline text-emerald-300/80"> — o n8n gera curadoria mesmo sem login no portal; a promoção final passa pela Edge Function do portal.</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-emerald-500/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${polling.isActive ? 'bg-emerald-500/20' : 'bg-slate-800/50'}`}>
                  <Zap className={`w-4 h-4 ${polling.isActive ? 'text-emerald-300' : 'text-gray-500'}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium flex items-center gap-2 flex-wrap">
                    Auto-promoção local
                    {polling.isActive && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-xs px-2 py-0.5 animate-pulse shadow-lg shadow-emerald-500/20">
                        ATIVO
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-emerald-200/70 mt-0.5">
                    {polling.isActive
                      ? `A cada 2 min nesta sessão · ${polling.totalPromoted} promovido(s)${polling.lastCheck ? ` · ${formatRelativeTime(polling.lastCheck)}` : ''}`
                      : 'Fallback local: curated → rascunhos via backend central; exige dashboard aberta e utilizador autenticado'}
                  </p>
                </div>
              </div>
              <Switch
                checked={polling.isActive}
                onCheckedChange={(checked) => checked ? polling.start() : polling.stop()}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-600 shrink-0"
              />
            </div>
          </div>
        )}

        {/* ── No workflows warning ── */}
        {!loading && !pipelineFound && (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 p-5 text-center shadow-lg shadow-amber-500/10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <p className="text-sm font-medium text-amber-300">Workflows não encontrados</p>
            </div>
            <p className="text-xs text-amber-200/80">
              n8n offline ou nenhum workflow do pipeline encontrado. Use "Promover Curados para Rascunhos" para mover artigos curados existentes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
