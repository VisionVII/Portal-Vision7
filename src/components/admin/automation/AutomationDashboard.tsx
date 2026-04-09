import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, FlaskConical, Wifi, WifiOff, Heart, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

import { AutomationKPIBar } from './AutomationKPIBar';
import { AutomationCategoryTabs } from './AutomationCategoryTabs';
import { AutomationCard } from './AutomationCard';
import { AutomationForm } from './AutomationForm';
import { AutomationTemplateGallery } from './AutomationTemplateGallery';
import { ExecutionTimeline } from './ExecutionTimeline';
import { NewsPipelineCard } from './NewsPipelineCard';
import { CuratedPostsReview } from './CuratedPostsReview';
import { N8nWorkflowsPanel } from './N8nWorkflowsPanel';

import { useAutomationsV2 } from '@/hooks/useAutomationsV2';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { useAutomationTemplates } from '@/hooks/useAutomationTemplates';
import { usePipelineConfig } from '@/hooks/usePipelineConfig';
import { useN8nKeepAlive } from '@/hooks/useN8nKeepAlive';

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

interface AutomationDashboardProps {
  showLabButton?: boolean;
}

export function AutomationDashboard({
  showLabButton = true,
}: AutomationDashboardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ── n8n state ── */
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [n8nStatusDetail, setN8nStatusDetail] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);

  /* ── UI state ── */
  const [activeCategory, setActiveCategory] = useState<AutomationCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationV2 | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatus | ''>('');

  /* ── Data hooks ── */
  const {
    automations,
    isLoading: loadingAutomations,
    error: automationsError,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleStatus,
    isSaving,
    isDeleting,
  } = useAutomationsV2(
    activeCategory !== 'all' ? { category: activeCategory } : {}
  );

  const {
    executions,
    total: totalExecutions,
    isLoading: loadingExecutions,
    error: executionsError,
  } = useAutomationExecutions({
    status: executionStatusFilter || undefined,
  });

  const {
    templates,
    isLoading: loadingTemplates,
    error: templatesError,
  } = useAutomationTemplates(activeCategory !== 'all' ? activeCategory : undefined);

  const { activeConfig, updateTags, createConfig } = usePipelineConfig();

  /* ── n8n Keep-Alive Bot ── */
  const keepAlive = useN8nKeepAlive();

  /* ── n8n health + workflow fetch ── */
  const refreshingRef = useRef(false);
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Try to fetch workflows. Returns them on success, null on failure. */
  const tryLoadWorkflows = useCallback(async (): Promise<N8nWorkflow[] | null> => {
    try {
      const raw = await getWorkflows();
      console.log('[Dashboard] Workflows before dedup:', raw.length, raw.map(w => ({ id: w.id, name: w.name, active: w.active })));
      const deduped = deduplicateN8nWorkflows(raw);
      console.log('[Dashboard] Workflows after dedup:', deduped.length, deduped.map(w => ({ id: w.id, name: w.name, active: w.active })));
      return deduped;
    } catch {
      return null;
    }
  }, []);

  const refreshN8n = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      const health = await checkN8nHealth();
      const isColdStart = health.status !== 'connected' &&
        /timeout|abort|503|not ready|unreachable/i.test(health.detail ?? health.status);

      if (health.status === 'connected') {
        const wfs = await tryLoadWorkflows();
        if (wfs) {
          setWorkflows(wfs);
          setIsConnected(true);
          setN8nStatusDetail(null);
        } else {
          setIsConnected(false);
          setWorkflows([]);
          setN8nStatusDetail('n8n online mas falha ao listar workflows.');
        }
      } else if (isColdStart) {
        // Cold-start detected. The health check just woke Render.
        // Try workflows immediately (might work if health was borderline).
        setN8nStatusDetail('n8n a arrancar (cold start)… a tentar ligar…');
        const wfs = await tryLoadWorkflows();
        if (wfs) {
          setWorkflows(wfs);
          setIsConnected(true);
          setN8nStatusDetail(null);
        } else {
          // Schedule a retry in 30s — by then Render should be booted.
          setIsConnected(false);
          setWorkflows([]);
          setN8nStatusDetail('n8n a arrancar — nova tentativa em 30 s…');

          if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
          warmupTimerRef.current = setTimeout(async () => {
            warmupTimerRef.current = null;
            // Retry health + workflows after Render had time to boot (60s)
            try {
              const h2 = await checkN8nHealth();
              if (h2.status === 'connected') {
                const wfs2 = await tryLoadWorkflows();
                if (wfs2) {
                  setWorkflows(wfs2);
                  setIsConnected(true);
                  setN8nStatusDetail(null);
                  return;
                }
              }
              // Still cold — try workflows anyway
              const wfs2 = await tryLoadWorkflows();
              if (wfs2) {
                setWorkflows(wfs2);
                setIsConnected(true);
                setN8nStatusDetail(null);
              } else {
                setN8nStatusDetail('n8n a arrancar — polling continuará a cada 30s até ligar.');
              }
            } catch {
              setN8nStatusDetail('n8n ainda não respondeu — aguarde ou recarregue.');
            }
          }, 60_000);
        }
      } else {
        setIsConnected(false);
        setWorkflows([]);
        setN8nStatusDetail(health.detail ?? 'Falha ao verificar a saúde do n8n.');
      }

      setLastSync(new Date().toISOString());
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar com o n8n.';
      setIsConnected(false);
      setWorkflows([]);
      setN8nStatusDetail(detail);
      setLastSync(new Date().toISOString());
    } finally {
      refreshingRef.current = false;
    }
  }, [tryLoadWorkflows]);

  useEffect(() => {
    void refreshN8n();
  }, [refreshN8n]);

  useEffect(() => {
    const handleFocus = () => { void refreshN8n(); };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshN8n();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshN8n]);

  // Separate effect for adaptive polling interval
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Adaptive polling: slower when connected (2min), faster when warming (30s) or offline (1min)
    const intervalMs = n8nStatusDetail?.includes('arrancar') 
      ? 30_000  // warming — poll frequently to catch when n8n becomes ready
      : isConnected 
      ? 120_000 // connected — slow poll to avoid spamming n8n
      : 60_000; // offline — moderate poll to detect recovery

    pollIntervalRef.current = setInterval(() => void refreshN8n(), intervalMs);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [refreshN8n, isConnected, n8nStatusDetail]);

  // Cleanup warmup timer on unmount
  useEffect(() => {
    return () => {
      if (warmupTimerRef.current) clearTimeout(warmupTimerRef.current);
    };
  }, []);

  /* ── Category counts ── */
  const allAutomationsForCounts = useAutomationsV2({ pageSize: 1000 });
  const counts: Record<AutomationCategory | 'all', number> = {
    all: allAutomationsForCounts.total,
    ...Object.fromEntries(
      AUTOMATION_CATEGORIES.map((c) => [
        c,
        allAutomationsForCounts.automations.filter((a) => a.category === c).length,
      ])
    ),
  } as Record<AutomationCategory | 'all', number>;
  const dashboardErrors = [
    automationsError,
    executionsError,
    templatesError,
    allAutomationsForCounts.error,
  ]
    .filter((error): error is Error => error instanceof Error)
    .map((error) => error.message)
    .filter((message, index, list) => list.indexOf(message) === index);

  /* ── Handlers ── */
  const handleSave = async (payload: CreateAutomationPayload) => {
    if (editingAutomation) {
      await updateAutomation({ id: editingAutomation.id, ...payload });
    } else {
      await createAutomation(payload);
    }
    setShowForm(false);
    setEditingAutomation(null);
    setSelectedTemplate(null);
  };

  const handleEdit = (automation: AutomationV2) => {
    setEditingAutomation(automation);
    setSelectedTemplate(null);
    setShowForm(true);
  };

  const handleClone = (automation: AutomationV2) => {
    setEditingAutomation(null);
    setSelectedTemplate({
      id: '__clone__',
      name: '',
      description: automation.description,
      category: automation.category,
      icon: null,
      configPreset: automation.config,
      workflowJson: null,
      isSystem: false,
      popularity: 0,
      createdAt: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta automação permanentemente?')) return;
    await deleteAutomation(id);
  };

  const handleExecute = async (automation: AutomationV2) => {
    if (!automation.workflowId) {
      toast({ title: 'Sem workflow', description: 'Esta automação não tem workflow associado.', variant: 'destructive' });
      return;
    }

    // If content_pipeline with search_tags, sync tags to pipeline_search_config first
    if (automation.category === 'content_pipeline') {
      const tags = automation.config?.search_tags;
      if (Array.isArray(tags) && tags.length > 0) {
        try {
          if (activeConfig) {
            await updateTags({ id: activeConfig.id, tags: tags as string[] });
          } else {
            await createConfig({ label: automation.name, tags: tags as string[] });
          }
        } catch {
          // non-blocking — proceed with execution even if tag sync fails
        }
      }
    }

    try {
      const result = await executeWorkflow(automation.workflowId);
      toast({
        title: 'Workflow executado',
        description: `${automation.name} disparado com sucesso (${result.method}).`,
      });
    } catch (err: unknown) {
      if (err instanceof CronWorkflowError) {
        const tagsSynced = automation.category === 'content_pipeline' &&
          Array.isArray(automation.config?.search_tags) &&
          (automation.config.search_tags as string[]).length > 0;
        const backendAutoPublish = automation.category === 'content_pipeline'
          && automation.config?.auto_publish === true
          && automation.config?.review_required === false;
        toast({
          title: `${automation.name} — Automático (cron)`,
          description: backendAutoPublish
            ? 'Workflow executa por cron e vai promover automaticamente via Edge Function quando gerar artigos com score suficiente.'
            : tagsSynced
              ? 'Tags sincronizadas. Workflow executa automaticamente por cron. Se quiser promoção sem depender da dashboard, ative auto_publish e desative review_required nesta automação.'
              : 'Este workflow executa automaticamente por cronograma no n8n.',
        });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      // Friendly message for n8n cold-start
      if (/503|Database is not ready|not ready/i.test(msg)) {
        toast({
          title: 'n8n a iniciar (cold start)',
          description: 'A instância n8n no Render está a arrancar. Aguarde 1-2 min e tente novamente, ou ative o pipeline na card acima.',
        });
        return;
      }
      toast({ title: 'Erro na execução', description: msg, variant: 'destructive' });
    }
  };

  const handleUseTemplate = (tpl: AutomationTemplate) => {
    setSelectedTemplate(tpl);
    setEditingAutomation(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAutomation(null);
    setSelectedTemplate(null);
  };

  return (
    <TooltipProvider>
      <div className="space-y-5 sm:space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Connection status */}
            {(() => {
              const isWarming = !isConnected && n8nStatusDetail && /arrancar|tentativa|cold/i.test(n8nStatusDetail);
              return (
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-1 ${
                    isConnected
                      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                      : isWarming
                      ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                      : 'border-red-500/50 text-red-400 bg-red-500/10'
                  }`}
                >
                  {isConnected
                    ? <Wifi className="w-3.5 h-3.5 mr-1.5" />
                    : isWarming
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <WifiOff className="w-3.5 h-3.5 mr-1.5" />}
                  n8n {isConnected ? 'Online' : isWarming ? 'A arrancar…' : 'Offline'}
                </Badge>
              );
            })()}

            {/* Keep-alive toggle */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <Heart className={`w-4 h-4 ${keepAlive.isActive ? 'text-red-400 animate-pulse' : 'text-gray-500'}`} />
              <span className="text-xs text-gray-400 hidden sm:inline">Keep-Alive</span>
              <Switch
                checked={keepAlive.isActive}
                onCheckedChange={(on) => on ? keepAlive.start() : keepAlive.stop()}
                className="scale-[0.85]"
              />
              {keepAlive.isActive && keepAlive.lastPing && (
                <span className="text-[10px] text-gray-500 hidden md:inline">
                  {new Date(keepAlive.lastPing).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  {keepAlive.failCount > 0 && (
                    <span className="text-amber-400 ml-1">({keepAlive.failCount})</span>
                  )}
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 text-gray-400 hover:text-white"
              onClick={() => void refreshN8n()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showLabButton && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 h-9 text-xs px-3"
                onClick={() => navigate('/admin/laboratorio-automacao')}
              >
                <FlaskConical className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Lab n8n</span>
              </Button>
            )}
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 h-9 text-xs px-3"
              onClick={() => {
                setEditingAutomation(null);
                setSelectedTemplate(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nova Automação</span>
            </Button>
          </div>
        </div>

        {/* ── KPI Bar ── */}
        {dashboardErrors.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-sm text-amber-200">
            <div className="mb-2 flex items-center gap-2 font-medium text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              Algumas fontes reais da dashboard falharam
            </div>
            <div className="space-y-1 text-xs text-amber-100/90">
              {dashboardErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          </div>
        )}
        <AutomationKPIBar
          automations={allAutomationsForCounts.automations}
          executions={executions}
          isConnected={isConnected}
          lastSync={lastSync}
          statusDetail={n8nStatusDetail}
          workflows={workflows}
        />

        {/* ── News Pipeline Card ── */}
        <NewsPipelineCard />

        {/* ── Template Gallery ── */}
        <AutomationTemplateGallery
          templates={templates}
          isLoading={loadingTemplates}
          onUseTemplate={handleUseTemplate}
          activeCategory={activeCategory}
        />

        {/* ── Form (create/edit) ── */}
        {showForm && (
          <AutomationForm
            editing={editingAutomation}
            template={selectedTemplate}
            workflows={workflows}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        )}

        {/* ── Main content: Tabs + Cards + Timeline ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Cards (2/3 width on desktop, full on mobile) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0">
            {/* ── Curated Posts Review ── */}
            <CuratedPostsReview />

            <AutomationCategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              counts={counts}
            >
              {automationsError ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-4 text-sm text-red-300">
                  Falha ao carregar automações reais: {automationsError.message}
                </div>
              ) : loadingAutomations ? (
                <div className="text-center py-8 sm:py-12 text-gray-500 text-sm">Carregando automações...</div>
              ) : automations.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 text-xs sm:text-sm mb-3">
                    {activeCategory === 'all'
                      ? 'Nenhuma automação criada ainda.'
                      : `Nenhuma automação em "${CATEGORY_META[activeCategory as AutomationCategory]?.label}".`}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-dashed border-slate-600"
                    onClick={() => setShowForm(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Criar primeira automação
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {automations.map((auto) => (
                    <AutomationCard
                      key={auto.id}
                      automation={auto}
                      onToggle={() => void toggleStatus(auto.id, auto.status)}
                      onEdit={() => handleEdit(auto)}
                      onDelete={() => void handleDelete(auto.id)}
                      onExecute={() => void handleExecute(auto)}
                      onClone={() => handleClone(auto)}
                    />
                  ))}
                </div>
              )}
            </AutomationCategoryTabs>
          </div>

          {/* Execution Timeline + Workflows (1/3 on desktop, full on mobile) */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-5 min-w-0">
            <N8nWorkflowsPanel
              workflows={workflows}
              isConnected={isConnected}
              onRefresh={() => void refreshN8n()}
            />
            <ExecutionTimeline
              executions={executions}
              total={totalExecutions}
              isLoading={loadingExecutions}
              error={executionsError instanceof Error ? executionsError.message : null}
              statusFilter={executionStatusFilter}
              onStatusFilterChange={setExecutionStatusFilter}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
