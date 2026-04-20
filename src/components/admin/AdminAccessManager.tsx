import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, KeyRound, Loader2, Mail, MoreHorizontal,
  Send, Shield, ShieldCheck, UserMinus, UserPlus, Users,
} from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AppRole,
  TeamMember,
  useChangeUserRole,
  useCreateRegistrationInvite,
  useDeactivateTeamMember,
  useExpireRegistrationInvite,
  useReactivateTeamMember,
  useRegistrationInvites,
  useTeamMembers,
} from '@/hooks/useAdminAccess';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ── Role blueprints ─────────────────────────────────────────────────────────

const ROLE_BLUEPRINTS: Array<{
  role: AppRole;
  title: string;
  description: string;
  scope: string[];
  color: string;
}> = [
  {
    role: 'super_admin',
    title: 'Super Admin',
    description: 'Acesso total: infraestrutura, configurações críticas, gestão da equipa.',
    scope: ['Config avançadas', 'Infra & diagnósticos', 'Convites e permissões', 'Builder completo'],
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  {
    role: 'admin',
    title: 'Administrador',
    description: 'Opera o portal, homepage, cursos, parceiros e conteúdo.',
    scope: ['Homepage builder', 'Gestão de posts', 'Newsletter e CRM', 'Cursos e parcerias'],
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  {
    role: 'editor',
    title: 'Editor',
    description: 'Coordena destaques, aprova posts e organiza a pauta editorial.',
    scope: ['Publicar posts', 'Curadoria da homepage', 'Revisão editorial'],
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    role: 'redator',
    title: 'Redator',
    description: 'Cria textos, atualiza conteúdo e trabalha em drafts.',
    scope: ['Criar rascunhos', 'Editar próprio conteúdo', 'Enviar para revisão'],
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  {
    role: 'moderador',
    title: 'Moderador',
    description: 'Apoio operacional, comentários e moderação de comunidade.',
    scope: ['Fila de revisão', 'Moderação de comunidade'],
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  {
    role: 'analyst',
    title: 'Analista',
    description: 'Acesso focado em analytics, insights e leitura de performance.',
    scope: ['Painel de insights', 'Relatórios e KPIs'],
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  },
];

const getBlueprintForRole = (role: AppRole) =>
  ROLE_BLUEPRINTS.find((b) => b.role === role);

const getRoleTitle = (role: AppRole) =>
  getBlueprintForRole(role)?.title ?? role.replace('_', ' ');

const getRoleBadgeClass = (role: AppRole) =>
  getBlueprintForRole(role)?.color ?? 'bg-muted text-muted-foreground';

// ── Sub-components ──────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: AppRole }> = ({ role }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${getRoleBadgeClass(role)}`}>
    <Shield className="h-3 w-3" />
    {getRoleTitle(role)}
  </span>
);

const StatusDot: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
);

// ── Invite Form ─────────────────────────────────────────────────────────────

const InviteForm: React.FC = () => {
  const createInvite = useCreateRegistrationInvite();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('editor');
  const [scopeNote, setScopeNote] = useState('');
  const [expiresAt, setExpiresAt] = useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [isSending, setIsSending] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);

  const selectedBlueprint = useMemo(() => getBlueprintForRole(role), [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setLastSentEmail(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      await createInvite.mutateAsync({
        email: normalizedEmail,
        role,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      const { data: resData, error: fnError } = await supabase.functions.invoke('send-invite-code', {
        body: { email: normalizedEmail, role },
      });

      if (fnError) {
        let errorMessage = fnError.message;
        try {
          const body = await (fnError as unknown as { context?: Response }).context?.json();
          if (body?.error) errorMessage = body.error;
        } catch { /* context may not be JSON */ }
        toast({
          title: 'Convite registado, mas falha no envio do email',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (resData?.error) {
        toast({
          title: 'Convite registado, mas falha no envio do email',
          description: resData.error,
          variant: 'destructive',
        });
        return;
      }

      setLastSentEmail(normalizedEmail);
      setEmail('');
      setScopeNote('');
      toast({ title: 'Convite enviado', description: `Código de ativação enviado para ${normalizedEmail}.` });
    } catch (error) {
      toast({
        title: 'Erro ao criar convite',
        description: error instanceof Error ? error.message : 'Falha ao gerar convite.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4 text-primary" />
          Convidar membro
        </CardTitle>
        <CardDescription>Envie um convite com código de ativação por email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colaborador@vision.pt"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select value={role} onValueChange={(v: AppRole) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_BLUEPRINTS.map((b) => (
                    <SelectItem key={b.role} value={b.role}>{b.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-expire">Validade</Label>
              <Input
                id="invite-expire"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scope-note">Observações (opcional)</Label>
            <Textarea
              id="scope-note"
              value={scopeNote}
              onChange={(e) => setScopeNote(e.target.value)}
              placeholder="Ex.: acesso apenas ao CMS da homepage."
              className="min-h-[60px]"
            />
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <p className="text-xs font-semibold text-foreground">{selectedBlueprint?.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{selectedBlueprint?.description}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {selectedBlueprint?.scope.map((s) => (
                <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
              ))}
            </div>
          </div>

          {lastSentEmail && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Enviado para <strong>{lastSentEmail}</strong>
            </div>
          )}

          <Button type="submit" className="w-full gap-2" size="sm" disabled={isSending}>
            {isSending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A enviar…</>
              : <><Send className="h-3.5 w-3.5" /> Enviar convite</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ── Role Blueprints Panel ───────────────────────────────────────────────────

const RoleBlueprintsPanel: React.FC = () => (
  <div className="space-y-2">
    {ROLE_BLUEPRINTS.map((b, i) => (
      <div key={b.role} className="flex items-start gap-3 rounded-lg border border-border/60 p-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {i + 1}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RoleBadge role={b.role} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{b.description}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {b.scope.map((s) => (
              <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ── Team Members Table ──────────────────────────────────────────────────────

const TeamMembersTable: React.FC<{
  members: TeamMember[];
  currentUserId: string | undefined;
  isSuperAdmin: boolean;
}> = ({ members, currentUserId, isSuperAdmin }) => {
  const changeRole = useChangeUserRole();
  const deactivate = useDeactivateTeamMember();
  const reactivate = useReactivateTeamMember();
  const { toast } = useToast();

  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'reactivate' | 'change-role';
    member: TeamMember;
    newRole?: AppRole;
  } | null>(null);

  const activeMembers = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, member, newRole } = confirmAction;

    try {
      if (type === 'deactivate') {
        await deactivate.mutateAsync({ userId: member.user_id });
        toast({ title: 'Membro desativado', description: `${member.full_name} foi desativado.` });
      } else if (type === 'reactivate' && newRole) {
        await reactivate.mutateAsync({ userId: member.user_id, role: newRole });
        toast({ title: 'Membro reativado', description: `${member.full_name} reativado como ${getRoleTitle(newRole)}.` });
      } else if (type === 'change-role' && newRole) {
        await changeRole.mutateAsync({ userId: member.user_id, oldRole: member.role, newRole });
        toast({ title: 'Papel alterado', description: `${member.full_name} é agora ${getRoleTitle(newRole)}.` });
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Operação falhou.',
        variant: 'destructive',
      });
    } finally {
      setConfirmAction(null);
    }
  };

  const renderMemberRow = (member: TeamMember) => {
    const isCurrentUser = member.user_id === currentUserId;
    const canManage = isSuperAdmin && !isCurrentUser;

    return (
      <div
        key={member.assignment_id}
        className={`flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between ${
          member.is_active ? 'border-border/60' : 'border-border/30 opacity-60'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
            {member.full_name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">
                {member.full_name}
                {isCurrentUser && <span className="ml-1 text-[10px] text-muted-foreground">(tu)</span>}
              </p>
              <StatusDot active={member.is_active} />
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {member.email || member.user_id.slice(0, 12) + '…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RoleBadge role={member.role} />
          <span className="text-[10px] text-muted-foreground">
            {member.assigned_at ? new Date(member.assigned_at).toLocaleDateString('pt-PT') : '—'}
          </span>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Alterar papel</p>
                {ROLE_BLUEPRINTS.filter((b) => b.role !== member.role).map((b) => (
                  <DropdownMenuItem
                    key={b.role}
                    onClick={() => setConfirmAction({ type: 'change-role', member, newRole: b.role })}
                  >
                    <Shield className="mr-2 h-3.5 w-3.5" />
                    {b.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {member.is_active ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmAction({ type: 'deactivate', member })}
                  >
                    <UserMinus className="mr-2 h-3.5 w-3.5" />
                    Desativar membro
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setConfirmAction({ type: 'reactivate', member, newRole: member.role })}
                  >
                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                    Reativar membro
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-2">
        {activeMembers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro ativo.</p>
        ) : (
          activeMembers.map(renderMemberRow)
        )}

        {inactiveMembers.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Inativos</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {inactiveMembers.map(renderMemberRow)}
          </>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'deactivate' && 'Desativar membro'}
              {confirmAction?.type === 'reactivate' && 'Reativar membro'}
              {confirmAction?.type === 'change-role' && 'Alterar papel'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'deactivate' && (
                <>Todos os papéis de <strong>{confirmAction.member.full_name}</strong> serão desativados. O membro perde acesso ao dashboard.</>
              )}
              {confirmAction?.type === 'reactivate' && (
                <><strong>{confirmAction.member.full_name}</strong> será reativado como <strong>{getRoleTitle(confirmAction.newRole!)}</strong>.</>
              )}
              {confirmAction?.type === 'change-role' && (
                <>O papel de <strong>{confirmAction.member.full_name}</strong> será alterado de <strong>{getRoleTitle(confirmAction.member.role)}</strong> para <strong>{getRoleTitle(confirmAction.newRole!)}</strong>.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ── Invites List ────────────────────────────────────────────────────────────

const InvitesList: React.FC = () => {
  const { data: invites = [] } = useRegistrationInvites();
  const expireInvite = useExpireRegistrationInvite();
  const { toast } = useToast();

  const handleResendInvite = async (inviteEmail: string, inviteRole: AppRole) => {
    const { data: resData, error: fnError } = await supabase.functions.invoke('send-invite-code', {
      body: { email: inviteEmail, role: inviteRole },
    });

    if (fnError) {
      let errorMessage = fnError.message;
      try {
        const body = await (fnError as unknown as { context?: Response }).context?.json();
        if (body?.error) errorMessage = body.error;
      } catch { /* context may not be JSON */ }
      toast({ title: 'Erro ao reenviar', description: errorMessage, variant: 'destructive' });
      return;
    }

    if (resData?.error) {
      toast({ title: 'Erro ao reenviar', description: resData.error, variant: 'destructive' });
    } else {
      toast({ title: 'Reenviado', description: `Novo código para ${inviteEmail}.` });
    }
  };

  if (invites.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Nenhum convite registado.</p>;
  }

  return (
    <div className="space-y-2">
      {invites.map((invite) => {
        const isExpired = invite.status === 'expired' || new Date(invite.expires_at).getTime() <= Date.now();
        const isUsed = invite.status === 'used';

        return (
          <div
            key={invite.id}
            className={`flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between ${
              isExpired || isUsed ? 'border-border/30 opacity-50' : 'border-border/60'
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <RoleBadge role={invite.role} />
                <span>•</span>
                <span>{isUsed ? 'usado' : isExpired ? 'expirado' : 'pendente'}</span>
                <span>•</span>
                <span>{new Date(invite.expires_at).toLocaleDateString('pt-PT')}</span>
              </div>
            </div>
            {!isUsed && !isExpired && (
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => handleResendInvite(invite.email, invite.role)}
                >
                  <Mail className="h-3 w-3" /> Reenviar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => expireInvite.mutate(invite.id)}
                >
                  <KeyRound className="h-3 w-3" /> Expirar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

type TabId = 'team' | 'invites' | 'roles';

const AdminAccessManager: React.FC = () => {
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: invites = [] } = useRegistrationInvites();
  const { user, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('team');

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      active: teamMembers.filter((m) => m.is_active).length,
      inactive: teamMembers.filter((m) => !m.is_active).length,
      pending: invites.filter((i) => i.status === 'pending' && new Date(i.expires_at).getTime() > now).length,
    };
  }, [teamMembers, invites]);

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'team', label: 'Equipa', icon: <Users className="h-3.5 w-3.5" />, count: stats.active },
    { id: 'invites', label: 'Convites', icon: <Mail className="h-3.5 w-3.5" />, count: stats.pending },
    { id: 'roles', label: 'Papéis', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      {/* Left: Invite form */}
      <div className="space-y-5">
        <InviteForm />

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{stats.active}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativos</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{stats.pending}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendentes</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{stats.inactive}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Inativos</p>
          </div>
        </div>
      </div>

      {/* Right: Tabs — Team / Invites / Roles */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'team' && (
            <TeamMembersTable
              members={teamMembers}
              currentUserId={user?.id}
              isSuperAdmin={isSuperAdmin}
            />
          )}
          {activeTab === 'invites' && <InvitesList />}
          {activeTab === 'roles' && <RoleBlueprintsPanel />}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAccessManager;
