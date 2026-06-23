import {
  Plus, LayoutGrid, CheckSquare, Play, Pause, Trash2, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Section, SectionIcon } from './Section';
import { AutomationCard } from './AutomationCard';
import { AutomationForm } from './AutomationForm';
import { AutomationTemplateGallery } from './AutomationTemplateGallery';

import { AUTOMATION_CATEGORIES, CATEGORY_META } from '@/types/automation';
import type {
  AutomationCategory,
  AutomationV2,
  AutomationTemplate,
  CreateAutomationPayload,
  N8nWorkflow,
} from '@/types/automation';

interface AutomationsViewProps {
  automations: AutomationV2[];
  totalAutomations: number;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  loadingAutomations: boolean;
  activeCategory: AutomationCategory | 'all';
  setActiveCategory: (value: AutomationCategory | 'all') => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingAutomation: AutomationV2 | null;
  setEditingAutomation: (automation: AutomationV2 | null) => void;
  selectedTemplate: AutomationTemplate | null;
  setSelectedTemplate: (template: AutomationTemplate | null) => void;
  templates: AutomationTemplate[];
  loadingTemplates: boolean;
  workflows: N8nWorkflow[];
  isSaving: boolean;
  selectedIds: Set<string>;
  bulkBusy: boolean;
  toggleSelect: (id: string, checked: boolean) => void;
  toggleSelectAll: () => void;
  handleBulkAction: (action: 'activate' | 'pause' | 'delete') => void;
  handleSave: (payload: CreateAutomationPayload) => void;
  handleEdit: (a: AutomationV2) => void;
  handleClone: (a: AutomationV2) => void;
  handleDelete: (id: string) => void;
  handleExecute: (a: AutomationV2) => void;
  handleUseTemplate: (tpl: AutomationTemplate) => void;
  handleCancel: () => void;
  toggleStatus: (id: string, status: AutomationV2['status']) => void;
}

export function AutomationsView({
  automations,
  totalAutomations,
  page,
  pageSize,
  setPage,
  loadingAutomations,
  activeCategory,
  setActiveCategory,
  showForm,
  setShowForm,
  editingAutomation,
  selectedTemplate,
  templates,
  loadingTemplates,
  workflows,
  isSaving,
  selectedIds,
  bulkBusy,
  toggleSelect,
  toggleSelectAll,
  handleBulkAction,
  handleSave,
  handleEdit,
  handleClone,
  handleDelete,
  handleExecute,
  handleUseTemplate,
  handleCancel,
  toggleStatus,
}: AutomationsViewProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as AutomationCategory | 'all')}>
          <SelectTrigger className="h-8 w-44 text-xs">
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
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova Automação
        </Button>
      </div>

      {/* Form (inline, collapsible) */}
      {showForm && (
        <Section
          title={editingAutomation ? 'Editar Automação' : 'Nova Automação'}
          icon={<SectionIcon icon={Plus} className="bg-primary/10 text-primary" />}
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

      {/* Template gallery — hidden by default */}
      <Section
        title="Galeria de Templates"
        description="Templates pré-configurados para criar automações rapidamente"
        icon={<SectionIcon icon={LayoutGrid} className="bg-blue-500/10 text-blue-500" />}
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

      {/* Automations list */}
      {loadingAutomations ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          A carregar automações…
        </div>
      ) : automations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Nenhuma automação configurada</p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Criar Primeira Automação
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bulk action bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={toggleSelectAll}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedIds.size === automations.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={bulkBusy}
                    onClick={() => handleBulkAction('activate')}
                  >
                    <Play className="h-3 w-3" />
                    Ativar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={bulkBusy}
                    onClick={() => handleBulkAction('pause')}
                  >
                    <Pause className="h-3 w-3" />
                    Pausar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={bulkBusy}
                    onClick={() => handleBulkAction('delete')}
                  >
                    {bulkBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Remover
                  </Button>
                </div>
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

          {totalAutomations > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalAutomations)} de {totalAutomations}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={page * pageSize >= totalAutomations}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
