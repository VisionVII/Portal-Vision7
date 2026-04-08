/* ─────────────── Automation Engine v2 — Types ─────────────── */

/* ── Categories ── */
export const AUTOMATION_CATEGORIES = [
  'content_pipeline',
  'email_campaigns',
  'audit_security',
  'process_internal',
  'integrations',
] as const;

export type AutomationCategory = (typeof AUTOMATION_CATEGORIES)[number];

export const CATEGORY_META: Record<
  AutomationCategory,
  { label: string; icon: string; color: string }
> = {
  content_pipeline: { label: 'Pipeline de Conteúdo', icon: 'Newspaper', color: 'cyan' },
  email_campaigns: { label: 'Email & Notificações', icon: 'Mail', color: 'violet' },
  audit_security: { label: 'Auditoria & Segurança', icon: 'Shield', color: 'amber' },
  process_internal: { label: 'Processos Internos', icon: 'Cog', color: 'slate' },
  integrations: { label: 'Integrações Externas', icon: 'Plug', color: 'emerald' },
};

/* ── Trigger types ── */
export const TRIGGER_TYPES = ['schedule', 'event', 'manual', 'webhook'] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

/* ── Automation status ── */
export const AUTOMATION_STATUSES = ['draft', 'active', 'paused', 'error', 'archived'] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

/* ── Execution status ── */
export const EXECUTION_STATUSES = [
  'pending',
  'running',
  'success',
  'error',
  'warning',
  'cancelled',
] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

/* ── Main automation record ── */
export interface AutomationV2 {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  triggerType: TriggerType;
  workflowId: string | null;
  status: AutomationStatus;
  intervalMinutes: number;
  cronExpression: string | null;
  config: Record<string, unknown>;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  nextRunAt: string | null;
  runCount: number;
  errorCount: number;
  successRate: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Execution record ── */
export interface ExecutionStep {
  name: string;
  status: 'success' | 'error' | 'skipped' | 'running';
  durationMs: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface AutomationExecution {
  id: string;
  automationId: string;
  n8nExecutionId: string | null;
  status: ExecutionStatus;
  triggerMode: 'scheduled' | 'manual' | 'webhook' | 'event';
  triggeredBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  steps: ExecutionStep[];
  errorMessage: string | null;
  errorDetail: Record<string, unknown> | null;
  itemsProcessed: number;
  itemsCreated: number;
  metadata: Record<string, unknown>;
}

/* ── Template ── */
export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  icon: string | null;
  configPreset: Record<string, unknown>;
  workflowJson: Record<string, unknown> | null;
  isSystem: boolean;
  popularity: number;
  createdAt: string;
}

/* ── Audit log entry ── */
export interface AutomationAuditEntry {
  id: number;
  automationId: string | null;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

/* ── Dashboard stats ── */
export interface AutomationStats {
  totalAutomations: number;
  activeAutomations: number;
  executionsToday: number;
  successRate: number;
  nextExecution: string | null;
  byCategory: Record<AutomationCategory, { total: number; active: number }>;
}

/* ── Form payloads ── */
export type CreateAutomationPayload = Pick<
  AutomationV2,
  'name' | 'description' | 'category' | 'triggerType' | 'workflowId' | 'intervalMinutes' | 'cronExpression' | 'config'
>;

export type UpdateAutomationPayload = Partial<CreateAutomationPayload> & {
  status?: AutomationStatus;
};

/* ── n8n API types (used by n8n.ts service) ── */
export type N8nWorkflow = {
  id: string | number;
  name: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags?: Array<{ id?: string; name?: string }>;
  [key: string]: unknown;
};

export type N8nExecution = {
  id: string | number;
  workflowId?: string | number;
  status?: 'success' | 'error' | 'running' | string;
  mode?: string;
  startedAt?: string;
  stoppedAt?: string;
  finished?: boolean;
  data?: unknown;
  payload?: unknown;
  [key: string]: unknown;
};
