import { useState } from 'react';
import {
  Workflow, Play, Pause, RefreshCw, ExternalLink,
  CheckCircle2, XCircle, Clock, Loader2, Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  activateWorkflow,
  deactivateWorkflow,
  executeWorkflow,
  CronWorkflowError,
} from '@/services/n8n';
import type { N8nWorkflow } from '@/types/automation';

interface N8nWorkflowsPanelProps {
  workflows: N8nWorkflow[];
  isConnected: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function N8nWorkflowsPanel({
  workflows,
  isConnected,
  onRefresh,
  isRefreshing = false,
}: N8nWorkflowsPanelProps) {
  const { toast } = useToast();
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());

  const activeCount = workflows.filter((w) => w.active === true).length;

  const handleToggle = async (wf: N8nWorkflow) => {
    const id = String(wf.id);
    setTogglingIds((prev) => new Set([...prev, id]));
    try {
      if (wf.active) {
        await deactivateWorkflow(id);
        toast({ title: 'Workflow desativado', description: wf.name ?? id });
      } else {
        await activateWorkflow(wf);
        toast({ title: 'Workflow ativado', description: wf.name ?? id });
      }
      onRefresh();
    } catch (err) {
      toast({
        title: 'Erro ao alterar workflow',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleExecute = async (wf: N8nWorkflow) => {
    const id = String(wf.id);
    setExecutingIds((prev) => new Set([...prev, id]));
    try {
      const result = await executeWorkflow(wf);
      toast({ title: 'Workflow executado', description: `${wf.name ?? id} (${result.method})` });
    } catch (err) {
      if (err instanceof CronWorkflowError) {
        toast({
          title: 'Workflow automático',
          description: `${wf.name ?? id} executa automaticamente por cron/schedule no n8n.`,
        });
        return;
      }
      toast({
        title: 'Erro na execução',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-5 h-5 text-gray-500" />
            <CardTitle className="text-base font-semibold text-gray-400">Workflows n8n</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-6">
            n8n offline — impossível listar workflows.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Workflow className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-base font-semibold text-white">Workflows n8n</CardTitle>
            <Badge variant="outline" className="text-xs px-2 py-0.5 border-slate-600 text-slate-400">
              {activeCount}/{workflows.length} ativos
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            onClick={onRefresh}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {workflows.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-3">
            Nenhum workflow encontrado no n8n.
          </p>
        ) : (
          workflows.map((wf) => {
            const id = String(wf.id);
            const isToggling = togglingIds.has(id);
            const isExecuting = executingIds.has(id);

            return (
              <div
                key={id}
                className={`rounded-lg border p-3 transition-all ${
                  wf.active
                    ? 'border-slate-600/50 bg-slate-800/80'
                    : 'border-slate-700/30 bg-slate-900/50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {wf.active ? (
                      <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Pause className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-white block truncate">
                        {wf.name ?? `Workflow #${id}`}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-600 hidden sm:inline">ID: {id}</span>
                        {wf.updatedAt && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(wf.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-cyan-400"
                          disabled={isExecuting}
                          onClick={() => void handleExecute(wf)}
                        >
                          {isExecuting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Executar agora</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 w-8 p-0 ${
                            wf.active
                              ? 'text-emerald-400 hover:text-amber-400'
                              : 'text-gray-500 hover:text-emerald-400'
                          }`}
                          disabled={isToggling}
                          onClick={() => void handleToggle(wf)}
                        >
                          {isToggling ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : wf.active ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {wf.active ? 'Desativar' : 'Ativar'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
