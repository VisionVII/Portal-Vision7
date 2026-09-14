import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, KeyRound, Loader2, Mail, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppRole, useExpireRegistrationInvite, useRegistrationInvites } from '@/hooks/useAdminAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RoleBadge } from './AccessManagerAtoms';

const InvitesList: React.FC = () => {
  const { data: invites = [], isLoading } = useRegistrationInvites();
  const expireInvite = useExpireRegistrationInvite();
  const { toast } = useToast();
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const handleResendInvite = async (inviteEmail: string, inviteRole: AppRole) => {
    setResendingEmail(inviteEmail);
    try {
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
        toast({ title: 'Código reenviado', description: `Novo convite enviado para ${inviteEmail}.` });
      }
    } finally {
      setResendingEmail(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs">A carregar convites…</p>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/20">
        <Mail className="h-8 w-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium text-foreground">Nenhum convite emitido</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Utilize o formulário ao lado para enviar convites seguros a novos colaboradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {invites.map((invite) => {
        const expiresTime = new Date(invite.expires_at).getTime();
        const now = Date.now();
        const isExpired = invite.status === 'expired' || expiresTime <= now;
        const isUsed = invite.status === 'used';
        const isPending = !isUsed && !isExpired;

        return (
          <div
            key={invite.id}
            className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-all md:flex-row md:items-center md:justify-between ${
              isPending
                ? 'border-border/70 bg-card hover:border-border'
                : 'border-border/30 bg-muted/15 opacity-70'
            }`}
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-sm font-semibold text-foreground">{invite.email}</p>
                <RoleBadge role={invite.role} />
              </div>

              <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                {isUsed ? (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Aceite / Ativado
                  </span>
                ) : isExpired ? (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                    <XCircle className="h-3 w-3" /> Expirado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="h-3 w-3" /> Pendente
                  </span>
                )}
                <span>•</span>
                <span>
                  {isExpired ? 'Expirou em' : 'Válido até'}{' '}
                  {new Date(invite.expires_at).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {isPending && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-border/70"
                  disabled={resendingEmail === invite.email}
                  onClick={() => handleResendInvite(invite.email, invite.role)}
                >
                  {resendingEmail === invite.email ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Reenviar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  disabled={expireInvite.isPending}
                  onClick={() => expireInvite.mutate(invite.id)}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Expirar
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
