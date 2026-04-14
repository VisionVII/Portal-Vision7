import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  scheduleIntervalMs: number;
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
    scheduleIntervalMs: 30 * 60_000, // 30min
  },
  {
    key: 'wf02',
    label: 'Cluster & Dedup',
    shortLabel: 'Cluster',
    description: 'Agrupamento e deduplicação',
    icon: Layers,
    nameMatch: 'WF-02',
    delayAfterMs: 30_000,
    scheduleIntervalMs: 20 * 60_000, // 20min
  },
  {
    key: 'wf03',
    label: 'IA Reescrita',
    shortLabel: 'IA',
    description: 'Geração de artigos por IA',
    icon: Sparkles,
    nameMatch: 'WF-03',
    delayAfterMs: 0,
    scheduleIntervalMs: 60 * 60_000, // 60min
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
  const matches = workflows.filter((w) => w.name?.includes(nameMatch));
  if (matches.length <= 1) return matches[0];

  // Prefer active workflows, then the most recently updated one.
  return [...matches].sort((a, b) => {
    const activeDelta = Number(b.active === true) - Number(a.active === true);
    if (activeDelta !== 0) return activeDelta;

    const tsA = Date.parse(String(a.updatedAt ?? a.createdAt ?? 0));
    const tsB = Date.parse(String(b.updatedAt ?? b.createdAt ?? 0));
    const safeA = Number.isFinite(tsA) ? tsA : 0;
    const safeB = Number.isFinite(tsB) ? tsB : 0;
    return safeB - safeA;
  })[0];
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

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getCountdownMs(lastExecIso: string | undefined, intervalMs: number): number {
  if (!lastExecIso || !intervalMs) return -1;
  const nextRun = new Date(lastExecIso).getTime() + intervalMs;
  return nextRun - Date.now();
}

/** Tick every second to drive countdown badges */
function useCountdownTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function parseListInput(value: string): string[] {
  return sanitizeStringList(value.split(/[\n,;]+/));
}

function getExecutionTimestamp(exec: N8nExecution): number {
  const raw = exec.startedAt ?? exec.stoppedAt;
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  if (Number.isFinite(parsed)) return parsed;

  const numericId = Number(exec.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

const LOG_TYPE_STYLES: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-primary',
  error: 'text-red-400',
  warn: 'text-amber-400',
  running: 'text-blue-500',
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
  useCountdownTick();
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
      const isInfra = /503|502|unreachable|timeout/i.test(msg);
      
      if (attempt < 3) {
        // Cold start — retry with exponential backoff (40s, 60s)
        const delaySec = attempt === 1 ? 40 : 60;
        if (attempt === 1) {
          addLogEntry('Sistema', `n8n a arrancar (cold start ${isInfra ? '502/503' : 'timeout'}) — aguarde ${delaySec}s...`, 'warn');
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
      const execs = await getExecutions(50);
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

  const latestExecutionByWorkflowId = useMemo(() => {
    const map = new Map<string, N8nExecution>();

    for (const exec of recentExecutions) {
      const workflowId = exec.workflowId;
      if (workflowId === undefined || workflowId === null) continue;

      const key = String(workflowId);
      const existing = map.get(key);
      if (!existing || getExecutionTimestamp(exec) > getExecutionTimestamp(existing)) {
        map.set(key, exec);
      }
    }

    return map;
  }, [recentExecutions]);

  const latestUniqueExecutions = useMemo(() => {
    return [...latestExecutionByWorkflowId.values()]
      .sort((a, b) => getExecutionTimestamp(b) - getExecutionTimestamp(a));
  }, [latestExecutionByWorkflowId]);

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
    <div className="relative overflow-hidden rounded-2xl bg-card backdrop-blur-sm">
      {/* Decorative gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-500/5 pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="relative border-b border-border/30 bg-muted/30 backdrop-blur-xl">
        <div className="px-5 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title & Status */}
            <div className="flex items-start gap-4 min-w-0">
              <div className={`p-3.5 rounded-2xl shrink-0 bg-gradient-to-br transition-all duration-300 ${
                pipelineRunning || hasRunningExecution 
                  ? 'from-blue-500/20 via-blue-400/10 to-blue-500/20 animate-pulse' 
                  : 'from-blue-500/15 via-blue-400/10 to-primary-500/15'
              }`}>
                <Zap className={`w-6 h-6 ${pipelineRunning || hasRunningExecution ? 'text-blue-400' : 'text-blue-500'}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white via-foreground to-foreground/80 bg-clip-text text-transparent">
                    {activeConfig?.label ? `${activeConfig.label} — Pipeline IA` : 'Pipeline de Notícias IA'}
                  </h2>
                  {(pipelineRunning || hasRunningExecution) && (
                    <Badge className="bg-gradient-to-r from-blue-500/15 to-primary-500/15 text-blue-500 border-blue-500/30 text-xs px-2.5 py-0.5 animate-pulse">
                      <Radio className="w-3 h-3 mr-1.5" />
                      AO VIVO
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Workflow className="w-3.5 h-3.5" />
                    {pipelineWorkflows.length} workflow{pipelineWorkflows.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-muted-foreground/60">•</span>
                  <span>Coleta → Cluster → Reescrita</span>
                  {someActive && !allActive && <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] px-1.5 py-0">Parcial</Badge>}
                  {allActive && <Badge variant="outline" className="border-primary/30 text-primary text-[10px] px-1.5 py-0">Todos ativos</Badge>}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30" onClick={openConfig}>
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configurar temas editoriais</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30" onClick={() => { void fetchWorkflows(); void fetchRecentExecutions(); }}>
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
                    className={`h-8 w-8 p-0 ${showSettings ? 'text-amber-400' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted/30`}
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
                    className={`h-8 w-8 p-0 ${showLog ? 'text-blue-500' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted/30`}
                    onClick={() => setShowLog(!showLog)}
                  >
                    <Activity className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Log da sessão</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border/40">
                <span className="text-xs text-muted-foreground hidden sm:inline">Auto</span>
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
          <div className="rounded-xl bg-muted/20 border border-border/30 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-blue-500/5">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-foreground/80">Temas editoriais configurados</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {activeConfig.themeRules.map((theme) => (
                <Badge key={theme.id} variant="outline" className="text-sm px-3 py-1 border-blue-500/30 text-blue-400 bg-blue-500/5">
                  {theme.label}
                </Badge>
              ))}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/5" onClick={openConfig}>
                Editar temas
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/30">
              <Badge variant="outline" className="text-xs px-2.5 py-1 border-border text-foreground/80 bg-muted/30">
                <span className="text-muted-foreground mr-1.5">Idioma:</span>{activeConfig.language}
              </Badge>
              <Badge variant="outline" className="text-xs px-2.5 py-1 border-border text-foreground/80 bg-muted/30">
                <span className="text-muted-foreground mr-1.5">Região:</span>{activeConfig.region}
              </Badge>
              {activeConfig.defaultPostTags.map((tag) => (
                <Badge key={`post-${tag}`} variant="outline" className="text-xs px-2.5 py-1 border-primary/30 text-primary/80 bg-primary/5">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ── Editorial Config Panel ── */}
        {showConfig && (
          <div className="rounded-xl border border-border/40 bg-muted/30 backdrop-blur-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/5">
                  <Settings2 className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-semibold text-foreground">Configuração Editorial</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/30" onClick={() => setShowConfig(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <span className="text-xs font-medium text-foreground/80 block mb-1.5">Nome editorial</span>
                <Input
                  value={editConfigLabel}
                  onChange={(e) => setEditConfigLabel(e.target.value)}
                  className="h-9 text-sm bg-muted/40 border-border/40 focus:border-primary/50"
                  placeholder="Ex: Tecnologia Portugal"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-foreground/80 block mb-1.5">Idioma</span>
                <Input
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="h-9 text-sm bg-muted/40 border-border/40 focus:border-primary/50"
                  placeholder="pt-PT"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-foreground/80 block mb-1.5">Região</span>
                <Input
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="mt-1 h-8 text-xs bg-muted border-border"
                  placeholder="PT"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tags finais dos posts</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editDefaultPostTags.map((tag) => (
                  <Badge
                    key={`default-${tag}`}
                    variant="outline"
                    className="text-xs px-2 py-0.5 border-primary/25 text-primary gap-1 cursor-pointer hover:border-red-500/30 hover:text-red-400"
                    onClick={() => removeDefaultPostTag(tag)}
                  >
                    {tag} <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder="Ex: portal, tecnologia, portugal"
                  className="h-7 text-xs bg-muted border-border"
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
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Temas editoriais</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-400" onClick={addThemeRule}>
                  Novo tema
                </Button>
              </div>
              <div className="space-y-2">
                {editThemeRules.map((theme, index) => (
                  <div key={theme.id} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">Tema {index + 1}</span>
                      <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] text-red-400 hover:text-red-300" onClick={() => removeThemeRule(theme.id)}>
                        Remover
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Nome visível</span>
                        <Input
                          value={theme.label}
                          onChange={(e) => updateThemeRule(theme.id, { label: e.target.value })}
                          className="mt-1 h-7 text-xs bg-muted border-border"
                          placeholder="Ex: Inteligência Artificial"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Slug do tema</span>
                        <Input
                          value={theme.slug}
                          onChange={(e) => updateThemeRule(theme.id, { slug: e.target.value })}
                          className="mt-1 h-7 text-xs bg-muted border-border"
                          placeholder="Ex: ia"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Termos de pesquisa</span>
                      <Input
                        value={theme.searchTerms.join(', ')}
                        onChange={(e) => updateThemeRule(theme.id, { searchTerms: parseListInput(e.target.value) })}
                        className="mt-1 h-7 text-xs bg-muted border-border"
                        placeholder="Ex: inteligência artificial, openai, agentes IA"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Tags finais desse tema</span>
                      <Input
                        value={theme.postTags.join(', ')}
                        onChange={(e) => updateThemeRule(theme.id, { postTags: parseListInput(e.target.value) })}
                        className="mt-1 h-7 text-xs bg-muted border-border"
                        placeholder="Ex: ia, inteligência artificial, agentes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
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
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] font-medium text-foreground/80">Estado do Pipeline (DB)</span>
              </div>
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground" onClick={() => void refetchDiagnostics()}>
                <RefreshCw className="w-2.5 h-2.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              <span className="text-muted-foreground">
                Staging: <span className={diagnostics.staging.total > 0 ? 'text-blue-500 font-medium' : 'text-muted-foreground'}>{diagnostics.staging.total}</span>
                {diagnostics.staging.unprocessed > 0 && (
                  <span className="text-amber-400 ml-1">({diagnostics.staging.unprocessed} não processados)</span>
                )}
              </span>
              <span className="text-muted-foreground">
                Clusters: <span className={diagnostics.clusters.total > 0 ? 'text-blue-500 font-medium' : 'text-muted-foreground'}>{diagnostics.clusters.total}</span>
                {diagnostics.clusters.highConfidence > 0 && (
                  <span className="text-primary ml-1">({diagnostics.clusters.highConfidence} ≥60%)</span>
                )}
              </span>
              <span className="text-muted-foreground">
                Curados: <span className={diagnostics.curated.total > 0 ? 'text-primary font-medium' : 'text-red-400 font-medium'}>{diagnostics.curated.total}</span>
                {diagnostics.curated.ready > 0 && <span className="text-primary ml-1">({diagnostics.curated.ready} prontos)</span>}
                {diagnostics.curated.draft > 0 && <span className="text-amber-400 ml-1">({diagnostics.curated.draft} rascunho)</span>}
              </span>
              {diagnostics.configLabel && (
                <span className="text-muted-foreground">
                  Editorial: <span className="text-foreground/80">{diagnostics.configLabel}</span>
                  {diagnostics.themeRuleCount > 0 && <span className="text-blue-500 ml-1">({diagnostics.themeRuleCount} tema(s))</span>}
                </span>
              )}
              {diagnostics.configLanguage && diagnostics.configRegion && (
                <span className="text-muted-foreground">
                  Locale: <span className="text-foreground/80">{diagnostics.configLanguage} / {diagnostics.configRegion}</span>
                </span>
              )}
            </div>
            {diagnostics.defaultPostTags.length > 0 && (
              <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                <span>Tags finais:</span>
                {diagnostics.defaultPostTags.map((tag) => (
                  <Badge key={`diag-${tag}`} variant="outline" className="px-1 py-0 text-[9px] border-primary/25 text-primary">
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
                  <div className="flex items-center gap-1 text-[10px] text-primary">
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
                ⚠ {diagnostics.clusters.highConfidence} cluster(s) com confiança ≥60% mas 0 curados — WF-03 (IA) pode ter falha na API (HuggingFace/Groq) ou ainda não executou
              </div>
            )}
            {diagnostics.staging.total === 0 && diagnostics.clusters.total === 0 && diagnostics.curated.total === 0 && (
              <div className="text-[10px] text-muted-foreground">
                Pipeline vazio — execute os workflows ou aguarde os crons automáticos
              </div>
            )}
          </div>
        )}

        {/* ── Pipeline Steps Visual ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fluxo de Execução</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {PIPELINE_STEPS.map((step, idx) => {
              const wf = matchWorkflow(workflows, step.nameMatch);
              if (!wf) return null;

              const isActive = wf.active === true;
              const isRunning = currentStep === step.key;
              const StepIcon = step.icon;
              const wfExec = latestExecutionByWorkflowId.get(String(wf.id));
              const hasExecutionSuccess = wfExec?.status === 'success';
              const hasExecutionError = wfExec?.status === 'error';
              const isFailed = failedSteps.has(step.key) || (!isRunning && hasExecutionError);
              const isCompleted = hasExecutionSuccess || (completedSteps.has(step.key) && !hasExecutionError);

              return (
                <div key={step.key} className="relative group">
                  {/* Connecting arrow for lg+ screens */}
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-[18px] -translate-y-1/2 z-10">
                      <ChevronRight className="w-5 h-5 text-blue-500/50" />
                    </div>
                  )}

                  {/* Step Card */}
                  <div className={`relative overflow-hidden rounded-xl p-5 transition-all duration-300 ${
                    isRunning
                      ? 'bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-blue-500/20 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/30'
                      : isFailed
                      ? 'bg-gradient-to-br from-red-500/10 via-red-400/5 to-red-500/10 ring-1 ring-red-500/30'
                      : isCompleted
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : isActive
                      ? 'bg-muted/40 ring-1 ring-border/40 hover:ring-primary/30'
                      : 'bg-muted/20 ring-1 ring-border/20 opacity-60'
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
                              ? 'bg-primary/15 ring-1 ring-primary/30'
                              : isActive
                              ? 'bg-gradient-to-br from-cyan-500/10 to-primary-500/10'
                              : 'bg-muted/30'
                          }`}>
                            {isRunning ? (
                              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                            ) : isFailed ? (
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            ) : (
                              <StepIcon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-muted-foreground/60'}`} />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                          </div>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/30 animate-pulse" title="Workflow ativo" />
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs px-2.5 py-0.5 ${
                          isRunning
                            ? 'bg-cyan-500/20 text-blue-400 border-blue-500/30'
                            : isFailed
                            ? 'bg-red-500/20 text-red-300 border-red-400/40'
                            : isCompleted
                            ? 'bg-primary/15 text-primary/80 border-primary/30'
                            : isActive
                            ? 'bg-primary/10 text-primary border-primary/25'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {isRunning ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Executando...</>
                          ) : isFailed ? (
                            <><AlertTriangle className="w-3 h-3 mr-1" />Erro</>
                          ) : isCompleted ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" />{wfExec?.status === 'success' ? 'Sucesso' : 'Concluído'}</>
                          ) : isActive ? (
                            'Ativo'
                          ) : (
                            'Inativo'
                          )}
                        </Badge>
                        {(() => {
                          const remaining = getCountdownMs(wfExec?.startedAt, step.scheduleIntervalMs);
                          if (isRunning) return null;
                          if (!wfExec || !isActive) return null;
                          if (remaining > 0) {
                            return (
                              <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-500/25 text-blue-400 font-mono tabular-nums">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatCountdown(remaining)}
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/25 text-primary">
                              iminente
                            </Badge>
                          );
                        })()}
                      </div>

                      {/* Workflow Meta */}
                      <div className="pt-3 border-t border-border/30 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Workflow ID</span>
                          <span className="font-mono text-muted-foreground">{wf.id}</span>
                        </div>
                        {wfExec && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Última exec.</span>
                            <span className={`font-medium ${
                              wfExec.status === 'success' ? 'text-primary' :
                              wfExec.status === 'error' ? 'text-red-400' :
                              wfExec.status === 'running' ? 'text-blue-500' : 'text-muted-foreground'
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
          <div className="rounded-lg border border-border/40 bg-muted/60">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-medium text-foreground">Log da Sessão</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/30 text-blue-400">
                  Sessão
                </Badge>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
                  {activityLog.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {activityLog.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setActivityLog([])}
                  >
                    Limpar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowLog(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[180px]">
              <div className="p-2 space-y-0.5">
                {activityLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">Nenhuma atividade nesta sessão. O estado real continua disponível via n8n e banco.</p>
                ) : (
                  activityLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 py-0.5 hover:bg-muted/20 px-1 rounded">
                      <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0 mt-0.5 tabular-nums">
                        {formatTime(entry.timestamp)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-1 py-0 shrink-0 mt-0.5 ${
                          entry.type === 'running' ? 'border-blue-500/30 text-blue-500' :
                          entry.type === 'success' ? 'border-primary/25 text-primary' :
                          entry.type === 'error' ? 'border-red-500/30 text-red-400' :
                          entry.type === 'warn' ? 'border-amber-500/30 text-amber-400' :
                          'border-border text-muted-foreground'
                        }`}
                      >
                        {entry.step}
                      </Badge>
                      <span className={`text-[10px] ${LOG_TYPE_STYLES[entry.type] ?? 'text-muted-foreground'}`}>
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
        {latestUniqueExecutions.length > 0 && !showLog && (
          <div className="flex items-center gap-2 flex-wrap">
            <Eye className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Recentes:</span>
            {latestUniqueExecutions.slice(0, 5).map((exec) => {
              const wfName = workflows.find((w) => String(w.id) === String(exec.workflowId))?.name;
              const statusLabel = exec.status === 'success' ? 'OK' : exec.status === 'error' ? 'Erro' : exec.status === 'running' ? 'A correr' : exec.status;
              return (
                <Badge
                  key={String(exec.id)}
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 ${
                    exec.status === 'success' ? 'border-primary/25 text-primary' :
                    exec.status === 'error' ? 'border-red-500/30 text-red-400' :
                    exec.status === 'running' ? 'border-blue-500/30 text-blue-500 animate-pulse' :
                    'border-border text-muted-foreground'
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
                      ? 'bg-gradient-to-r from-primary/15 to-primary/10 hover:from-primary/25 hover:to-primary/15 text-primary/80 border-2 border-primary/40 hover:border-primary/50'
                      : 'bg-gradient-to-r from-primary to-primary/90 hover:bg-primary/80 shadow-primary/20'
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
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/30">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground/80">{stats.total} curados</span>
                </div>
                {stats.ready > 0 && (
                  <Badge className="bg-gradient-to-r from-primary/15 to-primary/10 text-primary/80 border-primary/30 px-3 py-1.5 text-sm animate-pulse shadow-lg shadow-primary/15">
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
                    <span className="text-xs text-muted-foreground">Score</span>
                    <span className="text-sm font-semibold text-blue-500">{stats.avgScore}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Cron schedule info + auto-promote toggle ── */}
        {pipelineFound && allActive && (
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 p-5 space-y-3 shadow-lg shadow-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15 shrink-0">
                <Clock className="w-4 h-4 text-primary/80" />
              </div>
              <p className="text-sm text-primary/80">
                <span className="font-semibold">Pipeline automático ativo</span>
                <span className="hidden sm:inline text-primary/80/80"> — o n8n gera curadoria mesmo sem login no portal; a promoção final passa pela Edge Function do portal.</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-primary/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${polling.isActive ? 'bg-primary/15' : 'bg-muted/30'}`}>
                  <Zap className={`w-4 h-4 ${polling.isActive ? 'text-primary/80' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-foreground font-medium flex items-center gap-2 flex-wrap">
                    Auto-promoção local
                    {polling.isActive && (
                      <Badge className="bg-primary/15 text-primary/80 border-primary/30 text-xs px-2 py-0.5 animate-pulse shadow-lg shadow-primary/15">
                        ATIVO
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-primary/70 mt-0.5">
                    {polling.isActive
                      ? `A cada 2 min nesta sessão · ${polling.totalPromoted} promovido(s)${polling.lastCheck ? ` · ${formatRelativeTime(polling.lastCheck)}` : ''}`
                      : 'Fallback local: curated → rascunhos via backend central; exige dashboard aberta e utilizador autenticado'}
                  </p>
                </div>
              </div>
              <Switch
                checked={polling.isActive}
                onCheckedChange={(checked) => checked ? polling.start() : polling.stop()}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-primary/90 shrink-0"
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
