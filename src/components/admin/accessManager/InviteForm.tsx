import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Send, Shield, UserPlus } from 'lucide-react';
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

const EXPIRY_OPTIONS = [
  { value: '24', label: '24 horas', hint: 'Acesso rápido' },
  { value: '48', label: '48 horas', hint: 'Padrão recomendado' },
  { value: '168', label: '7 dias', hint: 'Prazo estendido' },
];

const InviteForm: React.FC = () => {
  const createInvite = useCreateRegistrationInvite();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('editor');
  const [scopeNote, setScopeNote] = useState('');
  const [expiryHours, setExpiryHours] = useState('48');
  const [isSending, setIsSending] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);

  const selectedBlueprint = useMemo(() => getBlueprintForRole(role), [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setLastSentEmail(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const hours = parseInt(expiryHours, 10) || 48;
      const calculatedExpiry = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      await createInvite.mutateAsync({
        email: normalizedEmail,
        role,
        expiresAt: calculatedExpiry,
      });

      const { data: resData, error: fnError } = await supabase.functions.invoke('send-invite-code', {
        body: { email: normalizedEmail, role, expiry_hours: hours },
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
      toast({ title: 'Convite enviado', description: `Código de ativação válido por ${hours}h enviado para ${normalizedEmail}.` });
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
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3.5">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          Convidar Membro
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Envie um convite seguro com código de ativação por e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs font-medium">Email do colaborador</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colaborador@vision7.pt"
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Papel atribuído</Label>
              <Select value={role} onValueChange={(v: AppRole) => setRole(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_BLUEPRINTS.map((b) => (
                    <SelectItem key={b.role} value={b.role} className="text-xs">
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-expire" className="flex items-center gap-1 text-xs font-medium">
                <Clock className="h-3 w-3 text-muted-foreground" />
                Validade do código
              </Label>
              <Select value={expiryHours} onValueChange={setExpiryHours}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label} <span className="text-[10px] text-muted-foreground ml-1">({opt.hint})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scope-note" className="text-xs font-medium">Notas operacionais (opcional)</Label>
            <Textarea
              id="scope-note"
              value={scopeNote}
              onChange={(e) => setScopeNote(e.target.value)}
              placeholder="Ex.: acesso editorial focado em Tecnologia e Saúde."
              className="min-h-[56px] text-xs resize-none"
            />
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold text-foreground">{selectedBlueprint?.title}</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedBlueprint?.description}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {selectedBlueprint?.scope.map((s) => (
                <span key={s} className="rounded-md bg-background/80 border border-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {lastSentEmail && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Código enviado com sucesso para <strong>{lastSentEmail}</strong></span>
            </div>
          )}

          <Button type="submit" className="w-full gap-2 text-xs font-medium h-9" disabled={isSending}>
            {isSending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A enviar convite…</>
              : <><Send className="h-3.5 w-3.5" /> Enviar convite</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default InviteForm;
