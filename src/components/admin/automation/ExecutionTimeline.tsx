import {
  Clock, Loader2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AutomationExecution, ExecutionStatus } from '@/types/automation';

const STATUS_DOT: Record<string, string> = {
  success: 'bg-primary',
  error: 'bg-destructive',
  warning: 'bg-amber-500',
  running: 'bg-blue-500 animate-pulse',
  pending: 'bg-muted-foreground',
  cancelled: 'bg-muted-foreground',
};

const STATUS_LABEL: Record<string, string> = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Aviso',
  running: 'Executando',
  pending: 'Pendente',
  cancelled: 'Cancelada',
};

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface ExecutionTimelineProps {
  executions: AutomationExecution[];
  total: number;
  isLoading: boolean;
  error?: string | null;
  statusFilter: ExecutionStatus | '';
  onStatusFilterChange: (s: ExecutionStatus | '') => void;
}

export function ExecutionTimeline({
  executions,
  total,
  isLoading,
  error,
  statusFilter,
  onStatusFilterChange,
}: ExecutionTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Timeline de Execuções
          <span className="text-xs text-muted-foreground font-normal ml-2">({total})</span>
        </h3>
        <Select
          value={statusFilter || '__all__'}
          onValueChange={(v) => onStatusFilterChange((v === '__all__' ? '' : v) as ExecutionStatus | '')}
        >
          <SelectTrigger className="w-[140px] bg-muted/30 border-border h-8 text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="success">✓ Sucesso</SelectItem>
            <SelectItem value="error">✕ Erro</SelectItem>
            <SelectItem value="running">◉ Executando</SelectItem>
            <SelectItem value="warning">⚠ Aviso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando...
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-4 text-sm text-destructive">
          Falha ao carregar execuções reais: {error}
        </div>
      ) : executions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma execução encontrada
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

          {executions.map((exec) => (
            <div key={exec.id} className="relative pl-8 pb-4">
              {/* Dot */}
              <div
                className={`absolute left-[6px] top-[6px] w-3 h-3 rounded-full ${STATUS_DOT[exec.status] ?? STATUS_DOT.pending} ring-2 ring-background`}
              />

              {/* Content */}
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-foreground font-medium">
                    {STATUS_LABEL[exec.status] ?? exec.status}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatTime(exec.startedAt)}</span>
                  <span className="text-muted-foreground/60 text-xs">{formatDuration(exec.durationMs)}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                    {exec.triggerMode}
                  </Badge>
                  {exec.itemsProcessed > 0 && (
                    <span className="text-xs text-blue-500">{exec.itemsProcessed} items</span>
                  )}
                  <div className="flex-1" />
                  {expandedId === exec.id ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>

                {exec.errorMessage && exec.status === 'error' && (
                  <p className="text-xs text-destructive mt-1 truncate">{exec.errorMessage}</p>
                )}
              </div>

              {/* Expanded detail */}
              {expandedId === exec.id && (
                <div className="mt-3 p-3 bg-muted/30 rounded-md border border-border/30">
                  {/* Steps */}
                  {exec.steps.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <h6 className="text-[11px] text-muted-foreground uppercase tracking-wider">Steps</h6>
                      {exec.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              step.status === 'success'
                                ? 'bg-primary'
                                : step.status === 'error'
                                ? 'bg-destructive'
                                : 'bg-muted-foreground'
                            }`}
                          />
                          <span className="text-foreground">{step.name}</span>
                          <span className="text-muted-foreground">{formatDuration(step.durationMs)}</span>
                          {step.error && <span className="text-destructive truncate">{step.error}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {exec.n8nExecutionId && (
                      <span>n8n ID: <span className="font-mono text-foreground/80">{exec.n8nExecutionId}</span></span>
                    )}
                    <span>Items processados: <span className="text-foreground">{exec.itemsProcessed}</span></span>
                    <span>Items criados: <span className="text-foreground">{exec.itemsCreated}</span></span>
                    {exec.finishedAt && <span>Fim: {formatTime(exec.finishedAt)}</span>}
                  </div>

                  {/* Error detail */}
                  {exec.errorDetail && (
                    <div className="mt-2">
                      <h6 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Detalhes do erro</h6>
                      <pre className="text-[10px] text-destructive bg-muted/50 p-2 rounded overflow-x-auto max-h-40">
                        {JSON.stringify(exec.errorDetail, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
