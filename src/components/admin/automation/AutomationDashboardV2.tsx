import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutGrid, Plus, Clock, Zap,
  Workflow, RefreshCw, Wrench,
  Layers3, ArrowRight, Activity, Radio, Sparkles,
  Trash2, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Each tab is its own chunk — opening "Centro de Automação" no longer pulls
// in the other 3 tabs' code until the user actually clicks them (NFR-007).
const PipelineView = lazy(() => import('./PipelineView').then((m) => ({ default: m.PipelineView })));
const AutomationsView = lazy(() => import('./AutomationsView').then((m) => ({ default: m.AutomationsView })));
const LogsView = lazy(() => import('./LogsView').then((m) => ({ default: m.LogsView })));
const ToolsView = lazy(() => import('./ToolsView').then((m) => ({ default: m.ToolsView })));

function TabSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

import { useAutomationsV2, useAutomationStats } from '@/hooks/useAutomationsV2';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { useAutomationTemplates } from '@/hooks/useAutomationTemplates';
import { useN8nKeepAlive } from '@/hooks/useN8nKeepAlive';
import { useCuratedPosts } from '@/hooks/useCuratedPosts';
import { usePipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logAutomationAction } from '@/services/auditLog';
import { notifyAdmin } from '@/services/adminNotifications';

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

function StatBar({
  stats,
}: {
  stats: Array<{ label: string; value: string; tone: 'success' | 'warning' | 'neutral' }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/40 bg-border/30 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5 bg-card px-4 py-3">
          <span className="truncate text-[11px] font-medium text-muted-foreground">{stat.label}</span>
          <span
            className={`text-xl font-bold tabular-nums ${
              stat.tone === 'success'
                ? 'text-emerald-600 dark:text-emerald-400'
                : stat.tone === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground'
            }`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AutomationDashboardV2({
  showLabButton = true,
}: AutomationDashboardV2Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<DashboardView>('pipeline');
  const [activeCategory, setActiveCategory] = useState<AutomationCategory | 'all'>('all');
  const [automationsPage, setAutomationsPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationV2 | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatus | 'all'>('all');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [cleanupHours, setCleanupHours] = useState(72);
  const [cleaning, setCleaning] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);

  // Grid stays on a fixed small page size regardless of category — KPI
  // counts come from useAutomationStats() instead, so they stay accurate
  // even past page 1 with 100+ automations (NFR-001).
  const AUTOMATIONS_PAGE_SIZE = 24;
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
  } = useAutomationsV2({
    ...(activeCategory !== 'all' ? { category: activeCategory } : {}),
    page: automationsPage,
    pageSize: AUTOMATIONS_PAGE_SIZE,
  });
  const { data: automationStats } = useAutomationStats();

  useEffect(() => { setAutomationsPage(1); }, [activeCategory]);

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
      // 'error' means n8n IS responding (just with a non-ok status) — treat as online
      const n8nResponding = health.status === 'connected' || health.status === 'error';
      try {
        const raw = await getWorkflows();
        setWorkflows(deduplicateN8nWorkflows(raw));
        setIsConnected(true);
      } catch {
        if (n8nResponding) {
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

  // Sync isConnected with keep-alive ping results so the status dot
  // updates automatically without requiring a manual refresh.
  useEffect(() => {
    if (!keepAlive.lastStatus) return;
    if (keepAlive.lastStatus === 'connected') {
      setIsConnected(true);
      // Also refresh workflows list on reconnect
      void refreshN8n();
    } else if (keepAlive.lastStatus === 'unreachable') {
      setIsConnected(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepAlive.lastPing]);

  const activeWorkflows = useMemo(() => workflows.filter((w) => w.active).length, [workflows]);

  // If automations_v2 table has no records yet, fall back to n8n workflow counts so the pill shows real state.
  // Counts come from useAutomationStats() (unpaginated head:true queries), not from the
  // current page's `automations` array, so they stay correct past page 1 (NFR-001).
  const statsTotal = automationStats?.total ?? 0;
  const effectiveTotalAutomations = statsTotal > 0 ? statsTotal : workflows.length;
  const activeAutomations = statsTotal > 0 ? (automationStats?.active ?? 0) : activeWorkflows;

  // null = no data yet → show "N/D" instead of a misleading 0%
  const successRate = useMemo((): number | null => {
    if (executionSummary.length === 0) return null;
    return Math.round((executionSummary.filter((entry) => entry.status === 'success').length / executionSummary.length) * 100);
  }, [executionSummary]);
  const pipelineErrors = useMemo(() => executionSummary.filter((execution) => execution.status === 'error').length, [executionSummary]);
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
  ] as const), [diagnostics]);

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
    const startedAt = new Date().toISOString();
    try {
      const result = await executeWorkflow(a.workflowId);
      toast({ title: 'Workflow executado', description: `${a.name} disparado com sucesso (${result.method}).` });
      const finishedAt = new Date().toISOString();
      await supabase.from('automation_executions').insert({
        automation_id: a.id,
        status: 'success',
        trigger_mode: 'manual',
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        metadata: { method: result.method, workflowId: a.workflowId },
      });
      void queryClient.invalidateQueries({ queryKey: ['automation_executions'] });
      void logAutomationAction('executed', a.id, { name: a.name, status: 'success', method: result.method });
      if (user?.id) {
        void notifyAdmin({
          userId: user.id,
          title: 'Automação executada',
          message: `${a.name} foi disparada com sucesso (${result.method}).`,
          type: 'success',
          source: a.id,
        });
      }
    } catch (err: unknown) {
      if (err instanceof CronWorkflowError) {
        toast({ title: `${a.name} — Automático (cron)`, description: 'Este workflow executa automaticamente por cronograma no n8n.' });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro na execução', description: msg, variant: 'destructive' });
      await supabase.from('automation_executions').insert({
        automation_id: a.id,
        status: 'error',
        trigger_mode: 'manual',
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        error_message: msg,
        metadata: { workflowId: a.workflowId },
      });
      void queryClient.invalidateQueries({ queryKey: ['automation_executions'] });
      void logAutomationAction('executed', a.id, { name: a.name, status: 'error', error: msg });
      if (user?.id) {
        void notifyAdmin({
          userId: user.id,
          title: 'Falha na execução',
          message: `${a.name} falhou: ${msg}`,
          type: 'error',
          source: a.id,
        });
      }
    }
  };

  const handleUseTemplate = (tpl: AutomationTemplate) => { setSelectedTemplate(tpl); setEditingAutomation(null); setShowForm(true); };
  const handleCancel = () => { setShowForm(false); setEditingAutomation(null); setSelectedTemplate(null); };

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

  const handleCleanup = async () => {
    if (!confirm(`Remover dados do pipeline com mais de ${cleanupHours}h?\n\nInclui staging antigo (processado e não processado), clusters órfãos e curados publicados/rejeitados.`)) return;
    setCleaning(true);
    const cutoff = new Date(Date.now() - cleanupHours * 60 * 60 * 1000).toISOString();
    try {
      const { data: stg, error: stgErr } = await supabase
        .from('news_staging')
        .delete()
        .lt('collected_at', cutoff)
        .select('id');
      if (stgErr) throw stgErr;

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
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Centro de Automação
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pipeline editorial por IA, fluxos n8n e monitoramento
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              isConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
            n8n {isConnected ? 'Online' : 'Offline'}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={keepAlive.isActive ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => (keepAlive.isActive ? keepAlive.stop() : keepAlive.start())}
              >
                <Zap className={`h-3.5 w-3.5 ${keepAlive.isActive ? 'animate-pulse text-primary' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{keepAlive.isActive ? 'Desativar Keep-Alive' : 'Ativar Keep-Alive'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void refreshN8n()}>
                <RefreshCw className={`h-3.5 w-3.5 ${loadingAutomations ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Atualizar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <StatBar
        stats={[
          {
            label: 'Workflows',
            value: `${activeWorkflows}/${workflows.length}`,
            tone: isConnected ? 'success' : 'warning',
          },
          {
            label: 'Automações ativas',
            value: `${activeAutomations}/${effectiveTotalAutomations}`,
            tone: 'success',
          },
          {
            label: 'Erros',
            value: String(pipelineErrors),
            tone: pipelineErrors > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Taxa de sucesso',
            value: successRate === null ? 'N/D' : `${successRate}%`,
            tone: successRate === null ? 'neutral' : successRate >= 90 ? 'success' : 'warning',
          },
        ]}
      />

      {/* ── Tab navigation ── */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as DashboardView)}>
        <TabsList className="h-auto w-full gap-1 overflow-x-auto rounded-xl border border-border/40 bg-muted/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="pipeline" className="gap-1.5 rounded-lg px-3 py-2 text-xs">
            <Zap className="h-3.5 w-3.5" />Pipeline
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5 rounded-lg px-3 py-2 text-xs">
            <Workflow className="h-3.5 w-3.5" />Automações
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 rounded-lg px-3 py-2 text-xs">
            <Clock className="h-3.5 w-3.5" />Logs
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 rounded-lg px-3 py-2 text-xs">
            <Wrench className="h-3.5 w-3.5" />Ferramentas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Suspense fallback={<TabSkeleton />}>
        {activeView === 'pipeline' && (
          <PipelineView
            pipelineErrors={pipelineErrors}
            queueSections={queueSections}
            pipelineStages={pipelineStages}
            showForm={showForm}
            cleanupHours={cleanupHours}
            cleaning={cleaning}
            handleCleanup={() => void handleCleanup()}
            setCleanupHours={setCleanupHours}
          />
        )}

        {activeView === 'logs' && (
          <LogsView
            executions={executions}
            totalExecutions={totalExecutions}
            loadingExecutions={loadingExecutions}
            executionStatusFilter={executionStatusFilter}
            setExecutionStatusFilter={setExecutionStatusFilter}
          />
        )}

        {activeView === 'automations' && (
          <AutomationsView
            automations={automations}
            totalAutomations={totalAutomations}
            page={automationsPage}
            pageSize={AUTOMATIONS_PAGE_SIZE}
            setPage={setAutomationsPage}
            loadingAutomations={loadingAutomations}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            showForm={showForm}
            setShowForm={(show) => {
              if (show) { setEditingAutomation(null); setSelectedTemplate(null); }
              setShowForm(show);
            }}
            editingAutomation={editingAutomation}
            setEditingAutomation={setEditingAutomation}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            templates={templates}
            loadingTemplates={loadingTemplates}
            workflows={workflows}
            isSaving={isSaving}
            selectedIds={selectedIds}
            bulkBusy={bulkBusy}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            handleBulkAction={(action) => void handleBulkAction(action)}
            handleSave={(payload) => void handleSave(payload)}
            handleEdit={handleEdit}
            handleClone={handleClone}
            handleDelete={(id) => void handleDelete(id)}
            handleExecute={(a) => void handleExecute(a)}
            handleUseTemplate={handleUseTemplate}
            handleCancel={handleCancel}
            toggleStatus={toggleStatus}
          />
        )}

        {activeView === 'tools' && (
          <ToolsView
            workflows={workflows}
            isConnected={isConnected}
            activeWorkflows={activeWorkflows}
            showLabButton={showLabButton}
            onRefresh={() => void refreshN8n()}
          />
        )}
      </Suspense>
    </div>
  );
}

