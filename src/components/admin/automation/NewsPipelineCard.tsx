import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Newspaper, Layers, Sparkles, Play, RefreshCw, CheckCircle2, Square,
  Clock, Loader2, Tag, X, Settings2, Zap,
  Activity, ArrowUpRight, AlertTriangle, Radio, Eye, Database, Shield, Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  ColdStartError,
  deduplicateN8nWorkflows,
} from '@/services/n8n';
import type { N8nWorkflow, N8nExecution } from '@/types/automation';
import { setKeepAlivePipelineBusy } from '@/hooks/useN8nKeepAlive';
import { PipelineSettingsPanel } from './PipelineSettingsPanel';
import { PipelineActivityLog, type LogEntry } from './PipelineActivityLog';
import { PipelineStepCard } from './PipelineStepCard';
import { EditorialConfigForm } from './EditorialConfigForm';
import { PipelineDiagnosticsPanel } from './PipelineDiagnosticsPanel';
import { PipelineActionsBar } from './PipelineActionsBar';

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
    scheduleIntervalMs: 30 * 60_000,
  },
  {
    key: 'wf02',
    label: 'Cluster & Dedup',
    shortLabel: 'Cluster',
    description: 'Agrupamento e deduplicação',
    icon: Layers,
    nameMatch: 'WF-02',
    delayAfterMs: 30_000,
    scheduleIntervalMs: 20 * 60_000,
  },
  {
    key: 'wf03',
    label: 'IA Reescrita',
    shortLabel: 'IA',
    description: 'Geração e publicação de artigos por IA',
    icon: Sparkles,
    nameMatch: 'WF-03',
    delayAfterMs: 0,
    scheduleIntervalMs: 60 * 60_000,
  },
];

function matchWorkflow(workflows: N8nWorkflow[], nameMatch: string): N8nWorkflow | undefined {
  const matches = workflows.filter((w) => w.name?.includes(nameMatch));
  if (matches.length <= 1) return matches[0];

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

  const latestExecutionByStepKey = useMemo(() => {
    const map = new Map<string, N8nExecution>();

    for (const step of PIPELINE_STEPS) {
      const matchingWorkflowIds = workflows
        .filter((workflow) => workflow.name?.includes(step.nameMatch))
        .map((workflow) => String(workflow.id));

      if (matchingWorkflowIds.length === 0) continue;

      let latestExecution: N8nExecution | undefined;
      for (const exec of recentExecutions) {
        const workflowId = exec.workflowId;
        if (workflowId === undefined || workflowId === null) continue;
        if (!matchingWorkflowIds.includes(String(workflowId))) continue;

        if (!latestExecution || getExecutionTimestamp(exec) > getExecutionTimestamp(latestExecution)) {
          latestExecution = exec;
        }
      }

      if (latestExecution) {
        map.set(step.key, latestExecution);
      }
    }

    return map;
  }, [recentExecutions, workflows]);

  const latestUniqueExecutions = useMemo(() => {
    return [...latestExecutionByWorkflowId.values()]
      .sort((a, b) => getExecutionTimestamp(b) - getExecutionTimestamp(a));
  }, [latestExecutionByWorkflowId]);

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
        console.error(`[Pipeline] Failed to ${target ? 'activate' : 'deactivate'} workflow ${wf.id}:`, msg);
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

    const inactiveSteps = pipelineWorkflows.filter(({ wf }) => wf && wf.active === false);
    if (inactiveSteps.length > 0) {
      addLogEntry('Pipeline', `Ativando ${inactiveSteps.length} workflow(s) inativo(s)...`, 'running');
      for (const { step: s, wf: w } of inactiveSteps) {
        if (!w) continue;
        try {
          await activateWorkflow(w);
          addLogEntry(s.shortLabel, 'Workflow ativado', 'success');
        } catch (activateErr) {
          const msg = activateErr instanceof Error ? activateErr.message : 'Erro ao ativar';
          addLogEntry(s.shortLabel, `Aviso: não foi possível ativar: ${msg}`, 'warn');
        }
      }
      addLogEntry('Pipeline', 'Aguardando registo de webhooks no n8n (3s)...', 'info');
      await new Promise((r) => setTimeout(r, 3000));
    }

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
        // Execute with one automatic cold-start retry (502/503 from Render free tier)
        let result: { executed: boolean; method: string };
        try {
          result = await executeWorkflow(wf);
        } catch (firstErr) {
          if (firstErr instanceof ColdStartError && !abortRef.current) {
            addLogEntry('Sistema', 'n8n cold start detectado — a aguardar 45s e a tentar novamente...', 'warn');
            await new Promise((r) => setTimeout(r, 45_000));
            if (abortRef.current) throw firstErr;
            addLogEntry('Sistema', 'A tentar novamente após cold start...', 'info');
            result = await executeWorkflow(wf);
          } else {
            throw firstErr;
          }
        }

        completedStepKeys.add(step.key);
        setCompletedSteps(new Set(completedStepKeys));
        addLogEntry(step.shortLabel, `✓ "${wf.name}" executado com sucesso (método: ${result.method})`, 'success');

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
          failedStepKeys.add(step.key);
          setFailedSteps(new Set(failedStepKeys));
          addLogEntry(step.shortLabel, 'Não foi possível disparar o workflow via webhook. Verifique que está ativo no n8n e tente novamente.', 'error');
          toast({
            title: `${step.label} — webhook não respondeu`,
            description: 'Confirme que o workflow está ativo no n8n e tente novamente em alguns segundos.',
            variant: 'destructive',
          });
          break;
        }

        if (err instanceof ColdStartError) {
          failedStepKeys.add(step.key);
          setFailedSteps(new Set(failedStepKeys));
          addLogEntry(step.shortLabel, 'n8n ainda a arrancar após cold start. Aguarde 1-2 minutos e tente novamente.', 'error');
          toast({ title: 'n8n cold start', description: 'Aguarde 1-2 min e tente novamente.', variant: 'destructive' });
          break;
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
      addLogEntry('Pipeline', `Pipeline concluído — ${confirmedCount} workflow(s) disparados via webhook`, 'success');
    } else {
      addLogEntry('Pipeline', `Pipeline concluído com ${failedCount} erro(s) após ${confirmedCount} confirmação(ões)`, 'warn');
    }

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
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Workflow className="w-3.5 h-3.5" />
                    {pipelineWorkflows.length} workflow{pipelineWorkflows.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-muted-foreground/60">•</span>
                  <span>Coleta → Cluster → Reescrita</span>
                  {someActive && !allActive && <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] px-1.5 py-0">Parcial</Badge>}
                  {allActive && <Badge variant="outline" className="border-primary/30 text-primary text-[10px] px-1.5 py-0">Todos ativos</Badge>}
                </div>
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
          <EditorialConfigForm
            editConfigLabel={editConfigLabel}
            setEditConfigLabel={setEditConfigLabel}
            editLanguage={editLanguage}
            setEditLanguage={setEditLanguage}
            editRegion={editRegion}
            setEditRegion={setEditRegion}
            editDefaultPostTags={editDefaultPostTags}
            newDefaultPostTag={newDefaultPostTag}
            setNewDefaultPostTag={setNewDefaultPostTag}
            editThemeRules={editThemeRules}
            isSaving={isSaving}
            onAddDefaultPostTag={addDefaultPostTag}
            onRemoveDefaultPostTag={removeDefaultPostTag}
            onAddThemeRule={addThemeRule}
            onUpdateThemeRule={updateThemeRule}
            onRemoveThemeRule={removeThemeRule}
            onSave={() => void saveEditorialConfig()}
            onCancel={() => setShowConfig(false)}
          />
        )}

        {/* ── Pipeline Settings Panel ── */}
        {showSettings && (
          <PipelineSettingsPanel diagnostics={diagnostics} onClose={() => setShowSettings(false)} />
        )}

        {/* ── Pipeline DB Diagnostics ── */}
        <PipelineDiagnosticsPanel
          diagnostics={diagnostics}
          diagnosticsError={diagnosticsError}
          activeConfig={activeConfig}
          onRefetch={() => void refetchDiagnostics()}
        />

        {/* ── Pipeline Steps Visual ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {PIPELINE_STEPS.map((step, idx) => {
              const wf = matchWorkflow(workflows, step.nameMatch);
              if (!wf) return null;

              const isActive = wf.active === true;
              const isRunning = currentStep === step.key;
              const wfExec = latestExecutionByStepKey.get(step.key) ?? latestExecutionByWorkflowId.get(String(wf.id));
              const workflowUpdatedAt = wf.updatedAt ? Date.parse(String(wf.updatedAt)) : 0;
              const executionAt = wfExec ? getExecutionTimestamp(wfExec) : 0;
              const isExecutionCurrent = !wfExec || workflowUpdatedAt <= 0 || executionAt >= workflowUpdatedAt;
              const hasExecutionSuccess = wfExec?.status === 'success' && isExecutionCurrent;
              const hasExecutionError = wfExec?.status === 'error' && isExecutionCurrent;
              const isFailed = failedSteps.has(step.key) || (!isRunning && hasExecutionError);
              const isCompleted = hasExecutionSuccess || (completedSteps.has(step.key) && !hasExecutionError);

              return (
                <PipelineStepCard
                  key={step.key}
                  step={step}
                  wf={wf}
                  idx={idx}
                  totalSteps={PIPELINE_STEPS.length}
                  isRunning={isRunning}
                  isFailed={isFailed}
                  isCompleted={isCompleted}
                  isActive={isActive}
                  isExecutionCurrent={isExecutionCurrent}
                  hasExecutionSuccess={hasExecutionSuccess}
                  hasExecutionError={hasExecutionError}
                  wfExec={wfExec}
                />
              );
            })}
        </div>

        {/* ── Activity Log ── */}
        {showLog && (
          <PipelineActivityLog
            activityLog={activityLog}
            onClear={() => setActivityLog([])}
            onClose={() => setShowLog(false)}
          />
        )}

        {/* ── Actions, Stats & Cron Info ── */}
        <PipelineActionsBar
          pipelineFound={pipelineFound}
          pipelineRunning={pipelineRunning}
          promoting={promoting}
          allActive={allActive}
          loading={loading}
          stats={stats}
          polling={polling}
          onRunPipeline={() => void handleRunPipeline()}
          onPromoteOnly={() => void handlePromoteOnly()}
          onAbort={() => { abortRef.current = true; }}
          formatRelativeTime={formatRelativeTime}
        />
      </div>
    </div>
  );
}
