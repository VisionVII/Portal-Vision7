import React, { useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Mail, Send, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AppRole,
  useCreateRegistrationInvite,
  useExpireRegistrationInvite,
  useRegistrationInvites,
  useRoleAssignments,
} from '@/hooks/useAdminAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';

const ROLE_BLUEPRINTS: Array<{
  role: AppRole;
  title: string;
  description: string;
  scope: string[];
}> = [
  {
    role: 'super_admin',
    title: 'Desenvolvedor / Super Admin',
    description: 'Acesso total ao CMS, infraestrutura editorial, configurações críticas e gestão da equipa.',
    scope: ['Configurações avançadas', 'Infra & diagnósticos', 'Convites e permissões', 'Builder completo'],
  },
  {
    role: 'admin',
    title: 'Administrador',
    description: 'Opera o portal, homepage, cursos, parceiros e conteúdo em produção.',
    scope: ['Homepage builder', 'Gestão de posts', 'Newsletter e CRM', 'Cursos e parcerias'],
  },
  {
    role: 'editor',
    title: 'Editor',
    description: 'Coordena destaques, aprova posts e organiza a pauta editorial.',
    scope: ['Publicar posts', 'Curadoria da homepage', 'Revisão editorial'],
  },
  {
    role: 'redator',
    title: 'Redator / Revisor',
    description: 'Cria textos, atualiza conteúdo e trabalha em drafts com escopo controlado.',
    scope: ['Criar rascunhos', 'Editar o próprio conteúdo', 'Enviar para revisão'],
  },
  {
    role: 'moderador',
    title: 'Moderador',
    description: 'Apoio operacional, comentários e moderação de comunidade.',
    scope: ['Fila de revisão', 'Moderação de comunidade'],
  },
  {
    role: 'analyst',
    title: 'Analista',
    description: 'Acesso focado em analytics, insights e leitura de performance.',
    scope: ['Painel de insights', 'Relatórios e KPIs'],
  },
];

const getRoleTitle = (role: AppRole) => {
  return ROLE_BLUEPRINTS.find((item) => item.role === role)?.title ?? role.replace('_', ' ');
};

const AdminAccessManager = () => {
  const { data: invites = [] } = useRegistrationInvites();
  const { data: roleAssignments = [] } = useRoleAssignments();
  const createInvite = useCreateRegistrationInvite();
  const expireInvite = useExpireRegistrationInvite();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('editor');
  const [scopeNote, setScopeNote] = useState('');
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [isSending, setIsSending] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);

  const selectedBlueprint = useMemo(
    () => ROLE_BLUEPRINTS.find((item) => item.role === role),
    [role]
  );

  const inviteSummary = useMemo(() => {
    const now = Date.now();

    return {
      activeMembers: roleAssignments.filter((assignment) => assignment.is_active !== false).length,
      pendingInvites: invites.filter((invite) => invite.status === 'pending' && new Date(invite.expires_at).getTime() > now).length,
      expiredInvites: invites.filter((invite) => invite.status === 'expired' || new Date(invite.expires_at).getTime() <= now).length,
    };
  }, [invites, roleAssignments]);

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    setLastSentEmail(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1) Register invite in DB (for tracking)
      await createInvite.mutateAsync({
        email: normalizedEmail,
        role,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      // 2) Send invite email with 6-digit code via edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token ?? '';

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-invite-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ email: normalizedEmail, role }),
      });

      const resData = await res.json().catch(() => null);

      if (!res.ok || resData?.error) {
        toast({
          title: 'Convite registado, mas falha no envio do email',
          description: resData?.error ?? 'O convite foi guardado. Tente reenviar o email.',
          variant: 'destructive',
        });
        return;
      }

      setLastSentEmail(normalizedEmail);
      setEmail('');
      setScopeNote('');

      toast({
        title: 'Convite enviado',
        description: `Email de convite com código de ativação enviado para ${normalizedEmail}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao criar convite',
        description: error instanceof Error ? error.message : 'Não foi possível gerar o convite.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleResendInvite = async (inviteEmail: string, inviteRole: AppRole) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData?.session?.access_token ?? '';

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-invite-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    const resData = await res.json().catch(() => null);

    if (!res.ok || resData?.error) {
      toast({ title: 'Erro ao reenviar', description: resData?.error ?? 'Falha ao reenviar o convite.', variant: 'destructive' });
    } else {
      toast({ title: 'Convite reenviado', description: `Novo código enviado para ${inviteEmail}.` });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary-600" />
              Convidar utilizadores
            </CardTitle>
            <CardDescription>
              Configure perfis, privilégios e escopos claros para devs, editores, revisores e restantes membros da equipa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email do utilizador</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="colaborador@vision.pt"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Papel e nível de acesso</Label>
                <Select value={role} onValueChange={(value: AppRole) => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_BLUEPRINTS.map((item) => (
                      <SelectItem key={item.role} value={item.role}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-expire">Validade do convite</Label>
                <Input
                  id="invite-expire"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope-note">Escopo / observações</Label>
                <Textarea
                  id="scope-note"
                  value={scopeNote}
                  onChange={(event) => setScopeNote(event.target.value)}
                  placeholder="Ex.: acesso apenas ao CMS da homepage, cursos e conteúdos patrocinados."
                />
              </div>

              <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-3 dark:border-primary-900/40 dark:bg-primary-900/10">
                <p className="text-sm font-semibold text-foreground">Escopo recomendado</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedBlueprint?.description}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {selectedBlueprint?.scope.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              {lastSentEmail && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Email enviado para <strong>{lastSentEmail}</strong>
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={isSending}>
                {isSending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />A enviar convite…</>
                  : <><Send className="h-4 w-4" />Enviar convite por email</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-secondary-500" />
              Regras e escopos
            </CardTitle>
            <CardDescription>
              Padrões de governança para não misturar perfis administrativos, editoriais e técnicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ROLE_BLUEPRINTS.map((item) => (
              <div key={item.role} className="rounded-xl border border-border p-3">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Membros ativos</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{inviteSummary.activeMembers}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Convites pendentes</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{inviteSummary.pendingInvites}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Convites expirados</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{inviteSummary.expiredInvites}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary-600" />
              Equipa atual e convites ativos
            </CardTitle>
            <CardDescription>
              Vista operacional para controlar quem está ativo, pendente ou com acesso expirado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Papéis atribuídos</p>
              <div className="space-y-2">
                {roleAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ainda não existem papéis ativos carregados do Supabase.</p>
                ) : roleAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="max-w-[200px] truncate font-medium text-foreground sm:max-w-xs" title={assignment.user_id}>{assignment.user_id.slice(0, 8)}…</p>
                      <p className="text-xs text-muted-foreground">Role: {getRoleTitle(assignment.role)} • {assignment.is_active ? 'ativo' : 'inativo'}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                      {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString('pt-PT') : 'Sem data'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Convites pendentes</p>
              <div className="space-y-2">
                {invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum convite pendente no momento.</p>
                ) : invites.map((invite) => (
                  <div key={invite.id} className="flex flex-col gap-3 rounded-xl border border-border p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">{getRoleTitle(invite.role)} • {invite.status || 'pending'} • expira em {new Date(invite.expires_at).toLocaleDateString('pt-PT')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvite(invite.email, invite.role)}
                        className="gap-1.5"
                        disabled={invite.status === 'used'}
                      >
                        <Send className="h-4 w-4" />
                        Reenviar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => expireInvite.mutate(invite.id)} className="gap-1.5">
                        <KeyRound className="h-4 w-4" />
                        Expirar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAccessManager;
