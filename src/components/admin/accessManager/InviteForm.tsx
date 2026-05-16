import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Send, UserPlus } from 'lucide-react';
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
import { AppRole, useCreateRegistrationInvite } from '@/hooks/useAdminAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_BLUEPRINTS, getBlueprintForRole } from './roleBlueprints';

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

export default InviteForm;
