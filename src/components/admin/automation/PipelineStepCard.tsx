import {
  Loader2, CheckCircle2, AlertTriangle, Clock, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getCountdownMs(lastExecIso: string | undefined, intervalMs: number): number {
  if (!lastExecIso || !intervalMs) return -1;
  const nextRun = new Date(lastExecIso).getTime() + intervalMs;
  return nextRun - Date.now();
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
  wf,
  idx,
  totalSteps,
  isRunning,
  isFailed,
  isCompleted,
  isActive,
  isExecutionCurrent,
  hasExecutionSuccess,
  hasExecutionError,
  wfExec,
}: PipelineStepCardProps) {
  const StepIcon = step.icon;

  return (
    <div className="relative group">
      {idx < totalSteps - 1 && (
        <div className="hidden lg:block absolute top-1/2 -right-[18px] -translate-y-1/2 z-10">
          <ChevronRight className="w-5 h-5 text-blue-500/50" />
        </div>
      )}

      <div className={`relative overflow-hidden rounded-xl p-5 transition-all duration-300 ${
        isRunning
          ? 'bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-blue-500/20 ring-2 ring-cyan-400/50 shadow-xl shadow-cyan-500/30'
          : isFailed
          ? 'bg-gradient-to-br from-red-500/10 via-red-400/5 to-red-500/10 ring-1 ring-red-500/30'
          : isCompleted
          ? 'bg-primary/10 ring-1 ring-primary/30'
          : isActive
          ? 'bg-muted/40 ring-1 ring-border/40 hover:ring-primary/30'
          : 'bg-muted/20 ring-1 ring-border/20 opacity-60'
      }`}>
        {isRunning && (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-blue-500/10 animate-pulse pointer-events-none" />
        )}

        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                isRunning
                  ? 'bg-cyan-500/20 ring-2 ring-cyan-400/50'
                  : isFailed
                  ? 'bg-red-500/20 ring-1 ring-red-500/30'
                  : isCompleted
                  ? 'bg-primary/15 ring-1 ring-primary/30'
                  : isActive
                  ? 'bg-gradient-to-br from-cyan-500/10 to-primary-500/10'
                  : 'bg-muted/30'
              }`}>
                {isRunning ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : isFailed ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <StepIcon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-muted-foreground/60'}`} />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{step.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
            {isActive && (
              <div className="w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/30 animate-pulse" title="Workflow ativo" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`text-xs px-2.5 py-0.5 ${
              isRunning
                ? 'bg-cyan-500/20 text-blue-400 border-blue-500/30'
                : isFailed
                ? 'bg-red-500/20 text-red-300 border-red-400/40'
                : isCompleted
                ? 'bg-primary/15 text-primary/80 border-primary/30'
                : isActive
                ? 'bg-primary/10 text-primary border-primary/25'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {isRunning ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Executando...</>
              ) : isFailed ? (
                <><AlertTriangle className="w-3 h-3 mr-1" />Erro</>
              ) : isCompleted ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" />{wfExec?.status === 'success' ? 'Sucesso' : 'Concluído'}</>
              ) : isActive ? (
                'Ativo'
              ) : (
                'Inativo'
              )}
            </Badge>
            {(() => {
              const remaining = getCountdownMs(wfExec?.startedAt, step.scheduleIntervalMs);
              if (isRunning) return null;
              if (!wfExec || !isActive) return null;
              if (remaining > 0) {
                return (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-500/25 text-blue-400 font-mono tabular-nums">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatCountdown(remaining)}
                  </Badge>
                );
              }
              return (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-primary/25 text-primary">
                  iminente
                </Badge>
              );
            })()}
          </div>

          <div className="pt-3 border-t border-border/30 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Workflow ID</span>
              <span className="font-mono text-muted-foreground">{wf.id}</span>
            </div>
            {wfExec && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Última exec.</span>
                <span className={`font-medium ${
                  hasExecutionSuccess ? 'text-primary' :
                  hasExecutionError ? 'text-red-400' :
                  wfExec.status === 'running' ? 'text-blue-500' :
                  !isExecutionCurrent ? 'text-amber-400' : 'text-muted-foreground'
                }`}>
                  {wfExec.status === 'running'
                    ? 'A correr'
                    : !isExecutionCurrent
                      ? 'Aguardando nova execução'
                      : wfExec.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
