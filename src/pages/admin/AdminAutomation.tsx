import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
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
import { useAuth } from '@/contexts/AuthContext';
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

const ALLOWED_ROLES = ['super_admin', 'admin', 'editor'];

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

const AdminAutomation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, roles, canAccessDashboard, isLoading: authLoading, isAccessReady } = useAuth();

  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<N8nExecution | null>(null);
  const [formState, setFormState] = useState(emptyForm);
  const [isBusy, setIsBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [n8nError, setN8nError] = useState<string | null>(null);

  const { automations, createAutomation, updateAutomation, deleteAutomation, isSaving } = useAutomations();

  const n8nConfig = useMemo(() => getN8nConfigStatus(), []);
  const hasAllowedRole = useMemo(() => roles.some((role) => ALLOWED_ROLES.includes(role)), [roles]);

  useEffect(() => {
    if (!authLoading && isAccessReady && (!user || !canAccessDashboard || !hasAllowedRole)) {
      navigate('/admin/login');
    }
  }, [authLoading, canAccessDashboard, hasAllowedRole, isAccessReady, navigate, user]);

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
    const interval = window.setInterval(() => {
      void refreshN8nData();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [refreshN8nData]);

  const lastExecutionByWorkflow = useMemo(() => {
    const map = new Map<string, N8nExecution>();
    executions.forEach((execution) => {
      const key = String(execution.workflowId ?? '');
      if (key && !map.has(key)) {
        map.set(key, execution);
      }
    });
    return map;
  }, [executions]);

  const handleSaveAutomation = async () => {
    if (!formState.name.trim() || !formState.workflowId.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Defina um nome e associe um workflow do n8n.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: formState.name.trim(),
      workflowId: formState.workflowId.trim(),
      active: formState.active,
      interval: Number(formState.interval) || 30,
      rssFeeds: formState.rssFeeds.map((item) => item.trim()).filter(Boolean),
      keywords: formState.keywords.map((item) => item.trim()).filter(Boolean),
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
    if (formState.id === id) {
      setFormState(emptyForm);
    }
  };

  const handleWorkflowToggle = async (workflowId: string, shouldActivate: boolean) => {
    try {
      if (shouldActivate) {
        await activateWorkflow(workflowId);
      } else {
        await deactivateWorkflow(workflowId);
      }
      toast({
        title: shouldActivate ? 'Workflow ativado' : 'Workflow desativado',
        description: `O workflow ${workflowId} foi atualizado no n8n.`,
      });
      await refreshN8nData();
    } catch (error) {
      toast({
        title: 'Falha ao atualizar workflow',
        description: error instanceof Error ? error.message : 'Não foi possível alterar o estado do workflow.',
        variant: 'destructive',
      });
    }
  };

  const handleExecuteWorkflow = async (workflowId: string, source = 'workflow') => {
    try {
      await executeWorkflow(workflowId);
      toast({
        title: source === 'test' ? 'Teste disparado' : 'Execução iniciada',
        description: `O workflow ${workflowId} foi enviado para execução manual.`,
      });
      await refreshN8nData();
    } catch (error) {
      toast({
        title: 'Falha ao executar',
        description: error instanceof Error ? error.message : 'Não foi possível disparar o workflow.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenExecution = async (executionId: string) => {
    try {
      const details = await getExecutionById(executionId);
      setSelectedExecution(details);
    } catch {
      const fallback = executions.find((item) => String(item.id) === executionId) ?? null;
      setSelectedExecution(fallback);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user || !canAccessDashboard || !hasAllowedRole) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/40 dark:from-neutral-950 dark:via-neutral-950 dark:to-primary-950/20">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard" className="text-primary transition-colors hover:text-primary-700 dark:hover:text-primary-400">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-600">Vision Automations</p>
              <h1 className="text-xl font-bold text-foreground">Painel n8n & monitorização</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{lastSync ? `Sync ${lastSync}` : 'Sem sync'}</Badge>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void refreshN8nData(true)} disabled={isBusy}>
              <RefreshCcw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
              {isBusy ? 'A sincronizar...' : 'Atualizar'}
            </Button>
            <a href={n8nConfig.baseUrl} target="_blank" rel="noreferrer" className="hidden sm:block">
              <Button size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir n8n
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Workflow className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-sm text-muted-foreground">Workflows</p>
                <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Bot className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Automações</p>
                <p className="text-2xl font-bold text-foreground">{automations.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Activity className="h-8 w-8 text-secondary-500" />
              <div>
                <p className="text-sm text-muted-foreground">Execuções recentes</p>
                <p className="text-2xl font-bold text-foreground">{executions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <ShieldCheck className="h-8 w-8 text-violet-600" />
              <div>
                <p className="text-sm text-muted-foreground">Segurança</p>
                <p className="text-sm font-semibold text-foreground">{n8nConfig.apiKeyConfigured ? 'Bearer ativo' : 'Configuração pendente'}</p>
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
                <p className="mt-1 text-muted-foreground">Confirme os Secrets <code>N8N_BASE_URL</code> e <code>N8N_API_KEY</code> em Supabase → Edge Functions → Manage Secrets.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Workflows do n8n</CardTitle>
              <CardDescription>
                Ative, desative, execute manualmente e acompanhe o último estado de cada automação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum workflow retornado pela instância configurada.</p>
              ) : workflows.map((workflow) => {
                const workflowId = String(workflow.id);
                const lastExecution = lastExecutionByWorkflow.get(workflowId);
                return (
                  <div key={workflowId} className="rounded-2xl border border-border p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{workflow.name}</p>
                          <Badge variant={workflow.active ? 'default' : 'secondary'}>
                            {workflow.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">ID: {workflowId}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Última execução: {lastExecution ? formatDateTime(lastExecution.startedAt) : 'Sem histórico recente'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void handleWorkflowToggle(workflowId, true)}>
                          Ativar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleWorkflowToggle(workflowId, false)}>
                          Desativar
                        </Button>
                        <Button size="sm" className="gap-2" onClick={() => void handleExecuteWorkflow(workflowId)}>
                          <Play className="h-4 w-4" />
                          Executar agora
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => lastExecution && void handleOpenExecution(String(lastExecution.id))}>
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs e monitoramento</CardTitle>
              <CardDescription>Atualização automática a cada 10 segundos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {executions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem execuções recentes no momento.</p>
              ) : executions.map((execution) => {
                const status = normalizeExecutionStatus(execution);
                return (
                  <button
                    key={String(execution.id)}
                    type="button"
                    onClick={() => void handleOpenExecution(String(execution.id))}
                    className="w-full rounded-2xl border border-border p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">Execução #{execution.id}</span>
                      <Badge variant={status === 'error' ? 'destructive' : status === 'running' ? 'secondary' : 'default'}>
                        {status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDateTime(execution.startedAt)}</span>
                      <span>{formatDuration(execution)}</span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de automação</CardTitle>
              <CardDescription>
                Defina feeds RSS, palavras-chave, prompt e intervalo para cada fluxo editorial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="automation-name">Nome da automação</Label>
                <Input
                  id="automation-name"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ex.: Curadoria IA manhã"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workflow-select">Workflow do n8n</Label>
                  <select
                    id="workflow-select"
                    value={formState.workflowId}
                    onChange={(event) => setFormState((prev) => ({ ...prev, workflowId: event.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecionar workflow</option>
                    {workflows.map((workflow) => (
                      <option key={String(workflow.id)} value={String(workflow.id)}>
                        {workflow.name} ({workflow.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo (minutos)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min={1}
                    value={formState.interval}
                    onChange={(event) => setFormState((prev) => ({ ...prev, interval: Number(event.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>RSS feeds</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setFormState((prev) => ({ ...prev, rssFeeds: [...prev.rssFeeds, ''] }))}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar feed
                  </Button>
                </div>
                <div className="space-y-2">
                  {formState.rssFeeds.map((feed, index) => (
                    <div key={`feed-${index}`} className="flex gap-2">
                      <Input
                        value={feed}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            rssFeeds: prev.rssFeeds.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                          }))
                        }
                        placeholder="https://site.com/feed.xml"
                      />
                      {formState.rssFeeds.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              rssFeeds: prev.rssFeeds.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Palavras-chave</Label>
                <Input
                  id="keywords"
                  value={formState.keywords.join(', ')}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      keywords: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="IA, automação, negócios digitais"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt da IA</Label>
                <Textarea
                  id="prompt"
                  value={formState.prompt}
                  onChange={(event) => setFormState((prev) => ({ ...prev, prompt: event.target.value }))}
                  className="min-h-[140px]"
                  placeholder="Descreva como a automação deve selecionar, resumir e preparar conteúdos."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="gap-2" onClick={() => void handleSaveAutomation()} disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? 'A guardar...' : formState.id ? 'Guardar alterações' : 'Criar automação'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (formState.workflowId) {
                      void handleExecuteWorkflow(formState.workflowId, 'test');
                      return;
                    }
                    toast({ title: 'Associe um workflow', description: 'Selecione um workflow antes de testar.', variant: 'destructive' });
                  }}
                >
                  <Play className="h-4 w-4" />
                  Testar automação
                </Button>
                <Button type="button" variant="ghost" onClick={() => setFormState(emptyForm)}>
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execução selecionada & configs salvas</CardTitle>
              <CardDescription>
                Veja o JSON completo do log escolhido e mantenha as automações organizadas para produção.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-slate-950 p-3 text-xs text-slate-100">
                <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap break-words">
                  {selectedExecution ? JSON.stringify(selectedExecution, null, 2) : 'Selecione uma execução para ver os detalhes completos.'}
                </pre>
              </div>

              <div className="space-y-3">
                {automations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ainda não existem automações registadas. Crie a primeira acima.</p>
                ) : automations.map((automation) => (
                  <div key={automation.id} className="rounded-2xl border border-border p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{automation.name}</p>
                          <Badge variant={automation.active ? 'default' : 'secondary'}>
                            {automation.active ? 'Ativa' : 'Pausa'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Workflow: {automation.workflowId}</p>
                        <p className="text-xs text-muted-foreground">Criada em {formatDateTime(automation.createdAt)}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {automation.keywords.map((keyword) => (
                            <span key={keyword} className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleEditAutomation(automation)}>
                          Editar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleExecuteWorkflow(automation.workflowId, 'test')}>
                          Executar
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => void handleDeleteAutomation(automation.id)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Intervalo: {automation.interval} min • Feeds: {automation.rssFeeds.length}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminAutomation;
