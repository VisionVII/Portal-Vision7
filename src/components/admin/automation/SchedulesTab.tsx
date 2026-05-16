import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useAutomationsV2 } from '@/hooks/useAutomationsV2';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import type { PipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';

const WF01_INTERVAL_MINUTES = 30;
const WF02_INTERVAL_MINUTES = 20;
const WF03_INTERVAL_MINUTES = 60;
const WF03_BATCH_SIZE = 10;
const WF03_CAPACITY_PER_HOUR = (60 / WF03_INTERVAL_MINUTES) * WF03_BATCH_SIZE;

function formatDurationMs(value: number | null): string {
  if (!value) return '—';
  if (value < 1000) return `${value}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  return `${(value / 60_000).toFixed(1)}min`;
}

function formatHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 min';
  if (value < 1) return `${Math.round(value * 60)} min`;
  if (value < 24) return `${value.toFixed(1)} h`;
  return `${(value / 24).toFixed(1)} dias`;
}

interface SchedulesTabProps {
  diagnostics?: PipelineDiagnostics | null;
}

export function SchedulesTab({ diagnostics }: SchedulesTabProps) {
  const { automations: contentAutomations } = useAutomationsV2({ category: 'content_pipeline', pageSize: 100 });
  const { executions: recentExecutions } = useAutomationExecutions({ pageSize: 100 });

  const executionSummaries = useMemo(() => {
    const ids = new Set(contentAutomations.map((a) => a.id));
    const successful = recentExecutions.filter(
      (e) => ids.has(e.automationId) && e.status === 'success' && typeof e.durationMs === 'number' && e.durationMs > 0,
    );
    return contentAutomations
      .map((a) => {
        const samples = successful.filter((e) => e.automationId === a.id).slice(0, 20);
        if (!samples.length) return null;
        const avgDurationMs = Math.round(samples.reduce((s, e) => s + (e.durationMs ?? 0), 0) / samples.length);
        return {
          id: a.id, name: a.name, avgDurationMs,
          avgItemsProcessed: samples.reduce((s, e) => s + e.itemsProcessed, 0) / samples.length,
          avgItemsCreated: samples.reduce((s, e) => s + e.itemsCreated, 0) / samples.length,
          sampleCount: samples.length,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [contentAutomations, recentExecutions]);

  const avgCronWait = (WF01_INTERVAL_MINUTES / 2) + (WF02_INTERVAL_MINUTES / 2) + (WF03_INTERVAL_MINUTES / 2);
  const worstCaseCronWait = WF01_INTERVAL_MINUTES + WF02_INTERVAL_MINUTES + WF03_INTERVAL_MINUTES;
  const cadencePerCurated = Math.round(WF03_INTERVAL_MINUTES / WF03_BATCH_SIZE);
  const backlogDrainH = diagnostics ? diagnostics.clusters.highConfidence / WF03_CAPACITY_PER_HOUR : null;
  const estimatedReadyH = backlogDrainH === null ? null : backlogDrainH + (avgCronWait / 60);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { wf: 'WF-01', label: 'Coleta RSS', schedule: 'A cada 30 min' },
          { wf: 'WF-02', label: 'Cluster & Dedup', schedule: 'A cada 20 min' },
          { wf: 'WF-03', label: 'IA Reescrita', schedule: 'A cada 60 min · até 10 artigos/ciclo' },
        ].map(({ wf, label, schedule }) => (
          <div key={wf} className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <Badge variant="outline" className="mb-2 border-blue-500/30 text-[10px] text-blue-600 dark:text-blue-400">
              {wf}
            </Badge>
            <p className="text-xs font-medium text-foreground">{label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{schedule}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1 text-[11px] text-muted-foreground">
        <p>Cadência WF-03: ~1 artigo a cada {cadencePerCurated} min.</p>
        <p>Lead time: ~{Math.round(avgCronWait)} min (avg) · ~{Math.round(worstCaseCronWait)} min (pior caso).</p>
        <p>Capacidade: {WF03_CAPACITY_PER_HOUR.toFixed(0)} curados/hora (~{Math.round(WF03_CAPACITY_PER_HOUR * 24)}/dia).</p>
        {backlogDrainH !== null && (
          <>
            <p>Backlog: {diagnostics?.clusters.highConfidence ?? 0} clusters elegíveis ⇒ ~{formatHours(backlogDrainH)} para drenar.</p>
            <p>Próximo artigo: pronto em ~{formatHours(estimatedReadyH ?? 0)} se a fila se mantiver.</p>
          </>
        )}
      </div>

      {executionSummaries.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
          <p className="mb-2 text-xs font-medium text-foreground">Execução real recente</p>
          <div className="space-y-1.5">
            {executionSummaries.map((s) => (
              <div key={s.id} className="flex min-w-0 items-center gap-2 text-[11px]">
                <span className="min-w-0 truncate text-foreground">{s.name}</span>
                <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{formatDurationMs(s.avgDurationMs)}</span>
                <span className="shrink-0 text-muted-foreground/60">{s.sampleCount} exec.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
