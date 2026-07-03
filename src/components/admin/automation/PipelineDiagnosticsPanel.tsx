import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Database, Layers, Sparkles, Newspaper, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import type { PipelineSearchConfig } from '@/hooks/usePipelineConfig';

interface Props {
  diagnostics: PipelineDiagnostics | undefined;
  diagnosticsError: Error | null | undefined;
  activeConfig: PipelineSearchConfig | null;
  onRefetch: () => void;
  onRepairTags?: () => Promise<void>;
  onOpenSettings?: () => void;
}

interface StatTileProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'blue' | 'amber' | 'emerald' | 'red';
}

function StatTile({ icon: Icon, label, value, sub, tone = 'default' }: StatTileProps) {
  const toneMap = {
    default: { bg: 'bg-muted/30', icon: 'text-muted-foreground', value: 'text-foreground', sub: 'text-muted-foreground' },
    blue:    { bg: 'bg-blue-500/5',    icon: 'text-blue-400',    value: 'text-blue-500 dark:text-blue-400',    sub: 'text-blue-400/70' },
    amber:   { bg: 'bg-amber-500/5',   icon: 'text-amber-400',   value: 'text-amber-500 dark:text-amber-400',  sub: 'text-amber-400/70' },
    emerald: { bg: 'bg-emerald-500/5', icon: 'text-emerald-400', value: 'text-emerald-500 dark:text-emerald-400', sub: 'text-emerald-400/70' },
    red:     { bg: 'bg-red-500/5',     icon: 'text-red-400',     value: 'text-red-500 dark:text-red-400',      sub: 'text-red-400/70' },
  };
  const t = toneMap[tone];

  return (
    <div className={`flex flex-col gap-1.5 rounded-xl border border-border/30 p-3 ${t.bg}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${t.icon}`} />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums leading-none ${t.value}`}>{value}</p>
      {sub && <p className={`text-[10px] leading-tight ${t.sub}`}>{sub}</p>}
    </div>
  );
}

export function PipelineDiagnosticsPanel({ diagnostics, diagnosticsError, activeConfig, onRefetch, onRepairTags, onOpenSettings }: Props) {
  const [repairing, setRepairing] = useState(false);
  if (!diagnostics && !diagnosticsError) return null;

  const tagsOutOfSync = !!(diagnostics && diagnostics.configTags.length > 0 && activeConfig &&
    [...diagnostics.configTags].sort().join(',') !== [...activeConfig.tags].sort().join(','));

  const handleRepair = async () => {
    if (!onRepairTags) return;
    setRepairing(true);
    try { await onRepairTags(); } finally { setRepairing(false); }
  };

  const alerts: { type: 'error' | 'warn' | 'info'; key: string; node: React.ReactNode }[] = [];

  if (diagnostics) {
    if (diagnostics.staging.total > 0 && diagnostics.clusters.total === 0)
      alerts.push({ type: 'warn', key: 'wf02', node: `${diagnostics.staging.total} artigos em staging mas 0 clusters — WF-02 ainda não processou ou falhou` });

    if (diagnostics.clusters.highConfidence > 0 && diagnostics.curated.total === 0)
      alerts.push({
        type: 'warn', key: 'anthropic',
        node: (
          <span>
            {diagnostics.clusters.highConfidence} cluster(s) ≥60% aguardam processamento — execute o pipeline para o WF-03 gerar os artigos.
            {' '}Se já configurou a{' '}
            <code className="rounded bg-amber-500/10 px-1 font-mono">ANTHROPIC_API_KEY</code>
            {' '}pode ignorar este aviso e correr o pipeline.
            {onOpenSettings && (
              <button
                type="button"
                className="ml-1 underline underline-offset-2 hover:no-underline"
                onClick={onOpenSettings}
              >
                Ver chaves →
              </button>
            )}
          </span>
        ),
      });

    if (tagsOutOfSync)
      alerts.push({
        type: 'warn', key: 'tags',
        node: (
          <span className="flex flex-wrap items-center gap-2">
            <span>
              Tags no DB desincronizadas:{' '}
              <code className="rounded bg-amber-500/10 px-1 font-mono text-[10px]">
                [{diagnostics.configTags.join(', ')}]
              </code>
              {' '}vs dashboard{' '}
              <code className="rounded bg-amber-500/10 px-1 font-mono text-[10px]">
                [{activeConfig?.tags.join(', ')}]
              </code>
            </span>
            {onRepairTags && (
              <button
                type="button"
                disabled={repairing}
                onClick={() => void handleRepair()}
                className="ml-auto shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {repairing ? 'A corrigir…' : 'Corrigir'}
              </button>
            )}
          </span>
        ),
      });

    if (diagnostics.configTags.length === 0)
      alerts.push({ type: 'warn', key: 'notags', node: 'Sem config ativa no DB — n8n usará tags padrão (IA, cibersegurança, automação)' });

    if (diagnostics.staging.total === 0 && diagnostics.clusters.total === 0 && diagnostics.curated.total === 0)
      alerts.push({
        type: 'warn', key: 'empty',
        node: (
          <span>
            Pipeline vazio — se o WF-01 já correu sem erro visível, a causa mais provável é que as variáveis{' '}
            <code className="rounded bg-amber-500/10 px-1 font-mono">SUPABASE_SERVICE_ROLE_KEY</code> e{' '}
            <code className="rounded bg-amber-500/10 px-1 font-mono">SUPABASE_URL</code>{' '}
            não estão configuradas em n8n → Settings → Variables (são <em>$vars</em>, não <em>$env</em>).
            Para WF-03 verificar também <code className="rounded bg-amber-500/10 px-1 font-mono">ANTHROPIC_API_KEY</code> em n8n → Settings → Environment Variables.
          </span>
        ),
      });
  }

  const stagingTone = diagnostics ? (diagnostics.staging.unprocessed > 50 ? 'amber' : diagnostics.staging.total > 0 ? 'blue' : 'default') : 'default';
  const clusterTone = diagnostics ? (diagnostics.clusters.highConfidence > 0 ? 'emerald' : diagnostics.clusters.total > 0 ? 'blue' : 'default') : 'default';
  const curatedTone = diagnostics ? (diagnostics.curated.ready > 0 ? 'emerald' : diagnostics.curated.total > 0 ? 'blue' : 'default') : 'default';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10">
            <Database className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-semibold text-foreground/80">Estado do Pipeline</span>
          <span className="rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">DB</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={onRefetch}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Atualizar diagnóstico</TooltipContent>
        </Tooltip>
      </div>

      {/* Error */}
      {diagnosticsError instanceof Error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {diagnosticsError.message}
        </div>
      )}

      {diagnostics && (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              icon={Newspaper}
              label="Staging"
              value={diagnostics.staging.total}
              sub={diagnostics.staging.unprocessed > 0 ? `${diagnostics.staging.unprocessed} não proc.` : 'todos proc.'}
              tone={stagingTone}
            />
            <StatTile
              icon={Layers}
              label="Clusters"
              value={diagnostics.clusters.total}
              sub={diagnostics.clusters.highConfidence > 0 ? `${diagnostics.clusters.highConfidence} ≥60%` : 'sem clusters'}
              tone={clusterTone}
            />
            <StatTile
              icon={Sparkles}
              label="Curados"
              value={diagnostics.curated.total}
              sub={diagnostics.curated.ready > 0 ? `${diagnostics.curated.ready} prontos` : diagnostics.curated.draft > 0 ? `${diagnostics.curated.draft} rascunho` : '—'}
              tone={curatedTone}
            />
            <StatTile
              icon={MapPin}
              label="Locale"
              value={diagnostics.configLanguage || '—'}
              sub={diagnostics.configRegion || undefined}
              tone="default"
            />
          </div>

          {/* Tags row */}
          {diagnostics.defaultPostTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Tags finais:</span>
              {diagnostics.defaultPostTags.map((tag) => (
                <Badge key={`diag-${tag}`} variant="outline" className="border-primary/25 px-1.5 py-0 text-[10px] text-primary/80">
                  #{tag}
                </Badge>
              ))}
              {diagnostics.configTags.length > 0 && activeConfig && (
                (() => {
                  const dbTags = [...diagnostics.configTags].sort().join(',');
                  const dashTags = [...activeConfig.tags].sort().join(',');
                  return dbTags === dashTags
                    ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="h-3 w-3" />sincronizadas</span>
                    : null;
                })()
              )}
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-1.5">
              {alerts.map((a) => (
                <div
                  key={a.key}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-snug ${
                    a.type === 'error' ? 'border border-red-500/20 bg-red-500/5 text-red-400'
                    : a.type === 'warn' ? 'border border-amber-500/20 bg-amber-500/5 text-amber-400'
                    : 'border border-border/30 bg-muted/20 text-muted-foreground'
                  }`}
                >
                  {a.type === 'error' || a.type === 'warn'
                    ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    : <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                  }
                  <span className="flex-1">{a.node}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
