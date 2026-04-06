import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AuthShell from '@/components/admin/AuthShell';
import { SUPABASE_FUNCTIONS_URL, SUPABASE_ANON } from '@/integrations/supabase/client';

type Step = 'code' | 'password' | 'done';

const AdminRegister = () => {
  const [searchParams] = useSearchParams();
  const invitedEmail = searchParams.get('email')?.trim() ?? '';
  const inviteRole = searchParams.get('role')?.trim() ?? '';

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const roleLabel = useMemo(() => {
    const labels: Record<string, string> = {
      super_admin: 'Desenvolvedor / Super Admin',
      admin: 'Administrador',
      editor: 'Editor',
      redator: 'Redator / Revisor',
      moderador: 'Moderador',
      analyst: 'Analista',
    };
    return labels[inviteRole] ?? (inviteRole ? inviteRole.replace('_', ' ') : 'Membro da equipa');
  }, [inviteRole]);

  useEffect(() => {
    if (user) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleCodeNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setStep('password');
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitedEmail) {
      toast({
        title: 'Convite inválido',
        description: 'O email do convite está em falta. Abra o link enviado pelo administrador.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({ title: 'Password demasiado curta', description: 'A password deve ter pelo menos 8 caracteres.', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Passwords diferentes', description: 'As duas passwords não coincidem.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/activate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({ email: invitedEmail, code, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        const msg = data?.error || `Erro ${res.status} ao ativar conta.`;
        toast({ title: 'Erro ao ativar conta', description: msg, variant: 'destructive' });
        if (/código|convite|inválido|expirado/i.test(msg)) {
          setCode('');
          setStep('code');
        }
        return;
      }

      setStep('done');
    } catch {
      toast({ title: 'Erro de ligação', description: 'Não foi possível contactar o servidor. Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Ativar acesso da equipa"
      description={step === 'done'
        ? 'Conta ativada com sucesso. O acesso já pode ser utilizado no painel.'
        : `Convite preparado para o papel de ${roleLabel}.`}
      note="Registo protegido por convite individual"
    >
      {invitedEmail && step !== 'done' && (
        <div className="mb-6 rounded-2xl border border-primary-200/60 bg-primary-50/60 px-4 py-3 text-sm text-primary-700 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300">
          Email do convite: <strong>{invitedEmail}</strong>
        </div>
      )}

      {step === 'code' && (
        <form onSubmit={handleCodeNext} className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Código de convite</Label>
            <p className="text-sm text-muted-foreground">
              Introduza o código de 6 dígitos enviado para <strong>{invitedEmail || 'o seu email'}</strong>.
            </p>
            <div className="rounded-2xl border border-border bg-muted/30 px-3 py-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </div>
          <Button type="submit" className="h-12 w-full rounded-2xl text-base font-semibold" disabled={code.length < 6}>
            Continuar
          </Button>
          {!invitedEmail && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              Abra o link completo do email de convite para preencher automaticamente o seu email.
            </p>
          )}
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleActivate} className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="h-12 rounded-2xl"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a password"
              className="h-12 rounded-2xl"
              required
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A ativar conta…</>
              : `Ativar conta de ${roleLabel}`}
          </Button>
          <button
            type="button"
            onClick={() => setStep('code')}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar ao código
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-6 text-center">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            Conta ativada com sucesso para o perfil <strong>{roleLabel}</strong>.
          </div>
          <p className="text-sm text-muted-foreground">
            O acesso já foi preparado. Entre no painel com as credenciais definidas agora e o papel associado ao seu convite.
          </p>
          <Button
            className="h-12 w-full rounded-2xl text-base font-semibold"
            onClick={() => navigate(`/validar/entrada/tipodeuser?${new URLSearchParams({ ...(invitedEmail ? { email: invitedEmail } : {}), ...(inviteRole ? { role: inviteRole } : {}), mode: 'convite' }).toString()}`)}
          >
            Entrar como {roleLabel}
          </Button>
        </div>
      )}

      {step !== 'done' && (
        <div className="mt-6 space-y-2 border-t border-border/80 pt-5 text-center">
          <Link
            to={`/validar/entrada/tipodeuser${invitedEmail || inviteRole ? `?${new URLSearchParams({ ...(invitedEmail ? { email: invitedEmail } : {}), ...(inviteRole ? { role: inviteRole } : {}), mode: 'convite' }).toString()}` : ''}`}
            className="block text-sm font-semibold text-primary hover:text-primary/80"
          >
            Já tem conta? Fazer login
          </Link>
          <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground">
            Voltar ao site
          </Link>
        </div>
      )}
    </AuthShell>
  );
};

export default AdminRegister;
