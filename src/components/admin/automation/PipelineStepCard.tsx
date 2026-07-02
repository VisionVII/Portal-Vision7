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
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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

type StepState = 'running' | 'failed' | 'success' | 'active' | 'inactive';

const STATE_CONFIG: Record<StepState, {
  border: string;
  iconBg: string;
  labelBg: string;
  labelText: string;
  dot: string;
  glow: string;
  label: string;
}> = {
  running: {
    border: 'border-blue-500/50 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10',
    iconBg: 'bg-blue-500 text-white',
    labelBg: 'bg-blue-500/10',
    labelText: 'text-blue-400',
    dot: 'bg-blue-400',
    glow: '',
    label: 'A executar',
  },
  failed: {
    border: 'border-red-500/40 ring-1 ring-red-500/15',
    iconBg: 'bg-red-500/10 text-red-400',
    labelBg: 'bg-red-500/10',
    labelText: 'text-red-400',
    dot: 'bg-red-400',
    glow: '',
    label: 'Erro',
  },
  success: {
    border: 'border-emerald-500/35',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
    labelBg: 'bg-emerald-500/10',
    labelText: 'text-emerald-400',
    dot: 'bg-emerald-400',
    glow: '',
    label: 'Sucesso',
  },
  active: {
    border: 'border-primary/25',
    iconBg: 'bg-primary/10 text-primary',
    labelBg: 'bg-primary/8',
    labelText: 'text-primary/80',
    dot: 'bg-primary/60',
    glow: '',
    label: 'Ativo',
  },
  inactive: {
    border: 'border-border/30',
    iconBg: 'bg-muted/60 text-muted-foreground/40',
    labelBg: 'bg-muted/40',
    labelText: 'text-muted-foreground/60',
    dot: 'bg-muted-foreground/25',
    glow: '',
    label: 'Inativo',
  },
};

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

  const state: StepState = isRunning ? 'running' : isFailed ? 'failed' : isCompleted ? 'success' : isActive ? 'active' : 'inactive';
  const cfg = STATE_CONFIG[state];

  return (
    <div className="relative flex flex-col">
      {/* Connector between steps */}
      {idx < totalSteps - 1 && (
        <div className="absolute -right-[18px] top-1/2 z-10 hidden -translate-y-1/2 items-center gap-0.5 lg:flex">
          <div className={`h-px w-4 ${state === 'success' ? 'bg-emerald-500/50' : state === 'running' ? 'bg-blue-500/50 animate-pulse' : 'bg-border/40'}`} />
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={state === 'success' ? 'text-emerald-500/60' : state === 'running' ? 'text-blue-500/60' : 'text-border/40'}>
            <path d="M3 2l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div className={`relative overflow-hidden rounded-2xl border bg-card/70 p-4 backdrop-blur-sm transition-all duration-300 ${cfg.border} ${cfg.glow}`}>
        {/* Step index watermark */}
        <span className="absolute right-3 top-2.5 font-mono text-[11px] font-bold text-muted-foreground/20 select-none">
          0{idx + 1}
        </span>

        {/* Subtle glow blob when running */}
        {isRunning && (
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
        )}

        {/* Icon + title */}
        <div className="mb-3 flex items-start gap-3">
          <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${cfg.iconBg}`}>
            {isRunning
              ? <Loader2 className="h-[18px] w-[18px] animate-spin" />
              : isFailed
              ? <AlertTriangle className="h-[18px] w-[18px]" />
              : isCompleted
              ? <CheckCircle2 className="h-[18px] w-[18px]" />
              : <StepIcon className="h-[18px] w-[18px]" />
            }
            {isRunning && (
              <span className="absolute inset-0 rounded-xl animate-ping bg-blue-400/30" />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-bold leading-tight text-foreground">{step.label}</p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{step.description}</p>
          </div>
        </div>

        {/* Status pill + timing */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.labelBg} ${cfg.labelText}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${isRunning ? 'animate-pulse' : ''}`} />
            {cfg.label}
          </span>

          {isActive && wfExec && !isRunning && (
            <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
              {remaining > 0 && step.scheduleIntervalMs > 0 ? (
                <><Clock className="h-3 w-3" />{formatCountdown(remaining)}</>
              ) : step.scheduleIntervalMs > 0 ? (
                <span className="font-sans font-medium text-primary/80">iminente</span>
              ) : (
                formatRelativeTime(wfExec.startedAt)
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
