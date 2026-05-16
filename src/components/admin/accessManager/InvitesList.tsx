import React from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppRole, useExpireRegistrationInvite, useRegistrationInvites } from '@/hooks/useAdminAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RoleBadge } from './AccessManagerAtoms';

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

export default InvitesList;
