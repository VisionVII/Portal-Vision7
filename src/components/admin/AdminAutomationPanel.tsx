import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Clock3,
  ExternalLink,
  Play,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAutomations } from '@/hooks/useAutomations';
import { useToast } from '@/hooks/use-toast';
import {
  activateWorkflow,
  deactivateWorkflow,
  executeWorkflow,
  getExecutionById,
  getExecutions,
  getN8nConfigStatus,
  getWorkflows,
} from '@/services/n8n';
import type { Automation, N8nExecution, N8nWorkflow } from '@/types/automation';

const emptyForm = {
  id: '',
  name: '',
  workflowId: '',
  active: true,
  interval: 30,
  rssFeeds: [''],
  keywords: [] as string[],
  prompt: '',
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-PT');
};

const formatDuration = (execution: N8nExecution) => {
  if (!execution.startedAt || !execution.stoppedAt) return '—';
  const start = new Date(execution.startedAt).getTime();
  const end = new Date(execution.stoppedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '—';
  return `${Math.round((end - start) / 1000)}s`;
};

const normalizeExecutionStatus = (execution: N8nExecution) => {
  if (execution.status) return execution.status;
  if (execution.finished === false) return 'running';
  return 'success';
};

const AdminAutomationPanel = () => {
  const { toast } = useToast();

  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<N8nExecution | null>(null);
  const [formState, setFormState] = useState(emptyForm);
  const [isBusy, setIsBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [n8nError, setN8nError] = useState<string | null>(null);

  const { automations, createAutomation, updateAutomation, deleteAutomation, isSaving } = useAutomations();

  const n8nConfig = useMemo(() => getN8nConfigStatus(), []);

  const refreshN8nData = useCallback(async (showToast = false) => {
    setIsBusy(true);
    try {
      const [workflowData, executionData] = await Promise.all([getWorkflows(), getExecutions()]);
      setWorkflows(workflowData);
      setExecutions(executionData);
      setSelectedExecution((current) => {
        if (!current) return executionData[0] ?? null;
        return executionData.find((item) => String(item.id) === String(current.id)) ?? current;
      });
      setLastSync(new Date().toLocaleTimeString('pt-PT'));
      setN8nError(null);
      if (showToast) {
        toast({ title: 'n8n sincronizado', description: 'Workflows e execuções atualizados com sucesso.' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao contactar a instância do n8n.';
      setN8nError(message);
      if (showToast) {
        toast({ title: 'Falha na sincronização', description: message, variant: 'destructive' });
      }
    } finally {
      setIsBusy(false);
    }
  }, [toast]);

  useEffect(() => {
    void refreshN8nData();
    const interval = window.setInterval(() => void refreshN8nData(), 10000);
    return () => window.clearInterval(interval);
  }, [refreshN8nData]);

  const lastExecutionByWorkflow = useMemo(() => {
    const map = new Map<string, N8nExecution>();
    executions.forEach((execution) => {
      const key = String(execution.workflowId ?? '');
      if (key && !map.has(key)) map.set(key, execution);
    });
    return map;
  }, [executions]);

  const handleSaveAutomation = async () => {
    if (!formState.name.trim() || !formState.workflowId.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Defina um nome e associe um workflow do n8n.', variant: 'destructive' });
      return;
    }
    const payload = {
      name: formState.name.trim(),
      workflowId: formState.workflowId.trim(),
      active: formState.active,
      interval: Number(formState.interval) || 30,
      rssFeeds: formState.rssFeeds.map((i) => i.trim()).filter(Boolean),
      keywords: formState.keywords.map((i) => i.trim()).filter(Boolean),
      prompt: formState.prompt.trim(),
    };
    if (formState.id) {
      await updateAutomation({ id: formState.id, ...payload });
    } else {
      await createAutomation(payload);
    }
    setFormState(emptyForm);
  };

  const handleEditAutomation = (automation: Automation) => {
    setFormState({
      id: automation.id,
      name: automation.name,
      workflowId: automation.workflowId,
      active: automation.active,
      interval: automation.interval,
      rssFeeds: automation.rssFeeds.length ? automation.rssFeeds : [''],
      keywords: automation.keywords,
      prompt: automation.prompt,
    });
  };

  const handleDeleteAutomation = async (id: string) => {
    await deleteAutomation(id);
    if (formState.id === id) setFormState(emptyForm);
  };

  const handleWorkflowToggle = async (workflowId: string, shouldActivate: boolean) => {
    try {
      if (shouldActivate) await activateWorkflow(workflowId);
      else await deactivateWorkflow(workflowId);
      toast({ title: shouldActivate ? 'Workflow ativado' : 'Workflow desativado', description: `Workflow ${workflowId} atualizado.` });
      await refreshN8nData();
    } catch (error) {
      toast({ title: 'Falha ao atualizar workflow', description: error instanceof Error ? error.message : 'Erro.', variant: 'destructive' });
    }
  };

  const handleExecuteWorkflow = async (workflowId: string, source = 'workflow') => {
    try {
      await executeWorkflow(workflowId);
      toast({ title: source === 'test' ? 'Teste disparado' : 'Execução iniciada', description: `Workflow ${workflowId} enviado para execução.` });
      await refreshN8nData();
    } catch (error) {
      toast({ title: 'Falha ao executar', description: error instanceof Error ? error.message : 'Erro.', variant: 'destructive' });
    }
  };

  const handleOpenExecution = async (executionId: string) => {
    try {
      const details = await getExecutionById(executionId);
      setSelectedExecution(details);
    } catch {
      setSelectedExecution(executions.find((i) => String(i.id) === executionId) ?? null);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{lastSync ? `Sync ${lastSync}` : 'Sem sync'}</Badge>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refreshN8nData(true)} disabled={isBusy}>
          <RefreshCcw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
          {isBusy ? 'A sincronizar...' : 'Atualizar'}
        </Button>
        <a href={n8nConfig.baseUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" />Abrir n8n</Button>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-2.5 p-4">
            <Workflow className="h-6 w-6 text-primary-600" />
            <div>
              <p className="text-[11px] text-muted-foreground">Workflows</p>
              <p className="text-xl font-bold text-foreground">{workflows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2.5 p-4">
            <Bot className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-[11px] text-muted-foreground">Automações</p>
              <p className="text-xl font-bold text-foreground">{automations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2.5 p-4">
            <Activity className="h-6 w-6 text-secondary-500" />
            <div>
              <p className="text-[11px] text-muted-foreground">Execuções</p>
              <p className="text-xl font-bold text-foreground">{executions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2.5 p-4">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
            <div>
              <p className="text-[11px] text-muted-foreground">Segurança</p>
              <p className="text-xs font-semibold text-foreground">{n8nConfig.apiKeyConfigured ? 'Bearer ativo' : 'Pendente'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {n8nError && (
        <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <p className="font-semibold text-foreground">Ligação ao n8n com atenção</p>
              <p className="text-muted-foreground">{n8nError}</p>
              <p className="mt-1 text-muted-foreground">Confirme os Secrets <code>N8N_BASE_URL</code> e <code>N8N_API_KEY</code> em Supabase → Edge Functions.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflows + Logs */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workflows do n8n</CardTitle>
            <CardDescription className="text-xs">Ative, desative e execute workflows em tempo real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {workflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum workflow retornado.</p>
            ) : workflows.map((wf) => {
              const wfId = String(wf.id);
              const lastExec = lastExecutionByWorkflow.get(wfId);
              return (
                <div key={wfId} className="rounded-xl border border-border p-3.5 shadow-sm">
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{wf.name}</p>
                        <Badge variant={wf.active ? 'default' : 'secondary'} className="text-[10px]">{wf.active ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">ID: {wfId} • Última: {lastExec ? formatDateTime(lastExec.startedAt) : '—'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void handleWorkflowToggle(wfId, true)}>Ativar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void handleWorkflowToggle(wfId, false)}>Desativar</Button>
                      <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => void handleExecuteWorkflow(wfId)}><Play className="h-3 w-3" />Executar</Button>
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => lastExec && void handleOpenExecution(String(lastExec.id))}>Detalhes</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Logs de execução</CardTitle>
            <CardDescription className="text-xs">Polling automático a cada 10s.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {executions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem execuções recentes.</p>
            ) : executions.map((exec) => {
              const status = normalizeExecutionStatus(exec);
              return (
                <button key={String(exec.id)} type="button" onClick={() => void handleOpenExecution(String(exec.id))} className="w-full rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-muted/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">#{exec.id}</span>
                    <Badge variant={status === 'error' ? 'destructive' : status === 'running' ? 'secondary' : 'default'} className="text-[10px]">{status}</Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatDateTime(exec.startedAt)}</span>
                    <span>{formatDuration(exec)}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Config form + saved automations */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuração de automação</CardTitle>
            <CardDescription className="text-xs">Feeds RSS, palavras-chave, prompt e intervalo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="panel-automation-name" className="text-xs">Nome</Label>
              <Input id="panel-automation-name" value={formState.name} onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Curadoria IA manhã" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="panel-workflow-select" className="text-xs">Workflow</Label>
                <select id="panel-workflow-select" value={formState.workflowId} onChange={(e) => setFormState((p) => ({ ...p, workflowId: e.target.value }))} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                  <option value="">Selecionar workflow</option>
                  {workflows.map((wf) => <option key={String(wf.id)} value={String(wf.id)}>{wf.name} ({wf.id})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="panel-interval" className="text-xs">Intervalo (min)</Label>
                <Input id="panel-interval" type="number" min={1} value={formState.interval} onChange={(e) => setFormState((p) => ({ ...p, interval: Number(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">RSS feeds</Label>
                <Button type="button" variant="outline" size="sm" className="h-6 gap-1 text-[11px]" onClick={() => setFormState((p) => ({ ...p, rssFeeds: [...p.rssFeeds, ''] }))}><Plus className="h-3 w-3" />Feed</Button>
              </div>
              {formState.rssFeeds.map((feed, i) => (
                <div key={`feed-${i}`} className="flex gap-1.5">
                  <Input value={feed} onChange={(e) => setFormState((p) => ({ ...p, rssFeeds: p.rssFeeds.map((f, fi) => fi === i ? e.target.value : f) }))} placeholder="https://site.com/feed.xml" />
                  {formState.rssFeeds.length > 1 && (
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setFormState((p) => ({ ...p, rssFeeds: p.rssFeeds.filter((_, fi) => fi !== i) }))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panel-keywords" className="text-xs">Palavras-chave</Label>
              <Input id="panel-keywords" value={formState.keywords.join(', ')} onChange={(e) => setFormState((p) => ({ ...p, keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) }))} placeholder="IA, automação, negócios" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panel-prompt" className="text-xs">Prompt da IA</Label>
              <Textarea id="panel-prompt" value={formState.prompt} onChange={(e) => setFormState((p) => ({ ...p, prompt: e.target.value }))} className="min-h-[100px]" placeholder="Descreva como a automação deve selecionar e preparar conteúdos." />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => void handleSaveAutomation()} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" />{isSaving ? 'A guardar...' : formState.id ? 'Guardar' : 'Criar'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                if (formState.workflowId) { void handleExecuteWorkflow(formState.workflowId, 'test'); return; }
                toast({ title: 'Associe um workflow', description: 'Selecione um workflow antes de testar.', variant: 'destructive' });
              }}><Play className="h-3.5 w-3.5" />Testar</Button>
              <Button size="sm" variant="ghost" onClick={() => setFormState(emptyForm)}>Limpar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Execução & configs salvas</CardTitle>
            <CardDescription className="text-xs">JSON do log e automações registadas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-slate-950 p-2.5 text-[11px] text-slate-100">
              <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap break-words">
                {selectedExecution ? JSON.stringify(selectedExecution, null, 2) : 'Selecione uma execução para ver detalhes.'}
              </pre>
            </div>
            {automations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Crie a primeira automação acima.</p>
            ) : automations.map((auto) => (
              <div key={auto.id} className="rounded-xl border border-border p-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{auto.name}</p>
                      <Badge variant={auto.active ? 'default' : 'secondary'} className="text-[10px]">{auto.active ? 'Ativa' : 'Pausa'}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">WF: {auto.workflowId} • {formatDateTime(auto.createdAt)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {auto.keywords.map((kw) => <span key={kw} className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{kw}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleEditAutomation(auto)}>Editar</Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => void handleExecuteWorkflow(auto.workflowId, 'test')}>Executar</Button>
                    <Button type="button" variant="destructive" size="sm" className="h-7 text-xs" onClick={() => void handleDeleteAutomation(auto.id)}>Excluir</Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" />Intervalo: {auto.interval}min • Feeds: {auto.rssFeeds.length}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAutomationPanel;
