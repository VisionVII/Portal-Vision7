import { useState } from 'react';
import { Clock, Shield, Settings2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExecutionTimeline } from './ExecutionTimeline';
import { AuditLogViewer } from './AuditLogViewer';
import { NewsPipelineCard } from './NewsPipelineCard';

import type { AutomationExecution, ExecutionStatus } from '@/types/automation';

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

interface LogsViewProps {
  executions: AutomationExecution[];
  totalExecutions: number;
  loadingExecutions: boolean;
  executionStatusFilter: ExecutionStatus | 'all';
  setExecutionStatusFilter: (value: ExecutionStatus | 'all') => void;
}

export function LogsView({
  executions,
  totalExecutions,
  loadingExecutions,
  executionStatusFilter,
  setExecutionStatusFilter,
}: LogsViewProps) {
  return (
    <div className="space-y-5">
      <Section
        title="Execuções recentes"
        description="Histórico operacional do pipeline e das automações"
        icon={<Ic icon={Clock} className="text-amber-500 bg-amber-500/10" />}
        actions={
          <Select value={executionStatusFilter} onValueChange={(v) => setExecutionStatusFilter(v as ExecutionStatus | 'all')}>
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

      <Section
        title="Audit Log"
        description="Histórico de alterações com diff de campos"
        icon={<Ic icon={Shield} className="text-purple-500 bg-purple-500/10" />}
        collapsible
        defaultExpanded={false}
      >
        <AuditLogViewer />
      </Section>

      <Section
        title="Detalhe técnico"
        description="Configuração avançada do pipeline e logs internos"
        icon={<Ic icon={Settings2} className="text-muted-foreground bg-muted" />}
        collapsible
        defaultExpanded={false}
      >
        <NewsPipelineCard />
      </Section>
    </div>
  );
}
