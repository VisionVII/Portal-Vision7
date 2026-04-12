import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LayoutGrid, Plus, Clock, Zap,
  PlayCircle, Settings2,
  Workflow, RefreshCw, Wrench,
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

interface AutomationDashboardV2Props {
  showLabButton?: boolean;
}

type DashboardView = 'pipeline' | 'automations' | 'tools';

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

  /* ── State ── */
  const [activeView, setActiveView] = useState<DashboardView>('pipeline');
  const [activeCategory, setActiveCategory] = useState<AutomationCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationV2 | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatus | 'all'>('all');

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
    isSaving,
  } = useAutomationsV2(activeCategory !== 'all' ? { category: activeCategory } : { pageSize: 100 });

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

  const refreshN8n = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const health = await checkN8nHealth();
      if (health.status === 'connected') {
        try {
          const raw = await getWorkflows();
          setWorkflows(deduplicateN8nWorkflows(raw));
          setIsConnected(true);
        } catch {
          setIsConnected(true);
        }
      } else {
        setIsConnected(false);
        setWorkflows([]);
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
    if (totalExecutions === 0) return 0;
    return Math.round((executions.filter((e) => e.status === 'success').length / totalExecutions) * 100);
  }, [executions, totalExecutions]);

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

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Automação</h1>
          <p className="text-sm text-muted-foreground">Pipeline editorial IA e orquestração n8n</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
            n8n {isConnected ? 'Online' : 'Offline'}
          </div>
          <Button
            variant={keepAlive.isActive ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => keepAlive.isActive ? keepAlive.stop() : keepAlive.start()}
          >
            <Zap className={`h-3 w-3 mr-1 ${keepAlive.isActive ? 'animate-pulse' : ''}`} />
            Keep-Alive
          </Button>
        </div>
      </div>

      {/* ═══ KPI Strip ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Workflows', value: `${activeWorkflows}/${workflows.length}`, accent: 'text-primary' },
          { label: 'Automações', value: `${activeAutomations} ativas`, accent: 'text-blue-500' },
          { label: 'Exec. 24h', value: totalExecutions, accent: 'text-amber-500' },
          { label: 'Sucesso', value: `${successRate}%`, accent: 'text-green-500' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.accent}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ═══ Navigation ═══ */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as DashboardView)}>
        <TabsList className="h-9 bg-muted/50">
          <TabsTrigger value="pipeline" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Pipeline IA</TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5 text-xs"><Workflow className="h-3.5 w-3.5" />Automações</TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" />Ferramentas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ═══ PIPELINE IA TAB ═══ */}
      {activeView === 'pipeline' && (
        <div className="space-y-5">
          <Section
            title="Pipeline de Notícias"
            description="Coleta, curadoria e geração IA de conteúdo"
            icon={<Ic icon={Zap} className="text-primary bg-primary/10" />}
            collapsible
            defaultExpanded
          >
            <NewsPipelineCard />
          </Section>

          <Section
            title="Artigos Curados"
            description="Revisão e aprovação de posts gerados pela IA"
            icon={<Ic icon={PlayCircle} className="text-blue-500 bg-blue-500/10" />}
            collapsible
            defaultExpanded
          >
            <CuratedPostsReview />
          </Section>

          <Section
            title="Execuções Recentes"
            description="Histórico de execuções"
            icon={<Ic icon={Clock} className="text-amber-500 bg-amber-500/10" />}
            collapsible
            defaultExpanded={false}
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
      )}

      {/* ═══ AUTOMATIONS TAB ═══ */}
      {activeView === 'automations' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
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
              <Plus className="h-3.5 w-3.5 mr-1.5" />Nova Automação
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
        </div>
      )}

      {/* ═══ TOOLS TAB ═══ */}
      {activeView === 'tools' && (
        <div className="space-y-5">
          <Section
            title="Workflows n8n"
            description={`${activeWorkflows}/${workflows.length} ativos`}
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
            title="Email Templates (Dev)"
            description="Envio de templates para revisão"
            icon={<Ic icon={Wrench} className="text-muted-foreground bg-muted" />}
            collapsible
            defaultExpanded={false}
          >
            <EmailTemplateCampaignPanel />
          </Section>
        </div>
      )}
    </div>
  );
}
