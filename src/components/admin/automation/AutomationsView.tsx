import { useState } from 'react';
import {
  Plus, LayoutGrid, CheckSquare, Play, Pause, Trash2, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

import { AUTOMATION_CATEGORIES, CATEGORY_META } from '@/types/automation';
import type {
  AutomationCategory,
  AutomationV2,
  AutomationTemplate,
  CreateAutomationPayload,
  N8nWorkflow,
} from '@/types/automation';

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

function Ic({ icon: Icon, className = '' }: { icon: React.ElementType; className?: string }) {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${className}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

interface AutomationsViewProps {
  automations: AutomationV2[];
  totalAutomations: number;
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
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as AutomationCategory | 'all')}>
          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {AUTOMATION_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{CATEGORY_META[cat]?.label || cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 text-xs" onClick={() => { setShowForm(true); }}>
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
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={toggleSelectAll}>
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedIds.size === automations.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">{selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}</span>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={bulkBusy} onClick={() => handleBulkAction('activate')}>
                  <Play className="h-3 w-3" />Ativar
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={bulkBusy} onClick={() => handleBulkAction('pause')}>
                  <Pause className="h-3 w-3" />Pausar
                </Button>
                <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" disabled={bulkBusy} onClick={() => handleBulkAction('delete')}>
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
  );
}
