import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LayoutGrid, Plus, TrendingUp, Activity, Clock, Zap,
  PlayCircle, Settings2,
  BarChart3, Workflow, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { NewsPipelineCard } from './NewsPipelineCard';
import { CuratedPostsReview } from './CuratedPostsReview';
import { N8nWorkflowsPanel } from './N8nWorkflowsPanel';
import { EmailTemplateCampaignPanel } from './EmailTemplateCampaignPanel';
import { AdsSection } from '@/components/admin/ad-manager';

import { useAutomationsV2 } from '@/hooks/useAutomationsV2';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { useAutomationTemplates } from '@/hooks/useAutomationTemplates';
import { useN8nKeepAlive } from '@/hooks/useN8nKeepAlive';
import { useToast } from '@/hooks/use-toast';

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
import { useNavigate } from 'react-router-dom';

interface AutomationDashboardV2Props {
  showLabButton?: boolean;
}

type DashboardView = 'overview' | 'automations' | 'analytics' | 'ads';

/* ─── Collapsible Section (flat div, no Card nesting) ─── */
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
    <section className="space-y-4 border-l-2 border-primary/20 pl-4 sm:pl-6">
      <div
        className={`flex items-center justify-between gap-3 ${collapsible ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {collapsible && (
            <svg className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          )}
        </div>
      </div>
      {open && <div className="border-t border-border/30 pt-4">{children}</div>}
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

export function AutomationDashboardV2({
  showLabButton = true,
}: AutomationDashboardV2Props) {
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ── State ── */
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [activeCategory, setActiveCategory] = useState<AutomationCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationV2 | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatus | 'all'>('all');

  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [n8nStatusDetail, setN8nStatusDetail] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);

  /* ── Hooks ── */
  const {
    automations,
    isLoading: loadingAutomations,
    error: automationsError,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleStatus,
    isSaving,
  } = useAutomationsV2(activeCategory !== 'all' ? { category: activeCategory } : {});

  const {
    executions,
    total: totalExecutions,
    isLoading: loadingExecutions,
  } = useAutomationExecutions({
    status: executionStatusFilter === 'all' ? undefined : executionStatusFilter,
  });

  const { templates, isLoading: loadingTemplates } = useAutomationTemplates(
    activeCategory !== 'all' ? activeCategory : undefined
  );

  const keepAlive = useN8nKeepAlive();
  const refreshingRef = useRef(false);

  const tryLoadWorkflows = useCallback(async (): Promise<N8nWorkflow[] | null> => {
    try {
      const raw = await getWorkflows();
      return deduplicateN8nWorkflows(raw);
    } catch {
      return null;
    }
  }, []);

  const refreshN8n = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const health = await checkN8nHealth();
      if (health.status === 'connected') {
        const wfs = await tryLoadWorkflows();
        if (wfs) { setWorkflows(wfs); setIsConnected(true); setN8nStatusDetail(null); }
      } else {
        setIsConnected(false); setWorkflows([]); setN8nStatusDetail(health.detail ?? 'n8n offline');
      }
      setLastSync(new Date().toISOString());
    } catch (error) {
      setIsConnected(false); setWorkflows([]);
      setN8nStatusDetail(error instanceof Error ? error.message : 'Erro ao conectar');
      setLastSync(new Date().toISOString());
    } finally {
      refreshingRef.current = false;
    }
  }, [tryLoadWorkflows]);

  useEffect(() => { void refreshN8n(); }, [refreshN8n]);

  /* ── Counts ── */
  const allAutomationsForCounts = useAutomationsV2({ pageSize: 1000 });
  const counts = useMemo(() => ({
    all: allAutomationsForCounts.total,
    ...Object.fromEntries(AUTOMATION_CATEGORIES.map((c) => [c, allAutomationsForCounts.automations.filter((a) => a.category === c).length])),
  }), [allAutomationsForCounts.automations, allAutomationsForCounts.total]) as Record<AutomationCategory | 'all', number>;

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

  const activeAutomations = automations.filter((a) => a.status === 'active').length;
  const recentExecutions = executions.slice(0, 5);
  const successCount = recentExecutions.filter((e) => e.status === 'success').length;
  const successRate = totalExecutions > 0
    ? Math.round((executions.filter((e) => e.status === 'success').length / totalExecutions) * 100)
    : 0;

  return (
    <div className="space-y-7">
      {/* ═══ Header ═══ */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-white via-blue-50/70 to-white p-5 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Automacao & Workflows</h1>
            <p className="text-sm text-muted-foreground">Operacao editorial, orquestracao n8n e validacao de comunicacoes do portal</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-white/70 px-3 py-1.5 text-xs font-medium dark:bg-slate-900/40">
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-primary' : 'bg-destructive'}`} />
              n8n {isConnected ? 'Online' : 'Offline'}
            </div>
            <Button
              variant={keepAlive.isActive ? 'default' : 'outline'}
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={() => keepAlive.isActive ? keepAlive.stop() : keepAlive.start()}
            >
              <Zap className={`h-3.5 w-3.5 mr-1.5 ${keepAlive.isActive ? 'animate-pulse' : ''}`} />
              Keep-Alive {keepAlive.isActive ? 'ON' : 'OFF'}
            </Button>
            <Button size="sm" className="h-8 rounded-lg text-xs" onClick={() => { setEditingAutomation(null); setSelectedTemplate(null); setShowForm(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nova Automacao
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Navigation ═══ */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as DashboardView)}>
        <TabsList className="h-9 bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutGrid className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5 text-xs"><Workflow className="h-3.5 w-3.5" />Automações</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5 text-xs"><TrendingUp className="h-3.5 w-3.5" />Anúncios</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeView === 'overview' && (
        <div className="space-y-5">
          {/* KPI Row - open layout */}
          <div className="grid gap-2">
            {[
              { label: 'Total Automações', value: counts.all, sub: `${activeAutomations} ativas`, icon: Workflow, accent: 'text-primary bg-primary/10' },
              { label: 'Execuções (24h)', value: totalExecutions, sub: `${successCount} bem-sucedidas`, icon: PlayCircle, accent: 'text-blue-500 bg-blue-500/10' },
              { label: 'Taxa de Sucesso', value: `${successRate}%`, sub: 'Últimas 100 execuções', icon: TrendingUp, accent: 'text-violet-500 bg-violet-500/10' },
              { label: 'Workflows n8n', value: workflows.length, sub: `${workflows.filter((w) => w.active).length} ativos`, icon: Zap, accent: 'text-amber-500 bg-amber-500/10' },
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-center justify-between border-b border-border/35 py-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                </div>
                <Ic icon={kpi.icon} className={kpi.accent} />
              </div>
            ))}
          </div>

          <EmailTemplateCampaignPanel />

          {/* Pipeline de Notícias IA */}
          <Section
            title="Pipeline de Notícias IA"
            description="Geração automática de conteúdo via workflows n8n"
            icon={<Ic icon={Zap} className="text-primary bg-primary/10" />}
            collapsible
            defaultExpanded
          >
            <NewsPipelineCard />
          </Section>

          {/* Curadoria de Artigos */}
          <Section
            title="Curadoria de Artigos"
            description="Revisão e aprovação de posts gerados pela IA"
            icon={<Ic icon={Activity} className="text-violet-500 bg-violet-500/10" />}
            collapsible
            defaultExpanded
          >
            <CuratedPostsReview />
          </Section>

          {/* Workflows & Executions */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Section
              title="Workflows n8n"
              description={`${workflows.filter((w) => w.active).length}/${workflows.length} ativos`}
              icon={<Ic icon={Settings2} className="text-amber-500 bg-amber-500/10" />}
              actions={
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void refreshN8n()}>
                  <RefreshCw className="h-3 w-3 mr-1" />Atualizar
                </Button>
              }
            >
              <N8nWorkflowsPanel workflows={workflows} isConnected={isConnected} onRefresh={() => void refreshN8n()} />
            </Section>

            <Section
              title="Execuções Recentes"
              description="Histórico de execuções de workflows"
              icon={<Ic icon={Clock} className="text-blue-500 bg-blue-500/10" />}
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
          </div>
        </div>
      )}

      {/* ═══ AUTOMATIONS TAB ═══ */}
      {activeView === 'automations' && (
        <div className="space-y-5">
          <Section
            title="Galeria de Templates"
            description="Templates pré-configurados para criar automações rapidamente"
            icon={<Ic icon={LayoutGrid} className="text-violet-500 bg-violet-500/10" />}
            collapsible
          >
            <AutomationTemplateGallery
              templates={templates}
              isLoading={loadingTemplates}
              onUseTemplate={handleUseTemplate}
              activeCategory={activeCategory}
            />
          </Section>

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
            title="Minhas Automações"
            description={`${activeAutomations} de ${counts.all} automações ativas`}
            icon={<Ic icon={Workflow} className="text-primary bg-primary/10" />}
            actions={
              <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {AUTOMATION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_META[cat]?.label || cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
            {loadingAutomations ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando automações...</div>
            ) : automations.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">Nenhuma automação encontrada</p>
                <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Criar Primeira Automação</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          </Section>
        </div>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {activeView === 'analytics' && (
        <Section
          title="Performance & KPIs"
          description="Métricas detalhadas de automações e execuções"
          icon={<Ic icon={BarChart3} className="text-amber-500 bg-amber-500/10" />}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Automações', value: `${activeAutomations} ativas`, icon: Zap, accent: 'text-primary' },
              { label: 'Pipeline n8n', value: `${workflows.filter((w) => /WF-0[1-3]/i.test(w.name ?? '')).filter((w) => w.active).length}/${workflows.filter((w) => /WF-0[1-3]/i.test(w.name ?? '')).length}`, icon: Workflow, accent: 'text-blue-500' },
              { label: 'Exec. Hoje', value: String(executions.filter((e) => e.startedAt?.startsWith(new Date().toISOString().slice(0, 10))).length), icon: PlayCircle, accent: 'text-violet-500' },
              { label: 'Taxa Sucesso', value: `${successRate}%`, icon: TrendingUp, accent: 'text-amber-500' },
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/30 p-3">
                <kpi.icon className={`h-5 w-5 shrink-0 ${kpi.accent}`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{kpi.value}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ═══ ADS TAB ═══ */}
      {activeView === 'ads' && <AdsSection />}
    </div>
  );
}
