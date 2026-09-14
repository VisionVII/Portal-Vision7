import React, { useState } from 'react';
import { MoreHorizontal, Shield, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  useDeactivateTeamMember,
  useReactivateTeamMember,
} from '@/hooks/useAdminAccess';
import { useToast } from '@/hooks/use-toast';
import { ROLE_BLUEPRINTS, getRoleTitle } from './roleBlueprints';
import { RoleBadge, StatusDot } from './AccessManagerAtoms';

interface TeamMembersTableProps {
  members: TeamMember[];
  currentUserId: string | undefined;
  isSuperAdmin: boolean;
}

const TeamMembersTable: React.FC<TeamMembersTableProps> = ({ members, currentUserId, isSuperAdmin }) => {
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

    // Generate initials
    const initials = member.full_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';

    return (
      <div
        key={member.assignment_id}
        className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-all md:flex-row md:items-center md:justify-between ${
          member.is_active
            ? 'border-border/70 bg-card hover:border-border'
            : 'border-border/30 bg-muted/15 opacity-60'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary border border-primary/20">
            {initials}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {member.full_name}
              </p>
              {isCurrentUser && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-medium text-primary">
                  Tu
                </span>
              )}
              <StatusDot active={member.is_active} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {member.email || `${member.user_id.slice(0, 12)}…`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2">
            <RoleBadge role={member.role} />
            <span className="text-[11px] text-muted-foreground font-mono">
              {member.assigned_at ? new Date(member.assigned_at).toLocaleDateString('pt-PT') : '—'}
            </span>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Alterar Papel
                </p>
                {ROLE_BLUEPRINTS.filter((b) => b.role !== member.role).map((b) => (
                  <DropdownMenuItem
                    key={b.role}
                    className="text-xs cursor-pointer"
                    onClick={() => setConfirmAction({ type: 'change-role', member, newRole: b.role })}
                  >
                    <Shield className="mr-2 h-3.5 w-3.5 text-primary" />
                    {b.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {member.is_active ? (
                  <DropdownMenuItem
                    className="text-xs text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => setConfirmAction({ type: 'deactivate', member })}
                  >
                    <UserMinus className="mr-2 h-3.5 w-3.5" />
                    Desativar membro
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-xs text-emerald-600 focus:text-emerald-600 cursor-pointer"
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
      <div className="space-y-2.5">
        {activeMembers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhum membro ativo registado.</div>
        ) : (
          activeMembers.map(renderMemberRow)
        )}

        {inactiveMembers.length > 0 && (
          <div className="pt-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Membros Inativos ({inactiveMembers.length})
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            {inactiveMembers.map(renderMemberRow)}
          </div>
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

export default TeamMembersTable;
