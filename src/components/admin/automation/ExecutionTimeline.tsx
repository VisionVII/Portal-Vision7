import {
  Clock, Loader2,
  ChevronDown, ChevronUp,
  ArrowRight, AlertTriangle, CheckCircle2, XCircle, SkipForward, Play,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AutomationExecution, ExecutionStatus, ExecutionStep } from '@/types/automation';

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

/* ─── Execution Detail Drill-Down ─── */

const STEP_ICON: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  skipped: SkipForward,
  running: Play,
};

const STEP_COLOR: Record<string, string> = {
  success: 'text-primary',
  error: 'text-destructive',
  skipped: 'text-muted-foreground',
  running: 'text-blue-500',
};

const STEP_BAR: Record<string, string> = {
  success: 'bg-primary',
  error: 'bg-destructive',
  skipped: 'bg-muted-foreground/40',
  running: 'bg-blue-500 animate-pulse',
};

function ExecutionDetail({ exec }: { exec: AutomationExecution }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const totalStepDuration = exec.steps.reduce((a, s) => a + s.durationMs, 0) || 1;
  const successCount = exec.steps.filter((s) => s.status === 'success').length;
  const errorCount = exec.steps.filter((s) => s.status === 'error').length;

  return (
    <div className="mt-3 p-3 bg-muted/30 rounded-md border border-border/30 space-y-4">
      {/* Progress bar for whole execution */}
      {exec.steps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h6 className="text-[11px] text-muted-foreground uppercase tracking-wider">Steps ({exec.steps.length})</h6>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {successCount > 0 && <span className="flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3 text-primary" />{successCount}</span>}
              {errorCount > 0 && <span className="flex items-center gap-0.5"><XCircle className="h-3 w-3 text-destructive" />{errorCount}</span>}
            </div>
          </div>

          {/* Segment bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
            {exec.steps.map((step, i) => {
              const pct = (step.durationMs / totalStepDuration) * 100;
              return (
                <div
                  key={i}
                  className={`${STEP_BAR[step.status] ?? STEP_BAR.skipped} transition-all`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  title={`${step.name}: ${formatDuration(step.durationMs)}`}
                />
              );
            })}
          </div>

          {/* Steps list */}
          <div className="mt-3 space-y-1">
            {exec.steps.map((step, i) => {
              const Icon = STEP_ICON[step.status] ?? CheckCircle2;
              const isExpanded = expandedStep === i;
              const pct = Math.round((step.durationMs / totalStepDuration) * 100);

              return (
                <div key={i}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setExpandedStep(isExpanded ? null : i)}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${STEP_COLOR[step.status] ?? ''}`} />
                    <span className="text-foreground font-medium flex-1 truncate">{step.name}</span>
                    <span className="text-muted-foreground tabular-nums">{formatDuration(step.durationMs)}</span>
                    <span className="text-muted-foreground/60 tabular-nums w-8 text-right">{pct}%</span>
                    {(step.input || step.output || step.error) && (
                      isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>

                  {/* Step detail */}
                  {isExpanded && (
                    <div className="ml-6 mb-2 space-y-2 text-[11px]">
                      {step.error && (
                        <div className="flex items-start gap-1.5 text-destructive">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{step.error}</span>
                        </div>
                      )}
                      {step.input != null && (
                        <div>
                          <span className="text-muted-foreground font-medium">Input:</span>
                          <pre className="mt-0.5 bg-muted/50 p-2 rounded overflow-x-auto max-h-32 text-[10px] text-foreground/80">
                            {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.output != null && (
                        <div>
                          <span className="text-muted-foreground font-medium">Output:</span>
                          <pre className="mt-0.5 bg-muted/50 p-2 rounded overflow-x-auto max-h-32 text-[10px] text-foreground/80">
                            {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        {exec.n8nExecutionId && (
          <span>n8n ID: <span className="font-mono text-foreground/80">{exec.n8nExecutionId}</span></span>
        )}
        <span>Items processados: <span className="text-foreground">{exec.itemsProcessed}</span></span>
        <span>Items criados: <span className="text-foreground">{exec.itemsCreated}</span></span>
        {exec.finishedAt && <span>Fim: {formatTime(exec.finishedAt)}</span>}
      </div>

      {/* Error detail */}
      {exec.errorDetail && (
        <div>
          <h6 className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Detalhes do erro</h6>
          <pre className="text-[10px] text-destructive bg-muted/50 p-2 rounded overflow-x-auto max-h-40">
            {JSON.stringify(exec.errorDetail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">
          Timeline de Execuções
          <span className="text-xs text-muted-foreground font-normal ml-2">({total})</span>
        </h3>
        <Select
          value={statusFilter || '__all__'}
          onValueChange={(v) => onStatusFilterChange((v === '__all__' ? '' : v) as ExecutionStatus | '')}
        >
          <SelectTrigger className="w-[110px] sm:w-[140px] bg-muted/30 border-border h-8 text-xs">
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
                <ExecutionDetail exec={exec} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
