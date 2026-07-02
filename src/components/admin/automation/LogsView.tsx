import { Clock, Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Section, SectionIcon } from './Section';
import { ExecutionTimeline } from './ExecutionTimeline';
import { AuditLogViewer } from './AuditLogViewer';

import type { AutomationExecution, ExecutionStatus } from '@/types/automation';

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
    <div className="space-y-4">
      <Section
        title="Execuções recentes"
        description="Histórico operacional do pipeline e das automações"
        icon={<SectionIcon icon={Clock} className="bg-amber-500/10 text-amber-500" />}
        actions={
          <Select
            value={executionStatusFilter}
            onValueChange={(v) => setExecutionStatusFilter(v as ExecutionStatus | 'all')}
          >
            <SelectTrigger className="h-7 w-28 text-[11px]">
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
      </Section>

      <Section
        title="Audit Log"
        description="Histórico de alterações com diff de campos"
        icon={<SectionIcon icon={Shield} className="bg-purple-500/10 text-purple-500" />}
        collapsible
        defaultExpanded={false}
      >
        <AuditLogViewer />
      </Section>

    </div>
  );
}
