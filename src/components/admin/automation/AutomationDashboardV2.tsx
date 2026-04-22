import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutGrid, Plus, Clock, Zap,
  PlayCircle, Settings2,
  Workflow, RefreshCw, Wrench,
  Layers3, ArrowRight, Activity, Radio, Sparkles,
  Trash2, Loader2, CheckSquare, Pause, Play, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AutomationCard } from './AutomationCard';
import { AutomationForm } from './AutomationForm';
import { AutomationTemplateGallery } from './AutomationTemplateGallery';
import { ExecutionTimeline } from './ExecutionTimeline';
import { AuditLogViewer } from './AuditLogViewer';
import { NewsPipelineCard } from './NewsPipelineCard';
import { CuratedPostsReview } from './CuratedPostsReview';
import { N8nWorkflowsPanel } from './N8nWorkflowsPanel';
import { EmailTemplateCampaignPanel } from './EmailTemplateCampaignPanel';

import { useAutomationsV2 } from '@/hooks/useAutomationsV2';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { useAutomationTemplates } from '@/hooks/useAutomationTemplates';
import { useN8nKeepAlive } from '@/hooks/useN8nKeepAlive';
import { useCuratedPosts } from '@/hooks/useCuratedPosts';
import { usePipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import {
  checkN8nHealth,
  getWorkflows,
  executeWorkflow,
  CronWorkflowError,
  deduplicateN8nWorkflows,
} from '@/services/n8n';

import {
  AUTOMATION_CATEGORIES,
  CATEGORY_META,
} from '@/types/automation';
import type {
  AutomationCategory,
  AutomationV2,
  AutomationTemplate,
  ExecutionStatus,
  CreateAutomationPayload,
  N8nWorkflow,
} from '@/types/automation';

interface AutomationDashboardV2Props {
  showLabButton?: boolean;
}

type DashboardView = 'pipeline' | 'automations' | 'logs' | 'tools';

/* ── Cleanup thresholds ── */
const CLEANUP_OPTIONS = [
  { label: '24 h', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
] as const;

/* ─── Collapsible Section ─── */
function Section({
  title,
  description,
  icon,
  children,
  actions,
  collapsible = false,
  defaultExpanded = true,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <section className="rounded-2xl border border-border/50 bg-card/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div
        className={`flex items-center justify-between gap-3 ${collapsible ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="truncate text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {collapsible && (
            <svg className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          )}
        </div>
      </div>
      {open && <div className="mt-4 border-t border-border/40 pt-4">{children}</div>}
    </section>
  );
}

/* ─── Small icon circle ─── */
function Ic({ icon: Icon, className = '' }: { icon: React.ElementType; className?: string }) {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${className}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function SummaryPill({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const Icon = icon;
  const toneClass = tone === 'success'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : tone === 'warning'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'border-border/60 bg-muted/30 text-muted-foreground';

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function PipelineRail({
  stages,
}: {
  stages: Array<{
    label: string;
    value: number;
    helper: string;
    tone: 'success' | 'warning' | 'neutral';
    icon: React.ElementType;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const toneClass = stage.tone === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : stage.tone === 'warning'
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-border/60 bg-muted/30 text-muted-foreground';

        return (
          <div key={stage.label} className="relative rounded-2xl border border-border/40 bg-card/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{stage.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{stage.value}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{stage.helper}</span>
              <span className={`rounded-full border px-2 py-0.5 font-medium ${toneClass}`}>
                {stage.tone === 'warning' ? 'Atenção' : stage.value > 0 ? 'OK' : 'Aguardando'}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className="absolute right-[-0.75rem] top-1/2 hidden -translate-y-1/2 xl:block">
                <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QueueBoard({
  sections,
}: {
  sections: Array<{
    label: string;
    tone: 'success' | 'warning' | 'neutral';
    items: Array<{ id: string; title: string; subtitle: string }>;
  }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => {
        const toneClass = section.tone === 'success'
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : section.tone === 'warning'
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-border/60 bg-muted/30 text-muted-foreground';

        return (
          <div key={section.label} className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClass}`}>
                {section.items.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {section.items.length > 0 ? (
                section.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/30 bg-muted/20 px-3 py-2.5">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.subtitle}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/30 px-3 py-5 text-center text-sm text-muted-foreground">
                  Sem itens nesta fila
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AutomationDashboardV2({
  showLabButton = true,
}: AutomationDashboardV2Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /* ── State ── */
  const [activeView, setActiveView] = useState<DashboardView>('pipeline');
  const [activeCategory, setActiveCategory] = useState<AutomationCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationV2 | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatus | 'all'>('all');

  /* ── Bulk selection state ── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  /* ── Cleanup state ── */
  const [cleanupHours, setCleanupHours] = useState(72);
  const [cleaning, setCleaning] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);

  /* ── Hooks ── */
  const {
    automations,
    total: totalAutomations,
    isLoading: loadingAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleStatus,
    bulkSetStatus,
    bulkDelete,
    isSaving,
  } = useAutomationsV2(activeCategory !== 'all' ? { category: activeCategory } : { pageSize: 100 });

  const {
    executions,
    total: totalExecutions,
    isLoading: loadingExecutions,
  } = useAutomationExecutions({
    status: executionStatusFilter === 'all' ? undefined : executionStatusFilter,
  });

  const { executions: executionSummary } = useAutomationExecutions({ pageSize: 100 });

  const { templates, isLoading: loadingTemplates } = useAutomationTemplates(
    activeCategory !== 'all' ? activeCategory : undefined
  );

  const { data: diagnostics } = usePipelineDiagnostics();
  const { data: curatedPosts = [] } = useCuratedPosts();

  const keepAlive = useN8nKeepAlive();
  const refreshingRef = useRef(false);

  const refreshN8n = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const health = await checkN8nHealth();
      try {
        const raw = await getWorkflows();
        setWorkflows(deduplicateN8nWorkflows(raw));
        setIsConnected(true);
      } catch {
        if (health.status === 'connected') {
          setIsConnected(true);
        } else {
          setIsConnected(false);
          setWorkflows([]);
        }
      }
    } catch {
      setIsConnected(false);
      setWorkflows([]);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => { void refreshN8n(); }, [refreshN8n]);

  /* ── Derived data ── */
  const activeAutomations = useMemo(() => automations.filter((a) => a.status === 'active').length, [automations]);
  const activeWorkflows = useMemo(() => workflows.filter((w) => w.active).length, [workflows]);
  const successRate = useMemo(() => {
    if (executionSummary.length === 0) return 0;
    return Math.round((executionSummary.filter((entry) => entry.status === 'success').length / executionSummary.length) * 100);
  }, [executionSummary]);
  const pipelineErrors = useMemo(() => executionSummary.filter((execution) => execution.status === 'error').length, [executionSummary]);
  const latestExecution = executionSummary[0] ?? null;
  const queueSections = useMemo(() => {
    const pending = curatedPosts.filter((post) => ['pending-review', 'draft', 'auto-draft'].includes(post.status));
    const ready = curatedPosts.filter((post) => post.status === 'ready');
    const error = curatedPosts.filter((post) => ['rejected', 'error'].includes(post.status));

    return [
      {
        label: 'Aguardando revisão',
        tone: 'warning' as const,
        items: pending.slice(0, 4).map((post) => ({
          id: post.id,
          title: post.title,
          subtitle: `${post.status} • ${new Date(post.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`,
        })),
      },
      {
        label: 'Prontos',
        tone: 'success' as const,
        items: ready.slice(0, 4).map((post) => ({
          id: post.id,
          title: post.title,
          subtitle: `${Math.round(Number(post.editorial_score))}% • ${new Date(post.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`,
        })),
      },
      {
        label: 'Erro',
        tone: 'neutral' as const,
        items: error.slice(0, 4).map((post) => ({
          id: post.id,
          title: post.title,
          subtitle: `${post.status} • ${new Date(post.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`,
        })),
      },
    ];
  }, [curatedPosts]);

  const pipelineStages = useMemo(() => ([
    {
      label: 'Coleta',
      value: diagnostics?.staging.total ?? 0,
      helper: `${diagnostics?.staging.unprocessed ?? 0} em fila`,
      tone: (diagnostics?.staging.unprocessed ?? 0) > 0 ? 'warning' : 'neutral',
      icon: Workflow,
    },
    {
      label: 'Cluster',
      value: diagnostics?.clusters.total ?? 0,
      helper: `${diagnostics?.clusters.highConfidence ?? 0} confiáveis`,
      tone: (diagnostics?.clusters.lowConfidence ?? 0) > 0 ? 'warning' : 'success',
      icon: Layers3,
    },
    {
      label: 'IA Reescrita',
      value: (diagnostics?.curated.ready ?? 0) + (diagnostics?.curated.draft ?? 0),
      helper: `${diagnostics?.curated.ready ?? 0} prontos`,
      tone: (diagnostics?.curated.ready ?? 0) > 0 ? 'success' : 'neutral',
      icon: Sparkles,
    },
    {
      label: 'Publicação',
      value: diagnostics?.curated.published ?? 0,
      helper: `${diagnostics?.curated.published ?? 0} publicados`,
      tone: (diagnostics?.curated.published ?? 0) > 0 ? 'success' : 'neutral',
      icon: Radio,
    },
  ]), [diagnostics]);

  /* ── Handlers ── */
  const handleSave = async (payload: CreateAutomationPayload) => {
    if (editingAutomation) {
      await updateAutomation({ id: editingAutomation.id, ...payload });
    } else {
      await createAutomation(payload);
    }
    setShowForm(false); setEditingAutomation(null); setSelectedTemplate(null);
  };

  const handleEdit = (a: AutomationV2) => { setEditingAutomation(a); setSelectedTemplate(null); setShowForm(true); };

  const handleClone = (a: AutomationV2) => {
    setEditingAutomation(null);
    setSelectedTemplate({
      id: '__clone__', name: '', description: a.description, category: a.category,
      icon: null, configPreset: a.config, workflowJson: null, isSystem: false, popularity: 0, createdAt: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta automação permanentemente?')) return;
    await deleteAutomation(id);
  };

  const handleExecute = async (a: AutomationV2) => {
    if (!a.workflowId) {
      toast({ title: 'Sem workflow', description: 'Esta automação não tem workflow associado.', variant: 'destructive' });
      return;
    }
    try {
      const result = await executeWorkflow(a.workflowId);
      toast({ title: 'Workflow executado', description: `${a.name} disparado com sucesso (${result.method}).` });
    } catch (err: unknown) {
      if (err instanceof CronWorkflowError) {
        toast({ title: `${a.name} — Automático (cron)`, description: 'Este workflow executa automaticamente por cronograma no n8n.' });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro na execução', description: msg, variant: 'destructive' });
    }
  };

  const handleUseTemplate = (tpl: AutomationTemplate) => { setSelectedTemplate(tpl); setEditingAutomation(null); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setEditingAutomation(null); setSelectedTemplate(null); };

  /* ── Bulk selection helpers ── */
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === automations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(automations.map((a) => a.id)));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'pause' | 'delete') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (action === 'delete' && !confirm(`Remover ${ids.length} automações permanentemente?`)) return;
    setBulkBusy(true);
    try {
      if (action === 'delete') await bulkDelete(ids);
      else await bulkSetStatus(ids, action === 'activate' ? 'active' : 'paused');
      setSelectedIds(new Set());
    } catch (err) {
      toast({ title: 'Erro na operação em massa', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  /* ── Cleanup pipeline data ── */
  const handleCleanup = async () => {
    if (!confirm(`Remover dados do pipeline com mais de ${cleanupHours}h?\n\nInclui staging antigo (processado e não processado), clusters órfãos e curados publicados/rejeitados.`)) return;
    setCleaning(true);
    const cutoff = new Date(Date.now() - cleanupHours * 60 * 60 * 1000).toISOString();
    try {
      /* 1 ─ Delete ALL old staging (processed + stale unprocessed) */
      const { data: stg, error: stgErr } = await supabase
        .from('news_staging')
        .delete()
        .lt('collected_at', cutoff)
        .select('id');
      if (stgErr) throw stgErr;

      /* 2 ─ Delete published/rejected curated posts older than cutoff */
      const { data: staleCurated, error: curFetchErr } = await supabase
        .from('curated_posts')
        .select('id, cluster_id')
        .in('status', ['published', 'rejected'])
        .lt('created_at', cutoff);
      if (curFetchErr) throw curFetchErr;

      const curatedIds = staleCurated?.map((r) => r.id) ?? [];
      let curatedCleaned = 0;
      if (curatedIds.length > 0) {
        const { data: cur, error: curDelErr } = await supabase
          .from('curated_posts')
          .delete()
          .in('id', curatedIds)
          .select('id');
        if (curDelErr) throw curDelErr;
        curatedCleaned = cur?.length ?? 0;
      }

      /* 3 ─ Delete orphan clusters (no active curated_posts referencing them) */
      const { data: allOldClusters, error: clsFetchErr } = await supabase
        .from('news_clusters')
        .select('id')
        .lt('created_at', cutoff);
      if (clsFetchErr) throw clsFetchErr;

      const oldClusterIds = (allOldClusters ?? []).map((r) => r.id);
      let clustersDeleted = 0;
      if (oldClusterIds.length > 0) {
        const { data: protectedRefs } = await supabase
          .from('curated_posts')
          .select('cluster_id')
          .in('cluster_id', oldClusterIds)
          .in('status', ['draft', 'ready', 'pending-review', 'auto-draft']);
        const protectedIds = new Set(
          (protectedRefs ?? []).map((r) => r.cluster_id).filter((id): id is string => Boolean(id)),
        );
        const toDelete = oldClusterIds.filter((id) => !protectedIds.has(id));
        if (toDelete.length > 0) {
          const { data: cls, error: clsErr } = await supabase
            .from('news_clusters')
            .delete()
            .in('id', toDelete)
            .select('id');
          if (clsErr) throw clsErr;
          clustersDeleted = cls?.length ?? 0;
        }
      }

      const stagingDeleted = stg?.length ?? 0;
      const total = stagingDeleted + clustersDeleted + curatedCleaned;

      /* Refresh pipeline data immediately */
      void queryClient.invalidateQueries({ queryKey: ['pipeline_diagnostics'] });
      void queryClient.invalidateQueries({ queryKey: ['curated_posts'] });

      toast({
        title: total > 0 ? `${total} registos removidos` : 'Nada para limpar',
        description: `Staging: ${stagingDeleted} · Clusters: ${clustersDeleted} · Curados: ${curatedCleaned}`,
      });
    } catch (err) {
      toast({ title: 'Erro na limpeza', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-border/40 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.08),transparent_25%)] p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/80 p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Centro de Automação</h1>
          <p className="text-sm text-muted-foreground">Pipeline editorial por IA, fluxos n8n e monitoramento operacional</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
            n8n {isConnected ? 'Online' : 'Offline'}
          </div>
          <Button
            variant={keepAlive.isActive ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => (keepAlive.isActive ? keepAlive.stop() : keepAlive.start())}
          >
            <Zap className={`mr-1 h-3 w-3 ${keepAlive.isActive ? 'animate-pulse' : ''}`} />
            Keep-Alive
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void refreshN8n()}>
            <RefreshCw className={`mr-1 h-3 w-3 ${loadingAutomations ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryPill label="Workflows" value={`${activeWorkflows}/${workflows.length}`} icon={Workflow} tone={isConnected ? 'success' : 'warning'} />
        <SummaryPill label="Automações" value={`${activeAutomations}/${totalAutomations} ativas`} icon={LayoutGrid} tone="success" />
        <SummaryPill label="Erros" value={String(pipelineErrors)} icon={Clock} tone={pipelineErrors > 0 ? 'warning' : 'neutral'} />
        <SummaryPill label="Sucesso" value={`${successRate}%`} icon={Zap} tone={successRate >= 90 ? 'success' : 'warning'} />
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as DashboardView)}>
        <TabsList className="h-auto w-full gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-muted/40 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="pipeline" className="gap-1.5 rounded-xl px-3 py-2 text-xs"><Zap className="h-3.5 w-3.5" />Pipeline</TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5 rounded-xl px-3 py-2 text-xs"><Workflow className="h-3.5 w-3.5" />Automações</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 rounded-xl px-3 py-2 text-xs"><Clock className="h-3.5 w-3.5" />Logs</TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 rounded-xl px-3 py-2 text-xs"><Wrench className="h-3.5 w-3.5" />Ferramentas</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeView === 'pipeline' && (
        <div className="space-y-5">
          <Section
            title="Pipeline visual"
            description="Coleta → Cluster → IA Reescrita → Publicação"
            icon={<Ic icon={Zap} className="text-primary bg-primary/10" />}
          >
            <PipelineRail stages={pipelineStages} />
          </Section>

          <Section
            title="Fila de conteúdo"
            description="Separação por estado para leitura rápida"
            icon={<Ic icon={Activity} className="text-blue-500 bg-blue-500/10" />}
          >
            <QueueBoard sections={queueSections} />
          </Section>

          <Section
            title="Revisão detalhada"
            description="Curadoria e promoção dos itens com contexto completo"
            icon={<Ic icon={PlayCircle} className="text-blue-500 bg-blue-500/10" />}
            collapsible
            defaultExpanded={false}
          >
            <CuratedPostsReview />
          </Section>

          {/* ── Cleanup Actions ── */}
          <Section
            title="Limpeza inteligente do pipeline"
            description="Remove staging antigo, clusters órfãos e curados já publicados/rejeitados. Dados em rascunho e prontos são preservados."
            icon={<Ic icon={Trash2} className="text-red-500 bg-red-500/10" />}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                  Staging + Clusters órfãos + Curados pub/rej
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Mais antigos que:</span>
                <div className="flex gap-1">
                  {CLEANUP_OPTIONS.map((opt) => (
                    <Button
                      key={opt.hours}
                      size="sm"
                      variant={cleanupHours === opt.hours ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setCleanupHours(opt.hours)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-3 text-xs gap-1.5"
                  disabled={cleaning}
                  onClick={() => void handleCleanup()}
                >
                  {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Limpar
                </Button>
              </div>
            </div>
          </Section>
        </div>
      )}

      {activeView === 'logs' && (
        <div className="space-y-5">
          <Section
            title="Execuções recentes"
            description="Histórico operacional do pipeline e das automações"
            icon={<Ic icon={Clock} className="text-amber-500 bg-amber-500/10" />}
            actions={
              <Select value={executionStatusFilter} onValueChange={(v) => setExecutionStatusFilter(v as typeof executionStatusFilter)}>
                <SelectTrigger className="h-7 w-28 text-[11px]"><SelectValue placeholder="Filtrar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="running">Executando</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <ExecutionTimeline
              executions={executions}
              total={totalExecutions}
              isLoading={loadingExecutions}
              error={null}
              statusFilter={executionStatusFilter}
              onStatusFilterChange={setExecutionStatusFilter}
            />
          </Section>

          <Section
            title="Audit Log"
            description="Histórico de alterações com diff de campos"
            icon={<Ic icon={Shield} className="text-purple-500 bg-purple-500/10" />}
            collapsible
            defaultExpanded={false}
          >
            <AuditLogViewer />
          </Section>

          <Section
            title="Detalhe técnico"
            description="Configuração avançada do pipeline e logs internos"
            icon={<Ic icon={Settings2} className="text-muted-foreground bg-muted" />}
            collapsible
            defaultExpanded={false}
          >
            <NewsPipelineCard />
          </Section>
        </div>
      )}

      {activeView === 'automations' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {AUTOMATION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_META[cat]?.label || cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={() => { setEditingAutomation(null); setSelectedTemplate(null); setShowForm(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />Nova Automação
            </Button>
          </div>

          {showForm && (
            <Section
              title={editingAutomation ? 'Editar Automação' : 'Nova Automação'}
              icon={<Ic icon={Plus} className="text-primary bg-primary/10" />}
            >
              <AutomationForm
                editing={editingAutomation}
                template={selectedTemplate}
                workflows={workflows}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
              />
            </Section>
          )}

          <Section
            title="Galeria de Templates"
            description="Templates pré-configurados"
            icon={<Ic icon={LayoutGrid} className="text-blue-500 bg-blue-500/10" />}
            collapsible
            defaultExpanded={false}
          >
            <AutomationTemplateGallery
              templates={templates}
              isLoading={loadingTemplates}
              onUseTemplate={handleUseTemplate}
              activeCategory={activeCategory}
            />
          </Section>

          {loadingAutomations ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando automações...</div>
          ) : automations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-3 text-sm text-muted-foreground">Nenhuma automação encontrada</p>
              <Button size="sm" onClick={() => setShowForm(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Criar Primeira Automação</Button>
            </div>
          ) : (
            <>
              {/* Bulk action bar */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={toggleSelectAll}>
                  <CheckSquare className="h-3.5 w-3.5" />
                  {selectedIds.size === automations.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
                </Button>
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">{selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}</span>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={bulkBusy} onClick={() => void handleBulkAction('activate')}>
                      <Play className="h-3 w-3" />Ativar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={bulkBusy} onClick={() => void handleBulkAction('pause')}>
                      <Pause className="h-3 w-3" />Pausar
                    </Button>
                    <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" disabled={bulkBusy} onClick={() => void handleBulkAction('delete')}>
                      {bulkBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}Remover
                    </Button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {automations.map((auto) => (
                  <AutomationCard
                    key={auto.id}
                    automation={auto}
                    selected={selectedIds.has(auto.id)}
                    onSelect={(checked) => toggleSelect(auto.id, checked)}
                    onToggle={() => void toggleStatus(auto.id, auto.status)}
                    onEdit={() => handleEdit(auto)}
                    onDelete={() => void handleDelete(auto.id)}
                    onExecute={() => void handleExecute(auto)}
                    onClone={() => handleClone(auto)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeView === 'tools' && (
        <div className="space-y-5">
          <Section
            title="Workflows n8n"
            description={`${activeWorkflows}/${workflows.length} ativos`}
            icon={<Ic icon={Settings2} className="text-amber-500 bg-amber-500/10" />}
            actions={
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void refreshN8n()}>
                <RefreshCw className="mr-1 h-3 w-3" />Atualizar
              </Button>
            }
          >
            <N8nWorkflowsPanel workflows={workflows} isConnected={isConnected} onRefresh={() => void refreshN8n()} />
          </Section>

          {showLabButton && (
            <Section
              title="Email Templates (Dev)"
              description="Envio de templates para revisão"
              icon={<Ic icon={Wrench} className="bg-muted text-muted-foreground" />}
              collapsible
              defaultExpanded={false}
            >
              <EmailTemplateCampaignPanel />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
