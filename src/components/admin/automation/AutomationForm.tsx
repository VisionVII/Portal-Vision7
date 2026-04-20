import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  AUTOMATION_CATEGORIES,
  CATEGORY_META,
  TRIGGER_TYPES,
} from '@/types/automation';
import type {
  AutomationCategory,
  TriggerType,
  AutomationV2,
  CreateAutomationPayload,
  AutomationTemplate,
  N8nWorkflow,
} from '@/types/automation';

/* ── Config fields per category ── */
const CATEGORY_FIELDS: Record<AutomationCategory, { key: string; label: string; type: 'text' | 'textarea' | 'list' | 'boolean' | 'number' }[]> = {
  content_pipeline: [
    { key: 'search_tags', label: 'Tags de Pesquisa (n8n busca por estas)', type: 'list' },
    { key: 'rss_feeds', label: 'RSS Feeds (opcional)', type: 'list' },
    { key: 'keywords', label: 'Palavras-chave extra', type: 'list' },
    { key: 'ai_prompt', label: 'Prompt da IA', type: 'textarea' },
    { key: 'target_tone', label: 'Tom/Estilo', type: 'text' },
    { key: 'auto_publish', label: 'Publicar automaticamente', type: 'boolean' },
    { key: 'review_required', label: 'Requer revisão', type: 'boolean' },
  ],
  email_campaigns: [
    { key: 'template_id', label: 'Template de Email', type: 'text' },
    { key: 'recipient_list', label: 'Lista de destinatários', type: 'text' },
    { key: 'subject_template', label: 'Assunto do email', type: 'text' },
    { key: 'schedule_cron', label: 'Expressão Cron', type: 'text' },
    { key: 'throttle_per_hour', label: 'Max envios/hora', type: 'number' },
  ],
  audit_security: [
    { key: 'check_type', label: 'Tipo de verificação', type: 'text' },
    { key: 'alert_channels', label: 'Canais de alerta', type: 'list' },
    { key: 'severity_threshold', label: 'Limiar de severidade', type: 'text' },
    { key: 'retention_days', label: 'Dias de retenção', type: 'number' },
  ],
  process_internal: [
    { key: 'process_type', label: 'Tipo de processo', type: 'text' },
    { key: 'target_tables', label: 'Tabelas alvo', type: 'list' },
    { key: 'retention_policy', label: 'Política de retenção', type: 'text' },
    { key: 'notify_on_complete', label: 'Notificar ao completar', type: 'boolean' },
  ],
  integrations: [
    { key: 'service', label: 'Serviço', type: 'text' },
    { key: 'api_endpoint', label: 'Endpoint API', type: 'text' },
    { key: 'auth_type', label: 'Tipo de autenticação', type: 'text' },
    { key: 'sync_direction', label: 'Direção de sync', type: 'text' },
  ],
};

interface AutomationFormProps {
  editing?: AutomationV2 | null;
  template?: AutomationTemplate | null;
  workflows: N8nWorkflow[];
  onSave: (payload: CreateAutomationPayload) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function AutomationForm({
  editing,
  template,
  workflows,
  onSave,
  onCancel,
  isSaving,
}: AutomationFormProps) {
  const initial = editing
    ? {
        name: editing.name,
        description: editing.description,
        category: editing.category,
        triggerType: editing.triggerType,
        workflowId: editing.workflowId ?? '',
        intervalMinutes: editing.intervalMinutes,
        cronExpression: editing.cronExpression ?? '',
        config: editing.config,
      }
    : template
    ? {
        name: '',
        description: template.description,
        category: template.category,
        triggerType: 'schedule' as TriggerType,
        workflowId: '',
        intervalMinutes: 30,
        cronExpression: '',
        config: template.configPreset,
      }
    : {
        name: '',
        description: '',
        category: 'content_pipeline' as AutomationCategory,
        triggerType: 'schedule' as TriggerType,
        workflowId: '',
        intervalMinutes: 30,
        cronExpression: '',
        config: {} as Record<string, unknown>,
      };

  const [form, setForm] = useState(initial);

  const fields = CATEGORY_FIELDS[form.category] ?? [];

  const updateConfig = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const handleSubmit = async () => {
    await onSave({
      name: form.name,
      description: form.description,
      category: form.category,
      triggerType: form.triggerType,
      workflowId: form.workflowId || null,
      intervalMinutes: form.intervalMinutes,
      cronExpression: form.cronExpression || null,
      config: form.config,
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {editing ? 'Editar Automação' : 'Nova Automação'}
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div>
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Coleta RSS manhã"
            className="mt-1"
          />
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs text-muted-foreground">Descrição</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descreva o que esta automação faz..."
            rows={2}
            className="mt-1"
          />
        </div>

        {/* Category + Trigger */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as AutomationCategory, config: {} })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Trigger</Label>
            <Select
              value={form.triggerType}
              onValueChange={(v) => setForm({ ...form, triggerType: v as TriggerType })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="schedule">⏱ Agendado</SelectItem>
                <SelectItem value="event">⚡ Evento</SelectItem>
                <SelectItem value="manual">👆 Manual</SelectItem>
                <SelectItem value="webhook">🔗 Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Workflow + Interval */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Workflow n8n</Label>
            <Select
              value={form.workflowId || '__none__'}
              onValueChange={(v) => setForm({ ...form, workflowId: v === '__none__' ? '' : v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum (manual)</SelectItem>
                {workflows.map((wf) => (
                  <SelectItem key={String(wf.id)} value={String(wf.id)}>
                    {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              {form.triggerType === 'schedule' ? 'Intervalo (min)' : 'Cron (se aplicável)'}
            </Label>
            {form.triggerType === 'schedule' ? (
              <Input
                type="number"
                min={1}
                value={form.intervalMinutes}
                onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) || 30 })}
                className="mt-1"
              />
            ) : (
              <Input
                value={form.cronExpression}
                onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                placeholder="0 9 * * 1"
                className="mt-1"
              />
            )}
          </div>
        </div>

        {/* Dynamic config fields */}
        {fields.length > 0 && (
          <div className="border-t border-border/50 pt-4 mt-4">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Configuração — {CATEGORY_META[form.category].label}
            </h5>
            <div className="space-y-3">
              {fields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={form.config[field.key]}
                  onChange={(v) => updateConfig(field.key, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!form.name.trim() || isSaving}
          >
            {isSaving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Automação'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Dynamic field renderer ── */
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: { key: string; label: string; type: string };
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === 'text') {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Input
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1"
        />
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Input
          type="number"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1"
        />
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-border"
        />
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
      </div>
    );
  }

  if (field.type === 'list') {
    const items = Array.isArray(value) ? value : [];
    return (
      <div>
        <Label className="text-xs text-gray-500">{field.label}</Label>
        <div className="space-y-1 mt-1">
          {items.map((item: string, i: number) => (
            <div key={i} className="flex gap-1">
              <Input
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className="text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-red-400 shrink-0"
                onClick={() => onChange(items.filter((_: string, j: number) => j !== i))}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-dashed"
            onClick={() => onChange([...items, ''])}
          >
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
