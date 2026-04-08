import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  FlaskConical,
  KeyRound,
  Play,
  Plus,
  Power,
  RefreshCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
  Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAutomations } from '@/hooks/useAutomations';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  activateWorkflow,
  checkN8nHealth,
  deactivateWorkflow,
  executeWorkflow,
  getExecutionById,
  getExecutions,
  getN8nConfigStatus,
  getWorkflows,
} from '@/services/n8n';
import {
  activateN8nCredential,
  createN8nCredential,
  deleteN8nCredential,
  listN8nCredentials,
  revokeN8nCredential,
  triggerN8nCredentialReminders,
  type N8nCredentialRow,
} from '@/services/n8nSettings';
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

const getDaysUntil = (value?: string) => {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
};

const normalizeExecutionStatus = (execution: N8nExecution) => {
  if (execution.status) return execution.status;
  if (execution.finished === false) return 'running';
  return 'success';
};

const AdminAutomationPanel = ({ isActive = true }: { isActive?: boolean }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<N8nExecution | null>(null);
  const [formState, setFormState] = useState(emptyForm);
  const [isBusy, setIsBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [n8nError, setN8nError] = useState<string | null>(null);
  const [n8nHealthy, setN8nHealthy] = useState<boolean | null>(null);
  const [credentials, setCredentials] = useState<N8nCredentialRow[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [newCredentialValue, setNewCredentialValue] = useState('');
  const [newCredentialDurationDays, setNewCredentialDurationDays] = useState<7 | 30 | 60 | 90>(30);
  const [newCredentialNotes, setNewCredentialNotes] = useState('');
  const [newCredentialReminderEmail, setNewCredentialReminderEmail] = useState('');
  const [newCredentialRemindDaysBefore, setNewCredentialRemindDaysBefore] = useState<7 | 30 | 60 | 90>(7);
  const [isSavingCredential, setIsSavingCredential] = useState(false);

  const { automations, createAutomation, updateAutomation, deleteAutomation, isSaving } = useAutomations();

  const n8nConfig = useMemo(() => getN8nConfigStatus(), []);

  const activeCredential = useMemo(
    () => credentials.find((c) => c.status === 'active' && c.key_name === 'N8N_API_KEY') ?? null,
    [credentials],
  );

  const activeCredentialRisk = useMemo(() => {
    if (!activeCredential) return null;

    const daysLeft = getDaysUntil(activeCredential.expires_at);
    if (daysLeft === null) {
      return {
        label: 'Sem data válida',
        tone: 'text-amber-700',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        description: 'A chave ativa está sem uma data de expiração reconhecível.',
      };
    }

    if (daysLeft <= 0) {
      return {
        label: 'Expirada',
        tone: 'text-red-700',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        description: 'A chave ativa já expirou e deve ser trocada imediatamente.',
      };
    }

    if (daysLeft <= 7) {
      return {
        label: 'Risco alto',
        tone: 'text-red-700',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        description: `A chave ativa expira em ${daysLeft} dia(s). Faça a rotação agora.`,
      };
    }

    if (daysLeft <= 30) {
      return {
        label: 'Risco médio',
        tone: 'text-amber-700',
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        description: `A chave ativa expira em ${daysLeft} dia(s). Planeie a substituição.`,
      };
    }

    return {
      label: 'Estável',
      tone: 'text-emerald-700',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      description: `A chave ativa ainda tem ${daysLeft} dia(s) de validade.`,
    };
  }, [activeCredential]);

  const consecutiveErrorsRef = React.useRef(0);

  useEffect(() => {
    if (user?.email && !newCredentialReminderEmail) {
      setNewCredentialReminderEmail(user.email);
    }
  }, [user?.email, newCredentialReminderEmail]);

  const refreshN8nData = useCallback(async (showToast = false) => {
    // Ensure a fresh session token (avoids stale JWT → 401 from gateway)
    const { data: { session: sess }, error: sessError } = await supabase.auth.refreshSession();
    if (sessError || !sess?.access_token) {
      setN8nError('Sem sessão ativa — faça login novamente.');
      setN8nHealthy(false);
      return;
    }

    setIsBusy(true);
    try {
      // Health check never throws — always completes
      const health = await checkN8nHealth();
      setN8nHealthy(health.status === 'connected');

      if (health.status !== 'connected') {
        const httpStatus = (health as { httpStatus?: number }).httpStatus;
        let detail = (health as { detail?: string }).detail || 'Instância n8n inacessível.';

        // Enrich with status-specific guidance
        if (httpStatus === 401) {
          if (!detail || /unauthorized|invalid jwt|expired token/i.test(detail)) {
            detail = 'HTTP 401 — JWT do utilizador inválido/expirado para a Edge Function. Faça logout/login e tente novamente.';
          } else {
            detail = `HTTP 401 na API do n8n — verifique o Secret N8N_API_KEY no n8n-proxy. Detalhe: ${detail}`;
          }
        } else if (httpStatus === 404) {
          detail = 'HTTP 404 — A Edge Function n8n-proxy não existe. Faça deploy via: supabase functions deploy n8n-proxy';
        }

        consecutiveErrorsRef.current += 1;
        setN8nError(detail);
        if (showToast) {
          toast({ title: 'n8n offline', description: detail, variant: 'destructive' });
        }
        return;
      }

      const [workflowData, executionData] = await Promise.all([
        getWorkflows(),
        getExecutions(),
      ]);
      setWorkflows(workflowData);
      setExecutions(executionData);
      setSelectedExecution((current) => {
        if (!current) return executionData[0] ?? null;
        return executionData.find((item) => String(item.id) === String(current.id)) ?? current;
      });
      setLastSync(new Date().toLocaleTimeString('pt-PT'));
      setN8nError(null);
      consecutiveErrorsRef.current = 0;
      if (showToast) {
        toast({ title: 'n8n sincronizado', description: 'Workflows e execuções atualizados com sucesso.' });
      }
    } catch (error) {
      consecutiveErrorsRef.current += 1;
      const message = error instanceof Error ? error.message : 'Falha ao contactar a instância do n8n.';
      setN8nError(message);
      if (showToast) {
        toast({ title: 'Falha na sincronização', description: message, variant: 'destructive' });
      }
    } finally {
      setIsBusy(false);
    }
  }, [toast]);

  const refreshCredentials = useCallback(async () => {
    setCredentialsLoading(true);
    try {
      const rows = await listN8nCredentials();
      setCredentials(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar credenciais.';
      toast({ title: 'Falha ao carregar chaves', description: message, variant: 'destructive' });
    } finally {
      setCredentialsLoading(false);
    }
  }, [toast]);

  const handleCreateCredential = async () => {
    if (!newCredentialValue.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha a chave.', variant: 'destructive' });
      return;
    }

    setIsSavingCredential(true);
    try {
      const expiresAt = new Date(Date.now() + newCredentialDurationDays * 24 * 60 * 60 * 1000).toISOString();

      await createN8nCredential({
        keyName: 'N8N_API_KEY',
        value: newCredentialValue.trim(),
        expiresAt,
        notes: newCredentialNotes.trim() || undefined,
        reminderEmail: newCredentialReminderEmail.trim() || undefined,
        remindDaysBefore: newCredentialRemindDaysBefore,
      });

      setNewCredentialValue('');
      setNewCredentialNotes('');
      setNewCredentialDurationDays(30);
      setNewCredentialRemindDaysBefore(7);
      toast({ title: 'Chave salva', description: 'Chave armazenada de forma criptografada no banco.' });
      await refreshCredentials();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar chave.';
      toast({ title: 'Falha ao salvar', description: message, variant: 'destructive' });
    } finally {
      setIsSavingCredential(false);
    }
  };

  const handleActivateCredential = async (id: string) => {
    try {
      await activateN8nCredential(id);
      toast({ title: 'Chave ativada', description: 'A nova chave passa a ser usada pelo proxy.' });
      await refreshCredentials();
      await refreshN8nData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao ativar chave.';
      toast({ title: 'Falha ao ativar', description: message, variant: 'destructive' });
    }
  };

  const handleRevokeCredential = async (id: string) => {
    try {
      await revokeN8nCredential(id);
      toast({ title: 'Chave revogada', description: 'A chave foi removida de uso.' });
      await refreshCredentials();
      await refreshN8nData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao revogar chave.';
      toast({ title: 'Falha ao revogar', description: message, variant: 'destructive' });
    }
  };

  const handleDeleteCredential = async (id: string) => {
    const confirmed = window.confirm('Apagar esta chave do banco? A nota e o histórico deste registo também serão removidos.');
    if (!confirmed) return;

    try {
      await deleteN8nCredential(id);
      toast({ title: 'Chave apagada', description: 'O registo foi removido definitivamente do banco.' });
      await refreshCredentials();
      await refreshN8nData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao apagar chave.';
      toast({ title: 'Falha ao apagar', description: message, variant: 'destructive' });
    }
  };

  const handleSendRemindersNow = async () => {
    try {
      const result = await triggerN8nCredentialReminders(true);
      if (result.failed > 0) {
        const detail = result.details?.[0] ?? 'Verifique RESEND_API_KEY/FROM_EMAIL e logs do send-email.';
        toast({
          title: 'Lembretes com falhas',
          description: `Enviados: ${result.sent} • Falhas: ${result.failed} • Pulados: ${result.skipped}. ${detail}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Lembretes enviados',
          description: `Enviados: ${result.sent} • Pulados: ${result.skipped}.`,
        });
      }
      await refreshCredentials();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar lembretes.';
      toast({ title: 'Falha ao enviar lembretes', description: message, variant: 'destructive' });
    }
  };

  const handleWakeN8n = async () => {
    setIsBusy(true);
    try {
      for (let i = 0; i < 6; i += 1) {
        const health = await checkN8nHealth();
        if (health.status === 'connected') {
          setN8nHealthy(true);
          setN8nError(null);
          toast({ title: 'n8n acordado', description: 'A instância no Render respondeu com sucesso.' });
          await refreshN8nData();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      toast({ title: 'n8n em cold start', description: 'Render pode levar alguns segundos para acordar.', variant: 'destructive' });
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    void refreshN8nData();
    void refreshCredentials();
    const interval = window.setInterval(() => {
      // Stop polling after 3 consecutive errors
      if (consecutiveErrorsRef.current >= 3) return;
      void refreshN8nData();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refreshN8nData, refreshCredentials, isActive]);

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
        {n8nHealthy !== null && (
          <Badge variant={n8nHealthy ? 'default' : 'destructive'} className="gap-1.5">
            {n8nHealthy ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {n8nHealthy ? 'n8n conectado' : 'n8n offline'}
          </Badge>
        )}
        <Badge variant="secondary">{lastSync ? `Sync ${lastSync}` : 'Sem sync'}</Badge>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refreshN8nData(true)} disabled={isBusy}>
          <RefreshCcw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
          {isBusy ? 'A sincronizar...' : 'Atualizar'}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void handleWakeN8n()} disabled={isBusy}>
          <Power className="h-3.5 w-3.5" />Acordar n8n (Render)
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/admin/automation-lab')}>
          <FlaskConical className="h-3.5 w-3.5" />Ir ao laboratório de automações
        </Button>
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
              <p className="text-xs font-semibold text-foreground">
                {n8nHealthy === null ? 'A verificar...' : n8nHealthy ? (
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" />JWT + RBAC ativo</span>
                ) : (
                  <span className="text-amber-600">Sem ligação</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" />Resumo da chave ativa</CardTitle>
          <CardDescription className="text-xs">Este cartão ajuda a validar rapidamente se a rotação ficou ativa no backend.</CardDescription>
        </CardHeader>
        <CardContent>
          {!activeCredential || !activeCredentialRisk ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhuma chave ativa encontrada. Salve uma nova chave e clique em Ativar para que o proxy passe a usá-la.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{activeCredential.key_name}</p>
                  <Badge variant="outline" className={activeCredentialRisk.badgeClass}>{activeCredentialRisk.label}</Badge>
                  <Badge variant={n8nHealthy ? 'default' : 'secondary'}>
                    {n8nHealthy ? 'Proxy em uso' : 'Proxy pendente'}
                  </Badge>
                </div>
                <p className={`mt-2 text-sm ${activeCredentialRisk.tone}`}>{activeCredentialRisk.description}</p>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  <p>Criada em: {formatDateTime(activeCredential.created_at)}</p>
                  <p>Ativada em: {formatDateTime(activeCredential.activated_at)}</p>
                  <p>Expira em: {formatDateTime(activeCredential.expires_at)}</p>
                  <p>Último lembrete: {formatDateTime(activeCredential.last_reminder_sent_at)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Checklist rápido</p>
                <p className="mt-2">1. Salvar a nova chave no formulário abaixo.</p>
                <p>2. Clicar em Ativar na lista.</p>
                <p>3. Confirmar aqui a data de ativação.</p>
                <p>4. Atualizar o estado do n8n para validar que o proxy continua conectado.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {n8nError && (
        <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Ligação ao n8n com atenção</p>
              <p className="text-muted-foreground">{n8nError}</p>
              {n8nError.includes('not configured') && (
                <p className="text-muted-foreground">Os Secrets <code>N8N_BASE_URL</code> e <code>N8N_API_KEY</code> não estão definidos. Vá a <strong>Supabase → Edge Functions → n8n-proxy → Secrets</strong>.</p>
              )}
              {(n8nError.includes('401') || n8nError.includes('invalid jwt') || n8nError.includes('expired token')) && (
                <p className="text-muted-foreground">Se mencionar JWT/sessão: faça logout/login. Se mencionar API do n8n: valide o Secret <code>N8N_API_KEY</code> da função <code>n8n-proxy</code>.</p>
              )}
              {n8nError.includes('404') && (
                <p className="text-muted-foreground">A função não existe no projeto. Execute <code>supabase functions deploy n8n-proxy</code>.</p>
              )}
              {n8nError.includes('Forbidden') && (
                <p className="text-muted-foreground">O seu utilizador não tem role <code>admin</code> ou <code>super_admin</code> ativa na tabela <code>user_roles</code>.</p>
              )}
              {n8nError.includes('Unauthorized') && (
                <p className="text-muted-foreground">Token JWT expirado ou inválido. Tente fazer <strong>logout/login</strong>.</p>
              )}
              {(n8nError.includes('unreachable') || n8nError.includes('inacessível') || n8nError.includes('Failed to fetch')) && (
                <p className="text-muted-foreground">A Edge Function <code>n8n-proxy</code> pode não estar deployed ou a instância n8n está offline. Verifique o deploy no Supabase e o estado da instância.</p>
              )}
              {!n8nError.includes('not configured') && !n8nError.includes('401') && !n8nError.includes('not deployed') && !n8nError.includes('404') && !n8nError.includes('Forbidden') && !n8nError.includes('Unauthorized') && !n8nError.includes('unreachable') && !n8nError.includes('inacessível') && !n8nError.includes('Failed to fetch') && (
                <p className="text-muted-foreground">Confirme os Secrets <code>N8N_BASE_URL</code> e <code>N8N_API_KEY</code> em Supabase → Edge Functions.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" />Chaves expiráveis do n8n</CardTitle>
          <CardDescription className="text-xs">As chaves são guardadas criptografadas no banco, ativadas pelo painel e lidas automaticamente pelo proxy do n8n.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateCredential();
            }}
          >
            <input
              type="text"
              autoComplete="username"
              value={newCredentialReminderEmail || user?.email || 'vision7-n8n-key'}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
            />
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Nova chave N8N_API_KEY</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={newCredentialValue}
                onChange={(e) => setNewCredentialValue(e.target.value)}
                placeholder="Cole a nova N8N_API_KEY"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Validade</Label>
              <Select value={String(newCredentialDurationDays)} onValueChange={(v) => setNewCredentialDurationDays(Number(v) as 7 | 30 | 60 | 90)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher validade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lembrar antes de expirar</Label>
              <Select value={String(newCredentialRemindDaysBefore)} onValueChange={(v) => setNewCredentialRemindDaysBefore(Number(v) as 7 | 30 | 60 | 90)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher janela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias antes</SelectItem>
                  <SelectItem value="30">30 dias antes</SelectItem>
                  <SelectItem value="60">60 dias antes</SelectItem>
                  <SelectItem value="90">90 dias antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email para lembrete</Label>
              <Input
                type="email"
                value={newCredentialReminderEmail}
                onChange={(e) => setNewCredentialReminderEmail(e.target.value)}
                placeholder="equipa@vision7.pt"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={newCredentialNotes}
                onChange={(e) => setNewCredentialNotes(e.target.value)}
                placeholder="Ex.: chave prod abril"
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={isSavingCredential}>
                {isSavingCredential ? 'A guardar...' : 'Salvar chave'}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleSendRemindersNow()}>
                Enviar lembretes agora
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {credentialsLoading ? (
              <p className="text-xs text-muted-foreground">A carregar chaves...</p>
            ) : credentials.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem chaves cadastradas no banco.</p>
            ) : credentials.map((c) => {
              const expiresAt = new Date(c.expires_at);
              const hoursLeft = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
              const expiringSoon = hoursLeft <= 72;
              const isExpired = expiresAt.getTime() <= Date.now();

              return (
                <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.key_name} <span className="text-xs text-muted-foreground">({c.status})</span></p>
                    <p className="text-xs text-muted-foreground">Criada em: {formatDateTime(c.created_at)}</p>
                    <p className="text-xs text-muted-foreground">Ativada em: {formatDateTime(c.activated_at)} • Expira em: {formatDateTime(c.expires_at)} {isExpired ? '• expirada' : expiringSoon ? '• expiração próxima' : ''}</p>
                    <p className="text-xs text-muted-foreground">Lembrete: {c.remind_days_before} dias antes • Email: {c.reminder_email || '—'} • Último envio: {formatDateTime(c.last_reminder_sent_at)}</p>
                    {c.notes && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{c.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.status !== 'active' && c.status !== 'revoked' && !isExpired && (
                      <Button size="sm" variant="outline" onClick={() => void handleActivateCredential(c.id)}>Ativar</Button>
                    )}
                    {c.status !== 'revoked' && (
                      <Button size="sm" variant="destructive" onClick={() => void handleRevokeCredential(c.id)}>Revogar</Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => void handleDeleteCredential(c.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />Apagar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {activeCredential && (() => {
            const hoursLeft = Math.round((new Date(activeCredential.expires_at).getTime() - Date.now()) / (1000 * 60 * 60));
            if (hoursLeft > 72) return null;
            return (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50/60 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                <p className="text-muted-foreground">A chave ativa expira em cerca de {hoursLeft}h. Faça a rotação agora para evitar indisponibilidade no n8n.</p>
              </div>
            );
          })()}
        </CardContent>
      </Card>

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
                <div key={wfId} className="overflow-hidden rounded-xl border border-border p-3.5 shadow-sm">
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{wf.name}</p>
                        <Badge variant={wf.active ? 'default' : 'secondary'} className="text-[10px]">{wf.active ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">ID: {wfId} • Última: {lastExec ? formatDateTime(lastExec.startedAt) : '—'}</p>
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
                <Select value={formState.workflowId} onValueChange={(v) => setFormState((p) => ({ ...p, workflowId: v }))}>
                  <SelectTrigger id="panel-workflow-select">
                    <SelectValue placeholder="Selecionar workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((wf) => <SelectItem key={String(wf.id)} value={String(wf.id)}>{wf.name} ({wf.id})</SelectItem>)}
                  </SelectContent>
                </Select>
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
