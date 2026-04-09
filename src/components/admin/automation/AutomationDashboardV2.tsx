import { useState, useMemo } from 'react';
import {
  LayoutGrid, Plus, TrendingUp, Activity, Clock, Zap,
  PlayCircle, PauseCircle, Settings2, Filter, Calendar,
  BarChart3, Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardSection, SectionIcon } from '@/components/ui/dashboard-section';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AutomationKPIBar } from './AutomationKPIBar';
import { AutomationCard } from './AutomationCard';
import { AutomationForm } from './AutomationForm';
import { AutomationTemplateGallery } from './AutomationTemplateGallery';
import { ExecutionTimeline } from './ExecutionTimeline';
import { NewsPipelineCard } from './NewsPipelineCard';
import { CuratedPostsReview } from './CuratedPostsReview';
import { N8nWorkflowsPanel } from './N8nWorkflowsPanel';
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
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface AutomationDashboardV2Props {
  showLabButton?: boolean;
}

type DashboardView = 'overview' | 'automations' | 'analytics' | 'ads';

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
  } = useAutomationsV2(
    activeCategory !== 'all' ? { category: activeCategory } : {}
  );

  const {
    executions,
    total: totalExecutions,
    isLoading: loadingExecutions,
  } = useAutomationExecutions({
    status: executionStatusFilter === 'all' ? undefined : executionStatusFilter,
  });

  const {
    templates,
    isLoading: loadingTemplates,
  } = useAutomationTemplates(activeCategory !== 'all' ? activeCategory : undefined);

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
        if (wfs) {
          setWorkflows(wfs);
          setIsConnected(true);
          setN8nStatusDetail(null);
        }
      } else {
        setIsConnected(false);
        setWorkflows([]);
        setN8nStatusDetail(health.detail ?? 'n8n offline');
      }
      setLastSync(new Date().toISOString());
    } catch (error) {
      setIsConnected(false);
      setWorkflows([]);
      setN8nStatusDetail(error instanceof Error ? error.message : 'Erro ao conectar');
      setLastSync(new Date().toISOString());
    } finally {
      refreshingRef.current = false;
    }
  }, [tryLoadWorkflows]);

  useEffect(() => {
    void refreshN8n();
  }, [refreshN8n]);

  /* ── Counts ── */
  const allAutomationsForCounts = useAutomationsV2({ pageSize: 1000 });
  const counts: Record<AutomationCategory | 'all', number> = useMemo(() => ({
    all: allAutomationsForCounts.total,
    ...Object.fromEntries(
      AUTOMATION_CATEGORIES.map((c) => [
        c,
        allAutomationsForCounts.automations.filter((a) => a.category === c).length,
      ])
    ),
  }), [allAutomationsForCounts.automations, allAutomationsForCounts.total]);

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

    try {
      const result = await executeWorkflow(automation.workflowId);
      toast({
        title: 'Workflow executado',
        description: `${automation.name} disparado com sucesso (${result.method}).`,
      });
    } catch (err: unknown) {
      if (err instanceof CronWorkflowError) {
        toast({
          title: `${automation.name} — Automático (cron)`,
          description: 'Este workflow executa automaticamente por cronograma no n8n.',
        });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
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

  // Stats calculations
  const activeAutomations = automations.filter(a => a.status === 'active').length;
  const recentExecutions = executions.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Premium Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <SectionIcon icon={Workflow} variant="primary" size="lg" />
                Automação & Workflows
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie automações, monitore execuções e analise performance
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* N8n Status */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm font-medium">
                  n8n {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Keep-Alive */}
              <Button
                variant={keepAlive.isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => keepAlive.isActive ? keepAlive.stop() : keepAlive.start()}
                className={keepAlive.isActive ? 'bg-gradient-to-r from-primary-600 to-primary-700' : ''}
              >
                <Zap className={`w-4 h-4 mr-2 ${keepAlive.isActive ? 'animate-pulse' : ''}`} />
                Keep-Alive {keepAlive.isActive ? 'ON' : 'OFF'}
              </Button>

              <Button
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
                onClick={() => {
                  setEditingAutomation(null);
                  setSelectedTemplate(null);
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Automação
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as DashboardView)}>
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="overview" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="automations" className="gap-2">
                  <Workflow className="w-4 h-4" />
                  Automações
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="ads" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Anúncios
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Automações</p>
                      <p className="text-4xl font-bold text-foreground mt-2">{counts.all}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeAutomations} ativas
                      </p>
                    </div>
                    <SectionIcon icon={Workflow} variant="primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Execuções (24h)</p>
                      <p className="text-4xl font-bold text-foreground mt-2">{totalExecutions}</p>
                      <p className="text-xs text-success mt-1">
                        {recentExecutions.filter(e => e.status === 'success').length} bem-sucedidas
                      </p>
                    </div>
                    <SectionIcon icon={PlayCircle} variant="success" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary-500/10 to-secondary-600/5 border-secondary-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                      <p className="text-4xl font-bold text-foreground mt-2">
                        {totalExecutions > 0 
                          ? Math.round((executions.filter(e => e.status === 'success').length / totalExecutions) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Últimas 100 execuções
                      </p>
                    </div>
                    <SectionIcon icon={TrendingUp} variant="secondary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent-500/10 to-accent-600/5 border-accent-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Workflows n8n</p>
                      <p className="text-4xl font-bold text-foreground mt-2">{workflows.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {workflows.filter(w => w.active).length} ativos
                      </p>
                    </div>
                    <SectionIcon icon={Zap} variant="accent" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline de Notícias - Dobra 1 */}
            <DashboardSection
              title="Pipeline de Notícias IA"
              description="Geração automática de conteúdo via workflows n8n"
              icon={<SectionIcon icon={Zap} variant="primary" />}
              variant="gradient"
              collapsible
              defaultExpanded
            >
              <NewsPipelineCard />
            </DashboardSection>

            {/* Curated Posts Review - Dobra 2 */}
            <DashboardSection
              title="Curadoria de Artigos"
              description="Revisão e aprovação de posts gerados pela IA"
              icon={<SectionIcon icon={Activity} variant="secondary" />}
              variant="bordered"
              collapsible
              defaultExpanded
            >
              <CuratedPostsReview />
            </DashboardSection>

            {/* Workflows & Executions - Dobra 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardSection
                title="Workflows n8n"
                description="Workflows ativos e inativos no n8n"
                icon={<SectionIcon icon={Settings2} variant="accent" size="sm" />}
                variant="default"
                actions={
                  <Button variant="ghost" size="sm" onClick={() => void refreshN8n()}>
                    Atualizar
                  </Button>
                }
              >
                <N8nWorkflowsPanel
                  workflows={workflows}
                  isConnected={isConnected}
                  onRefresh={() => void refreshN8n()}
                />
              </DashboardSection>

              <DashboardSection
                title="Execuções Recentes"
                description="Histórico de execuções de workflows"
                icon={<SectionIcon icon={Clock} variant="primary" size="sm" />}
                variant="default"
                actions={
                  <Select value={executionStatusFilter} onValueChange={(v) => setExecutionStatusFilter(v as typeof executionStatusFilter)}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
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
              </DashboardSection>
            </div>
          </div>
        )}

        {/* Automations Tab */}
        {activeView === 'automations' && (
          <div className="space-y-8">
            {/* Templates Gallery */}
            <DashboardSection
              title="Galeria de Templates"
              description="Templates pré-configurados para criar automações rapidamente"
              icon={<SectionIcon icon={LayoutGrid} variant="secondary" />}
              variant="gradient"
              collapsible
            >
              <AutomationTemplateGallery
                templates={templates}
                isLoading={loadingTemplates}
                onUseTemplate={handleUseTemplate}
                activeCategory={activeCategory}
              />
            </DashboardSection>

            {/* Form */}
            {showForm && (
              <DashboardSection
                title={editingAutomation ? 'Editar Automação' : 'Nova Automação'}
                icon={<SectionIcon icon={Plus} variant="primary" />}
                variant="bordered"
              >
                <AutomationForm
                  editing={editingAutomation}
                  template={selectedTemplate}
                  workflows={workflows}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaving={isSaving}
                />
              </DashboardSection>
            )}

            {/* Automations List */}
            <DashboardSection
              title="Minhas Automações"
              description={`${activeAutomations} de ${counts.all} automações ativas`}
              icon={<SectionIcon icon={Workflow} variant="primary" />}
              variant="default"
              actions={
                <div className="flex items-center gap-2">
                  <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
                    <SelectTrigger className="w-48 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      {AUTOMATION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_META[cat]?.label || cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            >
              {loadingAutomations ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando automações...
                </div>
              ) : automations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    Nenhuma automação encontrada
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Automação
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            </DashboardSection>
          </div>
        )}

        {/* Analytics Tab */}
        {activeView === 'analytics' && (
          <div className="space-y-8">
            <DashboardSection
              title="Performance & KPIs"
              description="Métricas detalhadas de automações e execuções"
              icon={<SectionIcon icon={BarChart3} variant="accent" />}
              variant="gradient"
            >
              <AutomationKPIBar
                automations={allAutomationsForCounts.automations}
                executions={executions}
                isConnected={isConnected}
                lastSync={lastSync}
                statusDetail={n8nStatusDetail}
                workflows={workflows}
              />
            </DashboardSection>
          </div>
        )}

        {/* Ads Tab */}
        {activeView === 'ads' && (
          <AdsSection />
        )}
      </div>
    </div>
  );
}
