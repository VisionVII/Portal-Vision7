import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Download, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Clock, Newspaper, Layers, Sparkles, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';

export interface WorkflowStep {
  key: string;
  label: string;
  shortLabel: string;
  active: boolean;
  found: boolean;
}

interface EngineStatusPanelProps {
  isConnected: boolean;
  keepAlive: {
    isActive: boolean;
    lastPing: string | null;
    lastStatus: 'connected' | 'error' | 'unreachable' | null;
    pingCount: number;
  };
  diagnostics: PipelineDiagnostics | undefined;
  workflowSteps: WorkflowStep[];
  onRefresh: () => void;
}

const WF_ICONS: Record<string, React.ElementType> = {
  'WF-01': Newspaper,
  'WF-02': Layers,
  'WF-03': Sparkles,
};

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${sec % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatRel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatAbs(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function EngineStatusPanel({
  isConnected,
  keepAlive,
  diagnostics,
  workflowSteps,
  onRefresh,
}: EngineStatusPanelProps) {
  const connectedSinceRef = useRef<number | null>(null);
  const [uptimeSec, setUptimeSec] = useState(0);

  useEffect(() => {
    if (isConnected) {
      if (!connectedSinceRef.current) connectedSinceRef.current = Date.now();
    } else {
      connectedSinceRef.current = null;
      setUptimeSec(0);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => {
      const since = connectedSinceRef.current;
      setUptimeSec(since ? Math.floor((Date.now() - since) / 1000) : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  const handleExport = useCallback(() => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      engine: {
        status: isConnected ? 'online' : 'offline',
        connectedSince: connectedSinceRef.current
          ? new Date(connectedSinceRef.current).toISOString()
          : null,
        uptimeSeconds: uptimeSec,
        keepAlive: {
          active: keepAlive.isActive,
          lastPing: keepAlive.lastPing,
          lastStatus: keepAlive.lastStatus,
          pingCount: keepAlive.pingCount,
        },
      },
      workflows: workflowSteps.map((s) => ({
        key: s.key,
        label: s.label,
        active: s.active,
        found: s.found,
      })),
      pipeline: diagnostics
        ? {
            staging: diagnostics.staging,
            clusters: diagnostics.clusters,
            curated: diagnostics.curated,
            config: {
              label: diagnostics.configLabel,
              language: diagnostics.configLanguage,
              region: diagnostics.configRegion,
              tags: diagnostics.configTags,
            },
            lastEvents: {
              stagingAt: diagnostics.lastStagingAt,
              clusterAt: diagnostics.lastClusterAt,
              curatedAt: diagnostics.lastCuratedAt,
            },
          }
        : null,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engine-state-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [isConnected, uptimeSec, keepAlive, workflowSteps, diagnostics]);

  const published = diagnostics?.curated.published ?? 0;
  const ready = diagnostics?.curated.ready ?? 0;
  const draft = diagnostics?.curated.draft ?? 0;
  const pendingReview = ready + draft;
  const inQueue = diagnostics?.staging.unprocessed ?? 0;
  const clusterTotal = diagnostics?.clusters.total ?? 0;

  const activeSteps = workflowSteps.filter((s) => s.active).length;
  const allActive = workflowSteps.length > 0 && workflowSteps.every((s) => s.active);
  const hasWorkflows = workflowSteps.length > 0;

  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${
      isConnected
        ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.04] via-card to-card'
        : 'border-red-400/25 bg-gradient-to-br from-red-400/[0.04] via-card to-card'
    }`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border/40 bg-card/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Animated status dot */}
          <span className="relative flex h-3 w-3 shrink-0">
            {isConnected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            )}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
          </span>

          <span className="truncate text-sm font-semibold text-foreground">
            Motor Pipeline IA
          </span>

          <span className={`hidden shrink-0 text-xs font-medium sm:inline ${
            isConnected ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-400'
          }`}>
            {isConnected ? '— Online' : '— Offline'}
          </span>

          {hasWorkflows && (
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              allActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : activeSteps > 0
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-400'
            }`}>
              {activeSteps}/{workflowSteps.length} WF
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleExport}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar Estado</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Exportar snapshot completo do motor em JSON (estado atual, workflows, pipeline)
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onRefresh}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Atualizar estado do motor</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-4 p-4">

        {/* ── Connection meta ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {isConnected && uptimeSec > 0 ? (
              <>Conectado há <strong className="ml-1 text-foreground">{formatUptime(uptimeSec)}</strong></>
            ) : (
              <span className="text-red-400">Motor não acessível</span>
            )}
          </span>

          {keepAlive.lastPing && (
            <span className="flex items-center gap-1 text-muted-foreground">
              Último ping:
              <strong className="ml-1 text-foreground">
                {new Date(keepAlive.lastPing).toLocaleTimeString('pt-PT', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </strong>
              {keepAlive.lastStatus === 'connected' && (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              )}
              {keepAlive.lastStatus === 'unreachable' && (
                <XCircle className="h-3 w-3 text-red-400" />
              )}
            </span>
          )}

          {!keepAlive.isActive && (
            <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Keep-alive inativo
            </span>
          )}
        </div>

        {/* ── Workflow step cards ── */}
        {hasWorkflows && (
          <div className="grid grid-cols-3 gap-2">
            {workflowSteps.map((step) => {
              const Icon = WF_ICONS[step.key] ?? Zap;
              const isActive = step.found && step.active;
              const isInactive = step.found && !step.active;
              const notFound = !step.found;

              return (
                <div
                  key={step.key}
                  className={`flex flex-col gap-2 rounded-xl border p-3 ${
                    notFound
                      ? 'border-border/30 bg-muted/20'
                      : isActive
                        ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                        : 'border-red-400/25 bg-red-500/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${
                        notFound ? 'text-muted-foreground/40'
                        : isActive ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-red-400'
                      }`} />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">
                        {step.key}
                      </span>
                    </div>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${
                      notFound ? 'bg-muted-foreground/25'
                      : isActive ? 'bg-emerald-500'
                      : 'bg-red-400'
                    }`} />
                  </div>

                  <p className="text-xs font-semibold leading-tight text-foreground">
                    {step.shortLabel}
                  </p>

                  <p className={`text-[10px] font-medium ${
                    notFound ? 'text-muted-foreground/50'
                    : isActive ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                  }`}>
                    {notFound ? 'Não encontrado' : isActive ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pipeline KPIs ── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Publicados */}
          <div className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 ${
            published > 0
              ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
              : 'border-border/30 bg-muted/20'
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              published > 0 ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-muted-foreground/60'
            }`}>
              Publicados
            </span>
            <span className={`text-2xl font-bold tabular-nums leading-none ${
              published > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            }`}>
              {published}
            </span>
          </div>

          {/* Para revisar */}
          <div className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 ${
            pendingReview > 0
              ? 'border-blue-500/25 bg-blue-500/[0.06]'
              : 'border-border/30 bg-muted/20'
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              pendingReview > 0 ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-muted-foreground/60'
            }`}>
              Para revisar
            </span>
            <span className={`text-2xl font-bold tabular-nums leading-none ${
              pendingReview > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
            }`}>
              {pendingReview}
            </span>
          </div>

          {/* Em fila */}
          <div className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 ${
            inQueue > 20
              ? 'border-amber-500/25 bg-amber-500/[0.06]'
              : inQueue > 0
                ? 'border-sky-500/25 bg-sky-500/[0.06]'
                : 'border-border/30 bg-muted/20'
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              inQueue > 20 ? 'text-amber-600/70 dark:text-amber-400/70'
              : inQueue > 0 ? 'text-sky-600/70 dark:text-sky-400/70'
              : 'text-muted-foreground/60'
            }`}>
              Staging fila
            </span>
            <span className={`text-2xl font-bold tabular-nums leading-none ${
              inQueue > 20 ? 'text-amber-600 dark:text-amber-400'
              : inQueue > 0 ? 'text-sky-600 dark:text-sky-400'
              : 'text-muted-foreground'
            }`}>
              {inQueue}
            </span>
          </div>

          {/* Clusters */}
          <div className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 ${
            clusterTotal > 0
              ? 'border-violet-500/25 bg-violet-500/[0.06]'
              : 'border-border/30 bg-muted/20'
          }`}>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              clusterTotal > 0 ? 'text-violet-600/70 dark:text-violet-400/70' : 'text-muted-foreground/60'
            }`}>
              Clusters
            </span>
            <span className={`text-2xl font-bold tabular-nums leading-none ${
              clusterTotal > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'
            }`}>
              {diagnostics ? clusterTotal : '—'}
            </span>
          </div>
        </div>

        {/* ── Last events timeline ── */}
        {diagnostics && (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border/30 pt-3 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Sparkles className="h-3 w-3 shrink-0" />
              Último artigo:{' '}
              <strong className="ml-0.5 text-foreground">{formatAbs(diagnostics.lastCuratedAt)}</strong>
              <span className="text-muted-foreground/50">({formatRel(diagnostics.lastCuratedAt)})</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Layers className="h-3 w-3 shrink-0" />
              Cluster:{' '}
              <strong className="ml-0.5 text-foreground">{formatAbs(diagnostics.lastClusterAt)}</strong>
              <span className="text-muted-foreground/50">({formatRel(diagnostics.lastClusterAt)})</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Newspaper className="h-3 w-3 shrink-0" />
              Coleta:{' '}
              <strong className="ml-0.5 text-foreground">{formatAbs(diagnostics.lastStagingAt)}</strong>
              <span className="text-muted-foreground/50">({formatRel(diagnostics.lastStagingAt)})</span>
            </span>
          </div>
        )}

        {/* Not connected warning */}
        {!isConnected && (
          <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/5 px-3 py-2.5 text-xs text-red-500 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Motor n8n inacessível. Verifique se o Docker está em execução.
              Ative o Keep-Alive para manter a conexão automática.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
