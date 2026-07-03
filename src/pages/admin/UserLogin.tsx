import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Shield, UserPlus, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import AuthShell from '@/components/admin/AuthShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'choose' | 'invite-code' | 'invite-password' | 'invite-done' | 'otp-email' | 'otp-code';

const ROLE_LABELS: Record<string, string> = {
  editor: 'Editor',
  redator: 'Redator',
  moderador: 'Moderador',
  analyst: 'Analista',
  admin: 'Administrador',
  super_admin: 'Super Admin',
};

const UserLogin = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, canAccessDashboard } = useAuth();

  const paramMode = params.get('mode');
  const paramEmail = params.get('email') ?? '';
  const paramRole = params.get('role') ?? '';

  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState(paramEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(paramRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && canAccessDashboard) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, canAccessDashboard, navigate]);

  useEffect(() => {
    if (paramMode === 'convite' && paramEmail) {
      setStep('invite-code');
    }
  }, [paramMode, paramEmail]);

  /* ── Invite: Verify Code ── */
  const handleVerifyInviteCode = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || code.trim().length !== 6) {
      setError('Introduza o código de 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const normalized = email.toLowerCase().trim();
      const { data, error: fetchErr } = await supabase
        .from('security_codes')
        .select('id, code, expires_at, attempts, metadata')
        .eq('email', normalized)
        .eq('type', 'invite')
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchErr || !data) {
        setError('Código não encontrado ou já utilizado.');
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        await supabase.from('security_codes').update({ used: true }).eq('id', data.id);
        setError('Código expirado. Peça um novo convite ao administrador.');
        return;
      }
      if ((data.attempts ?? 0) >= 5) {
        await supabase.from('security_codes').update({ used: true }).eq('id', data.id);
        setError('Demasiadas tentativas. Peça um novo convite.');
        return;
      }
      if (data.code !== code.trim()) {
        await supabase
          .from('security_codes')
          .update({ attempts: (data.attempts ?? 0) + 1 })
          .eq('id', data.id);
        setError('Código inválido. Tente novamente.');
        return;
      }

      const meta = data.metadata as { role?: string } | null;
      if (meta?.role) setRole(meta.role);

      await supabase.from('security_codes').update({ used: true }).eq('id', data.id);
      setStep('invite-password');
    } catch {
      setError('Erro ao verificar código.');
    } finally {
      setLoading(false);
    }
  }, [code, email]);

  /* ── Invite: Create Account ── */
  const handleCreateAccount = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('A password deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const normalized = email.toLowerCase().trim();

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normalized,
        password,
      });

      if (signUpErr) {
        if (signUpErr.message?.includes('already registered')) {
          setError('Este email já tem uma conta. Use o login por código OTP.');
          return;
        }
        setError(signUpErr.message);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        setError('Erro ao criar conta. Tente novamente.');
        return;
      }

      // Assign role via edge function
      const { error: roleErr } = await supabase.functions.invoke('assign-invite-role', {
        body: { user_id: userId, email: normalized, role: role || paramRole },
      });

      if (roleErr) {
        console.error('Role assignment error:', roleErr);
      }

      setStep('invite-done');
      toast({ title: 'Conta criada com sucesso!' });
    } catch {
      setError('Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, role, paramRole, toast]);

  /* ── OTP: Request Code ── */
  const handleRequestOtp = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Introduza o seu email.');
      return;
    }
    setLoading(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: { shouldCreateUser: false },
      });
      if (otpErr) {
        setError(otpErr.message?.includes('Signups not allowed')
          ? 'Email não reconhecido. É necessário um convite para criar conta.'
          : otpErr.message);
        return;
      }
      setStep('otp-code');
      toast({ title: 'Código enviado', description: `Verifique o email ${email}` });
    } catch {
      setError('Erro ao enviar código.');
    } finally {
      setLoading(false);
    }
  }, [email, toast]);

  /* ── OTP: Verify Code ── */
  const handleVerifyOtp = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || code.trim().length !== 6) {
      setError('Introduza o código de 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: code.trim(),
        type: 'email',
      });
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }
      navigate('/admin/dashboard', { replace: true });
    } catch {
      setError('Erro ao verificar código.');
    } finally {
      setLoading(false);
    }
  }, [email, code, navigate]);

  /* ── Render ── */
  const renderStep = () => {
    switch (step) {
      case 'choose':
        return (
          <div className="space-y-4">
            <button
              onClick={() => setStep('invite-code')}
              className="w-full rounded-2xl border border-border bg-muted/40 p-5 text-left transition-colors hover:bg-muted/70"
            >
              <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Tenho um convite</p>
                  <p className="text-sm text-muted-foreground">Ativar conta com código de convite recebido por email</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('otp-email')}
              className="w-full rounded-2xl border border-border bg-muted/40 p-5 text-left transition-colors hover:bg-muted/70"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Já tenho conta</p>
                  <p className="text-sm text-muted-foreground">Entrar com código OTP enviado para o meu email</p>
                </div>
              </div>
            </button>

            <div className="space-y-3 border-t border-border/80 pt-5 text-center">
              <Link to="/admin/login" className="block text-sm font-semibold text-primary hover:text-primary/80">
                É administrador? Use o login admin
              </Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground">
                Voltar ao portal
              </Link>
            </div>
          </div>
        );

      case 'invite-code':
        return (
          <form onSubmit={handleVerifyInviteCode} className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                <Shield className="mr-1.5 inline h-4 w-4 text-primary" />
                Introduza o código de 6 dígitos do email de convite
              </p>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={!!paramEmail}
              />
            </div>

            <div>
              <Label>Código de convite</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-xl tracking-[0.3em] font-mono sm:text-2xl sm:tracking-[0.4em]"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verificar código
            </Button>

            <BackButton onClick={() => { setStep('choose'); setError(''); setCode(''); }} />
          </form>
        );

      case 'invite-password':
        return (
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
                Código válido! Defina a password para <strong>{email}</strong>
                {role && <span className="ml-1">({ROLE_LABELS[role] ?? role})</span>}
              </p>
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
              />
            </div>

            <div>
              <Label>Confirmar password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar conta
            </Button>
          </form>
        );

      case 'invite-done':
        return (
          <div className="space-y-5 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold">Conta criada!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pode agora fazer login para aceder ao dashboard.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate('/admin/login', { replace: true })}>
              Ir para login
            </Button>
          </div>
        );

      case 'otp-email':
        return (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                <KeyRound className="mr-1.5 inline h-4 w-4 text-primary" />
                Introduza o email da sua conta para receber um código de acesso
              </p>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar código
            </Button>

            <BackButton onClick={() => { setStep('choose'); setError(''); }} />
          </form>
        );

      case 'otp-code':
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Código enviado para <strong>{email}</strong>
              </p>
            </div>

            <div>
              <Label>Código OTP</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-xl tracking-[0.3em] font-mono sm:text-2xl sm:tracking-[0.4em]"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>

            <BackButton onClick={() => { setStep('otp-email'); setError(''); setCode(''); }} />
          </form>
        );
    }
  };

  const titles: Record<Step, string> = {
    choose: 'Acesso de equipa',
    'invite-code': 'Ativar convite',
    'invite-password': 'Criar conta',
    'invite-done': 'Conta criada',
    'otp-email': 'Login por código',
    'otp-code': 'Verificar código',
  };

  return (
    <AuthShell
      title={titles[step]}
      description={step === 'choose' ? 'Escolha como pretende aceder ao portal' : undefined}
    >
      {renderStep()}
    </AuthShell>
  );
};

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="mx-auto flex min-h-[44px] items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
  >
    <ArrowLeft className="h-4 w-4" /> Voltar
  </button>
);

export default UserLogin;
