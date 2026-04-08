import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, FlaskConical, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

import { AutomationKPIBar } from './AutomationKPIBar';
import { AutomationCategoryTabs } from './AutomationCategoryTabs';
import { AutomationCard } from './AutomationCard';
import { AutomationForm } from './AutomationForm';
import { AutomationTemplateGallery } from './AutomationTemplateGallery';
import { ExecutionTimeline } from './ExecutionTimeline';

import { useAutomationsV2 } from '@/hooks/useAutomationsV2';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { useAutomationTemplates } from '@/hooks/useAutomationTemplates';

import { checkN8nHealth, getWorkflows, executeWorkflow } from '@/services/n8n';

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
  showCredentialButton?: boolean;
}

export function AutomationDashboard({
  showLabButton = true,
  showCredentialButton = true,
}: AutomationDashboardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ── n8n state ── */
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
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
    total: totalAutomations,
    isLoading: loadingAutomations,
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
  } = useAutomationExecutions({
    status: executionStatusFilter || undefined,
  });

  const {
    templates,
    isLoading: loadingTemplates,
  } = useAutomationTemplates(activeCategory !== 'all' ? activeCategory : undefined);

  /* ── n8n health + workflow fetch ── */
  const refreshN8n = useCallback(async () => {
    try {
      const health = await checkN8nHealth();
      setIsConnected(health.status === 'connected');
      if (health.status === 'connected') {
        const wfs = await getWorkflows();
        setWorkflows(wfs);
      }
      setLastSync(new Date().toISOString());
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    void refreshN8n();
    const interval = setInterval(() => void refreshN8n(), 30_000);
    return () => clearInterval(interval);
  }, [refreshN8n]);

  /* ── Category counts ── */
  const allAutomationsForCounts = useAutomationsV2({});
  const counts: Record<AutomationCategory | 'all', number> = {
    all: allAutomationsForCounts.total,
    ...Object.fromEntries(
      AUTOMATION_CATEGORIES.map((c) => [
        c,
        allAutomationsForCounts.automations.filter((a) => a.category === c).length,
      ])
    ),
  } as Record<AutomationCategory | 'all', number>;

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
      await executeWorkflow(automation.workflowId);
      toast({ title: 'Workflow executado', description: `${automation.name} disparado com sucesso.` });
    } catch (err: unknown) {
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

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Motor de Automações</h2>
            <p className="text-sm text-gray-400">
              Gerir automações do portal: conteúdo, emails, auditoria, processos e integrações.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 h-8"
              onClick={() => void refreshN8n()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Sync
            </Button>
            {showCredentialButton && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 h-8"
                onClick={() => navigate('/admin/automacao-legacy')}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1" />
                Chaves
              </Button>
            )}
            {showLabButton && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 h-8"
                onClick={() => navigate('/admin/laboratorio-automacao')}
              >
                <FlaskConical className="w-3.5 h-3.5 mr-1" />
                Lab n8n
              </Button>
            )}
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 h-8"
              onClick={() => {
                setEditingAutomation(null);
                setSelectedTemplate(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nova Automação
            </Button>
          </div>
        </div>

        {/* ── KPI Bar ── */}
        <AutomationKPIBar
          automations={allAutomationsForCounts.automations}
          executions={executions}
          isConnected={isConnected}
          lastSync={lastSync}
        />

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Cards (3/5 width on desktop) */}
          <div className="lg:col-span-3">
            <AutomationCategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              counts={counts}
            >
              {loadingAutomations ? (
                <div className="text-center py-12 text-gray-500 text-sm">Carregando automações...</div>
              ) : automations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm mb-3">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          {/* Execution Timeline (2/5 width) */}
          <div className="lg:col-span-2">
            <ExecutionTimeline
              executions={executions}
              total={totalExecutions}
              isLoading={loadingExecutions}
              statusFilter={executionStatusFilter}
              onStatusFilterChange={setExecutionStatusFilter}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
