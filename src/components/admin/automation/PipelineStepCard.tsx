import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import type { N8nExecution, N8nWorkflow } from '@/types/automation';

interface PipelineStep {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  nameMatch: string;
  delayAfterMs: number;
  scheduleIntervalMs: number;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function getCountdownMs(lastExecIso: string | undefined, intervalMs: number): number {
  if (!lastExecIso || !intervalMs) return -1;
  return new Date(lastExecIso).getTime() + intervalMs - Date.now();
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '—';
  const diff = Math.max(Math.floor((Date.now() - new Date(iso).getTime()) / 60_000), 0);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff} min atrás`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} h atrás`;
  return `${Math.floor(h / 24)} d atrás`;
}

interface PipelineStepCardProps {
  step: PipelineStep;
  wf: N8nWorkflow;
  idx: number;
  totalSteps: number;
  isRunning: boolean;
  isFailed: boolean;
  isCompleted: boolean;
  isActive: boolean;
  isExecutionCurrent: boolean;
  hasExecutionSuccess: boolean;
  hasExecutionError: boolean;
  wfExec: N8nExecution | undefined;
}

export function PipelineStepCard({
  step,
  idx,
  totalSteps,
  isRunning,
  isFailed,
  isCompleted,
  isActive,
  wfExec,
}: PipelineStepCardProps) {
  const StepIcon = step.icon;
  const remaining = getCountdownMs(wfExec?.startedAt, step.scheduleIntervalMs);

  const borderCls = isRunning
    ? 'border-blue-500/40 ring-1 ring-blue-500/30'
    : isFailed
    ? 'border-red-500/30 ring-1 ring-red-500/20'
    : isCompleted
    ? 'border-emerald-500/30'
    : 'border-border/40';

  const bgCls = isRunning
    ? 'bg-blue-500/5'
    : isFailed
    ? 'bg-red-500/5'
    : isCompleted
    ? 'bg-emerald-500/5'
    : 'bg-card';

  const iconBgCls = isRunning
    ? 'bg-blue-500/10 text-blue-500'
    : isFailed
    ? 'bg-red-500/10 text-red-400'
    : isCompleted
    ? 'bg-emerald-500/10 text-emerald-500'
    : isActive
    ? 'bg-primary/10 text-primary'
    : 'bg-muted/50 text-muted-foreground/60';

  return (
    <div className="relative">
      {/* Connector arrow */}
      {idx < totalSteps - 1 && (
        <div className="absolute right-[-14px] top-1/2 z-10 hidden -translate-y-1/2 lg:block">
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-border/60">
            <path d="M1 5h8M6 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      )}

      <div className={`rounded-xl border p-4 transition-all duration-200 ${borderCls} ${bgCls}`}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBgCls}`}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFailed ? (
              <AlertTriangle className="h-4 w-4" />
            ) : isCompleted ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <StepIcon className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              {isActive && !isRunning && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{step.description}</p>
          </div>
        </div>

        {/* Status row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isRunning
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : isFailed
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : isCompleted
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : isActive
              ? 'bg-muted text-muted-foreground'
              : 'bg-muted/60 text-muted-foreground/60'
          }`}>
            {isRunning ? 'A executar' : isFailed ? 'Erro' : isCompleted ? 'Sucesso' : isActive ? 'Ativo' : 'Inativo'}
          </span>

          {/* Countdown or last run */}
          {isActive && wfExec && !isRunning && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {remaining > 0 && step.scheduleIntervalMs > 0 ? (
                <>
                  <Clock className="h-3 w-3" />
                  <span className="font-mono tabular-nums">{formatCountdown(remaining)}</span>
                </>
              ) : step.scheduleIntervalMs > 0 ? (
                <span className="text-primary font-medium">iminente</span>
              ) : (
                <span>{formatRelativeTime(wfExec.startedAt)}</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
