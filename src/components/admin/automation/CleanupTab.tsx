import { useState } from 'react';
import { Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cleanupProcessedData, purgeBacklog, fullPipelineReset } from '@/services/pipelineCleanup';
import type { PipelineDiagnostics } from '@/hooks/usePipelineDiagnostics';

const CLEANUP_OPTIONS = [
  { label: '24 h', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
  { label: '30 dias', hours: 720 },
] as const;

interface CleanupTabProps {
  diagnostics?: PipelineDiagnostics | null;
}

export function CleanupTab({ diagnostics }: CleanupTabProps) {
  const { toast } = useToast();
  const [cleanupHours, setCleanupHours] = useState(72);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const handleCleanup = async () => {
    setCleaning(true); setCleanupResult(null);
    try {
      const result = await cleanupProcessedData(cleanupHours);
      setCleanupResult(result.summary);
      toast({
        title: result.total > 0 ? `${result.total} registos removidos` : 'Nada para limpar',
        description: `Staging: ${result.stagingDeleted} · Clusters: ${result.clustersDeleted} · Curados: ${result.curatedCleaned}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro';
      setCleanupResult('Erro: ' + msg);
      toast({ title: 'Erro na limpeza', description: msg, variant: 'destructive' });
    } finally { setCleaning(false); }
  };

  const handleBacklogPurge = async () => {
    if (!confirm('Remove staging não processado e clusters órfãos antigos. Não afeta curados draft/ready. Continuar?')) return;
    setCleaning(true); setCleanupResult(null);
    try {
      const result = await purgeBacklog(cleanupHours);
      setCleanupResult(result.summary);
      toast({ title: result.total > 0 ? `${result.total} registos removidos` : 'Nada para limpar' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro';
      setCleanupResult('Erro: ' + msg);
      toast({ title: 'Erro no purge', description: msg, variant: 'destructive' });
    } finally { setCleaning(false); }
  };

  const handleFullReset = async () => {
    if (!confirm('ATENÇÃO: Apaga TODOS os dados do pipeline (staging, clusters, curados não publicados). Continuar?')) return;
    setCleaning(true); setCleanupResult(null);
    try {
      const result = await fullPipelineReset();
      setCleanupResult(result.summary);
      toast({ title: result.total > 0 ? `${result.total} registos removidos` : 'Nada apagado' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro';
      setCleanupResult('Erro: ' + msg);
      toast({ title: 'Erro no reset', description: msg, variant: 'destructive' });
    } finally { setCleaning(false); }
  };

  return (
    <div className="space-y-4">
      {diagnostics && (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground text-xs">Estado atual</p>
          <p>{diagnostics.staging.unprocessed} staging não processados · {diagnostics.clusters.highConfidence} clusters ≥60% · {diagnostics.curated.ready} curados prontos</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Corte de tempo</label>
        <div className="flex flex-wrap gap-1.5">
          {CLEANUP_OPTIONS.map((opt) => (
            <Button
              key={opt.hours}
              size="sm"
              variant={cleanupHours === opt.hours ? 'default' : 'outline'}
              className="h-7 px-3 text-xs"
              onClick={() => setCleanupHours(opt.hours)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-amber-500/40 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          disabled={cleaning}
          onClick={() => void handleCleanup()}
        >
          {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Limpeza segura
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
          disabled={cleaning}
          onClick={() => void handleBacklogPurge()}
        >
          {cleaning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Purgar backlog
        </Button>
      </div>

      {cleanupResult && (
        <p className="text-xs text-foreground">{cleanupResult}</p>
      )}

      <div className="border-t border-border/40 pt-3">
        <p className="mb-2 text-[11px] text-muted-foreground">
          Reset completo: apaga <strong>todos</strong> os dados do pipeline (staging, clusters, curados não publicados).
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
          disabled={cleaning}
          onClick={() => void handleFullReset()}
        >
          <Trash2 className="h-3 w-3" />
          Reset completo do pipeline
        </Button>
      </div>
    </div>
  );
}
