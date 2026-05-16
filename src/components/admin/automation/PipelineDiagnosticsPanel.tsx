import { RefreshCw, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';
import type { PipelineSearchConfig } from '@/hooks/usePipelineConfig';

interface Props {
  diagnostics: PipelineDiagnostics | undefined;
  diagnosticsError: Error | null | undefined;
  activeConfig: PipelineSearchConfig | null;
  onRefetch: () => void;
}

export function PipelineDiagnosticsPanel({ diagnostics, diagnosticsError, activeConfig, onRefetch }: Props) {
  if (!diagnostics && !diagnosticsError) return null;

  return (
    <>
      {diagnosticsError instanceof Error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-300">
          Falha ao consultar o estado real do pipeline no banco: {diagnosticsError.message}
        </div>
      )}

      {diagnostics && (
        <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] font-medium text-foreground/80">Estado do Pipeline (DB)</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={onRefetch}
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
            <span className="text-muted-foreground">
              Staging:{' '}
              <span className={diagnostics.staging.total > 0 ? 'text-blue-500 font-medium' : 'text-muted-foreground'}>
                {diagnostics.staging.total}
              </span>
              {diagnostics.staging.unprocessed > 0 && (
                <span className="text-amber-400 ml-1">({diagnostics.staging.unprocessed} não processados)</span>
              )}
            </span>
            <span className="text-muted-foreground">
              Clusters:{' '}
              <span className={diagnostics.clusters.total > 0 ? 'text-blue-500 font-medium' : 'text-muted-foreground'}>
                {diagnostics.clusters.total}
              </span>
              {diagnostics.clusters.highConfidence > 0 && (
                <span className="text-primary ml-1">({diagnostics.clusters.highConfidence} ≥60%)</span>
              )}
            </span>
            <span className="text-muted-foreground">
              Curados:{' '}
              <span className={diagnostics.curated.total > 0 ? 'text-blue-500 font-medium' : 'text-muted-foreground'}>
                {diagnostics.curated.total}
              </span>
              {diagnostics.curated.ready > 0 && <span className="text-primary ml-1">({diagnostics.curated.ready} prontos)</span>}
              {diagnostics.curated.draft > 0 && <span className="text-amber-400 ml-1">({diagnostics.curated.draft} rascunho)</span>}
            </span>
            {diagnostics.configLabel && (
              <span className="text-muted-foreground">
                Editorial: <span className="text-foreground/80">{diagnostics.configLabel}</span>
                {diagnostics.themeRuleCount > 0 && (
                  <span className="text-blue-500 ml-1">({diagnostics.themeRuleCount} tema(s))</span>
                )}
              </span>
            )}
            {diagnostics.configLanguage && diagnostics.configRegion && (
              <span className="text-muted-foreground">
                Locale: <span className="text-foreground/80">{diagnostics.configLanguage} / {diagnostics.configRegion}</span>
              </span>
            )}
          </div>

          {diagnostics.defaultPostTags.length > 0 && (
            <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              <span>Tags finais:</span>
              {diagnostics.defaultPostTags.map((tag) => (
                <Badge key={`diag-${tag}`} variant="outline" className="px-1 py-0 text-[9px] border-primary/25 text-primary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {diagnostics.configTags.length > 0 && activeConfig && (() => {
            const dbTags   = [...diagnostics.configTags].sort().join(',');
            const dashTags = [...activeConfig.tags].sort().join(',');
            return dbTags === dashTags ? (
              <div className="flex items-center gap-1 text-[10px] text-primary">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Tags sincronizadas: {diagnostics.configTags.join(', ')}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <AlertTriangle className="w-2.5 h-2.5" />
                Tags no DB diferem da dashboard! DB: [{diagnostics.configTags.join(', ')}] · Dashboard: [{activeConfig.tags.join(', ')}]
              </div>
            );
          })()}

          {diagnostics.configTags.length === 0 && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400">
              <AlertTriangle className="w-2.5 h-2.5" />
              Nenhuma config ativa no DB — n8n usará tags padrão (IA, cibersegurança, automação)
            </div>
          )}
          {diagnostics.staging.total > 0 && diagnostics.clusters.total === 0 && (
            <div className="text-[10px] text-amber-400">
              ⚠ {diagnostics.staging.total} artigos em staging mas 0 clusters — WF-02 ainda não processou ou falhou
            </div>
          )}
          {diagnostics.clusters.highConfidence > 0 && diagnostics.curated.total === 0 && (
            <div className="text-[10px] text-red-400">
              ⚠ {diagnostics.clusters.highConfidence} cluster(s) com confiança ≥60% mas 0 curados — WF-03 (IA) ainda não executou ou a ANTHROPIC_API_KEY não está configurada no n8n
            </div>
          )}
          {diagnostics.staging.total === 0 && diagnostics.clusters.total === 0 && diagnostics.curated.total === 0 && (
            <div className="text-[10px] text-muted-foreground">
              Pipeline vazio — execute os workflows ou aguarde os crons automáticos
            </div>
          )}
        </div>
      )}
    </>
  );
}
