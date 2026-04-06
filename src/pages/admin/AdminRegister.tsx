import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/system/BrandLogo';
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
      navigate('/admin/login', { replace: true });
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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-primary-100/70 bg-card/95 p-8 shadow-2xl backdrop-blur">

          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <BrandLogo showTagline={false} />
            </div>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-600/10">
              <ShieldCheck className="h-5 w-5 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Ativar acesso da equipa</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              {step === 'done'
                ? 'Conta ativada com sucesso.'
                : `Convite para o papel de ${roleLabel}.`}
            </p>
          </div>

          {invitedEmail && step !== 'done' && (
            <div className="mb-6 rounded-xl border border-primary-200/60 bg-primary-50/40 px-4 py-2.5 text-sm text-primary-700 dark:border-primary-800/40 dark:bg-primary-950/20 dark:text-primary-300">
              Email: <strong>{invitedEmail}</strong>
            </div>
          )}

          {/* ── Step 1: código de convite ── */}
          {step === 'code' && (
            <form onSubmit={handleCodeNext} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Código de convite</Label>
                <p className="text-xs text-muted-foreground">
                  Introduza o código de 6 dígitos enviado para{' '}
                  <strong>{invitedEmail || 'o seu email'}</strong>.
                </p>
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
              <Button type="submit" className="w-full h-11 font-semibold" disabled={code.length < 6}>
                Continuar
              </Button>
              {!invitedEmail && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                  Abra o link completo do email de convite para preencher automaticamente o seu email.
                </p>
              )}
            </form>
          )}

          {/* ── Step 2: definir password ── */}
          {step === 'password' && (
            <form onSubmit={handleActivate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-12 pr-12"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a password"
                  className="h-12"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 font-semibold text-base"
                disabled={isLoading || !password || !confirmPassword}
              >
                {isLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A ativar conta…</>
                  : `Ativar conta de ${roleLabel}`}
              </Button>
              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                ← Voltar ao código
              </button>
            </form>
          )}

          {/* ── Step 3: sucesso ── */}
          {step === 'done' && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Conta ativada!</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  O seu acesso como <strong>{roleLabel}</strong> foi configurado. Pode agora entrar no painel.
                </p>
              </div>
              <Button className="w-full h-11 font-semibold" onClick={() => navigate('/admin/login')}>
                Entrar no painel
              </Button>
            </div>
          )}

          {step !== 'done' && (
            <div className="mt-6 text-center space-y-2">
              <Link to="/admin/login" className="block text-sm text-primary-600 hover:text-primary-700">
                Já tem conta? Fazer login
              </Link>
              <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao site
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-primary-100/80">
          Registo protegido por convite individual e perfil da equipa
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;
