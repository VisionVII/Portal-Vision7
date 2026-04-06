import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import AuthShell from '@/components/admin/AuthShell';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_ANON, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';

type Mode = 'access' | 'invite';
type AccessStep = 'send' | 'verify';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  editor: 'Editor',
  redator: 'Redator / Revisor',
  moderador: 'Moderador',
  analyst: 'Analista',
};

const EntryTypeValidation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode') === 'convite' ? 'invite' : 'access';
  const emailParam = searchParams.get('email')?.trim() ?? '';
  const roleParam = searchParams.get('role')?.trim() ?? '';

  const [mode, setMode] = useState<Mode>(modeParam);
  const [accessStep, setAccessStep] = useState<AccessStep>('send');
  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const { sendOtpCode, verifyOtpCode, signOut, user, canAccessDashboard } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const roleLabel = useMemo(() => {
    if (!roleParam) return 'Perfil editorial';
    return ROLE_LABELS[roleParam] ?? roleParam.replace('_', ' ');
  }, [roleParam]);

  useEffect(() => {
    setMode(modeParam);
  }, [modeParam]);

  useEffect(() => {
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }, [emailParam, email]);

  useEffect(() => {
    if (user && canAccessDashboard) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, canAccessDashboard, navigate]);

  const updateMode = (nextMode: Mode) => {
    setMode(nextMode);
    setAccessStep('send');
    setOtpCode('');
    const nextParams = new URLSearchParams(searchParams);
    if (nextMode === 'invite') {
      nextParams.set('mode', 'convite');
    } else {
      nextParams.delete('mode');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const sendAccessCode = async () => {
    if (!email.trim()) return { error: new Error('Informe o email para receber o código de entrada.') };

    const response = await sendOtpCode(email.trim().toLowerCase());

    if (!response.error) {
      setAccessStep('verify');
    }

    return response;
  };

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    const { error } = await sendAccessCode();
    setIsSending(false);

    if (error) {
      toast({
        title: 'Não foi possível enviar o código',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setAccessStep('verify');
    toast({
      title: 'Código enviado',
      description: 'Verifique o email informado e introduza o código recebido para validar a entrada.',
    });
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otpCode.length < 6) return;

    setIsVerifying(true);
    const result = await verifyOtpCode(email.trim().toLowerCase(), otpCode);
    setIsVerifying(false);

    if (result.error) {
      toast({
        title: 'Falha ao validar entrada',
        description: result.error.message,
        variant: 'destructive',
      });
      setOtpCode('');
      return;
    }

    if (result.roles.some((role) => role === 'admin' || role === 'super_admin')) {
      await signOut();
      toast({
        title: 'Entrada administrativa separada',
        description: 'Perfis administrativos usam a rota controlada por segurança.',
      });
      navigate('/acesso/admin/controlado', { replace: true });
      return;
    }

    if (!result.canAccessDashboard) {
      toast({
        title: 'Acesso ainda não disponível',
        description: 'O seu perfil ainda não possui permissões ativas para o dashboard.',
        variant: 'destructive',
      });
      return;
    }

    navigate('/admin/dashboard', { replace: true });
  };

  const handleActivateInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim()) {
      toast({ title: 'Email obrigatório', description: 'Informe o email que recebeu o convite.', variant: 'destructive' });
      return;
    }

    if (inviteCode.length < 6) {
      toast({ title: 'Código incompleto', description: 'Introduza os 6 dígitos do convite.', variant: 'destructive' });
      return;
    }

    if (password.length < 8) {
      toast({ title: 'Password demasiado curta', description: 'Defina uma password com pelo menos 8 caracteres.', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Passwords diferentes', description: 'As duas passwords não coincidem.', variant: 'destructive' });
      return;
    }

    setIsActivating(true);

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/activate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: inviteCode,
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        toast({
          title: 'Falha ao ativar convite',
          description: data?.error || `Erro ${res.status} ao ativar o acesso.`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Acesso preparado',
        description: 'Conta ativada com sucesso. Agora valide a entrada por código no mesmo email.',
      });

      setInviteCode('');
      setPassword('');
      setConfirmPassword('');
      updateMode('access');
    } catch {
      toast({
        title: 'Erro de ligação',
        description: 'Não foi possível contactar o serviço de ativação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <AuthShell
      title="Validar entrada por tipo de utilizador"
      description="Perfis editoriais, parceiros e convidados usam uma validação por código no email. Perfis administrativos entram apenas pela rota controlada."
      note="Login hierárquico com regras por perfil"
    >
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/30 p-2">
        <button
          type="button"
          onClick={() => updateMode('access')}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${mode === 'access' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
        >
          Entrar por código
        </button>
        <button
          type="button"
          onClick={() => updateMode('invite')}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${mode === 'invite' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
        >
          Primeiro acesso por convite
        </button>
      </div>

      {roleParam && (
        <div className="mb-6 rounded-2xl border border-primary-200/60 bg-primary-50/60 px-4 py-3 text-sm text-primary-700 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300">
          Perfil previsto no convite: <strong>{roleLabel}</strong>
        </div>
      )}

      {mode === 'access' ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
            Este fluxo serve para acessos já aprovados. O código é enviado ao email do utilizador e a entrada só é liberada se o papel estiver ativo no portal.
          </div>

          {accessStep === 'send' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="entry-email">Email de acesso</Label>
                <Input
                  id="entry-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="equipa@vision7.pt"
                  className="h-12 rounded-2xl"
                  autoComplete="email"
                  required
                />
              </div>

              <Button type="submit" className="h-12 w-full rounded-2xl text-base font-semibold" disabled={isSending}>
                {isSending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar código…</>
                  : 'Receber código de entrada'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Código recebido</Label>
                <div className="rounded-2xl border border-border bg-muted/30 px-3 py-5">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus>
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

              <Button type="submit" className="h-12 w-full rounded-2xl text-base font-semibold" disabled={isVerifying || otpCode.length < 6}>
                {isVerifying
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A validar entrada…</>
                  : 'Entrar no portal'}
              </Button>

              <div className="flex items-center justify-between pt-1 text-sm">
                <button
                  type="button"
                  onClick={() => { setAccessStep('send'); setOtpCode(''); }}
                  className="font-medium text-muted-foreground hover:text-foreground"
                >
                  Alterar email
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsSending(true);
                    const { error } = await sendAccessCode();
                    setIsSending(false);

                    if (error) {
                      toast({
                        title: 'Não foi possível reenviar o código',
                        description: error.message,
                        variant: 'destructive',
                      });
                      return;
                    }

                    toast({
                      title: 'Código reenviado',
                      description: 'Verifique novamente o email informado.',
                    });
                  }}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Reenviar código
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={handleActivateInvite} className="space-y-5">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
            Se recebeu um convite mas ainda não ativou a conta, use o código enviado pelo portal para concluir o primeiro acesso. Depois disso, as próximas entradas serão sempre por código no email.
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do convite</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="equipa@vision7.pt"
              className="h-12 rounded-2xl"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Código de convite</Label>
            <div className="rounded-2xl border border-border bg-muted/30 px-3 py-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={inviteCode} onChange={setInviteCode} autoFocus>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="invite-password">Password inicial</Label>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((value) => !value)}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <Input
              id="invite-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="h-12 rounded-2xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-password-confirm">Confirmar password</Label>
            <Input
              id="invite-password-confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita a password"
              className="h-12 rounded-2xl"
              required
            />
          </div>

          <Button type="submit" className="h-12 w-full rounded-2xl text-base font-semibold" disabled={isActivating}>
            {isActivating
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A preparar acesso…</>
              : 'Ativar acesso e continuar'}
          </Button>
        </form>
      )}

      <div className="mt-6 space-y-3 border-t border-border/80 pt-5 text-center">
        <Link to="/acesso/convidado" className="block text-sm font-semibold text-primary hover:text-primary/80">
          Solicitar acesso / parceria
        </Link>
        <Link to="/acesso/admin/controlado" className="block text-sm font-semibold text-foreground hover:text-primary">
          É administrador? Use o acesso controlado
        </Link>
        <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground">
          Voltar ao portal
        </Link>
      </div>
    </AuthShell>
  );
};

export default EntryTypeValidation;