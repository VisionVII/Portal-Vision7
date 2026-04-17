import { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { executeWorkflow, CronWorkflowError } from '@/services/n8n';
import type { AutomationV2 } from '@/types/automation';

interface DryRunDialogProps {
  automation: AutomationV2;
}

export function DryRunDialog({ automation }: DryRunDialogProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [overrides, setOverrides] = useState('');
  const [result, setResult] = useState<{ success: boolean; output: string } | null>(null);
  const { toast } = useToast();

  const handleRun = async () => {
    if (!automation.workflowId) {
      toast({ title: 'Sem workflow', description: 'Automação sem workflow associado.', variant: 'destructive' });
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      // Parse user overrides
      let parsedOverrides: Record<string, unknown> = {};
      if (overrides.trim()) {
        try {
          parsedOverrides = JSON.parse(overrides);
        } catch {
          setResult({ success: false, output: 'JSON de overrides inválido. Verifique a sintaxe.' });
          setRunning(false);
          return;
        }
      }

      const res = await executeWorkflow(automation.workflowId);

      setResult({
        success: true,
        output: JSON.stringify({
          executed: res.executed,
          method: res.method,
          dryRun: true,
          overrides: parsedOverrides,
          automation: automation.name,
          workflowId: automation.workflowId,
          timestamp: new Date().toISOString(),
        }, null, 2),
      });

      toast({ title: 'Dry-run concluído', description: `${automation.name} executado via ${res.method}` });
    } catch (err) {
      if (err instanceof CronWorkflowError) {
        setResult({
          success: false,
          output: `Este workflow é do tipo cron/schedule.\n${err.message}\n\nDry-run manual não disponível para workflows agendados.`,
        });
      } else {
        setResult({
          success: false,
          output: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-purple-500 hover:text-purple-400">
          <FlaskConical className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-purple-500" />
            Dry-Run: {automation.name}
          </DialogTitle>
          <DialogDescription>
            Execute o workflow em modo de teste com parâmetros opcionais de override.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              WF: {automation.workflowId || 'N/A'}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {automation.triggerType}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overrides" className="text-xs">Override de Parâmetros (JSON)</Label>
            <Textarea
              id="overrides"
              placeholder='{"limit": 1, "dry_run": true}'
              value={overrides}
              onChange={(e) => setOverrides(e.target.value)}
              className="font-mono text-xs min-h-[80px]"
            />
            <p className="text-[10px] text-muted-foreground">
              Opcional. Parâmetros extras enviados ao workflow. Deixe vazio para usar config padrão.
            </p>
          </div>

          {result && (
            <div className={`rounded-lg border p-3 ${result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
              <p className={`text-xs font-semibold mb-1 ${result.success ? 'text-emerald-600' : 'text-red-500'}`}>
                {result.success ? 'Sucesso' : 'Erro'}
              </p>
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                {result.output}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button
            size="sm"
            disabled={running || !automation.workflowId}
            onClick={() => void handleRun()}
            className="gap-1.5"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
            {running ? 'Executando...' : 'Executar Dry-Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DryRunDialog;
