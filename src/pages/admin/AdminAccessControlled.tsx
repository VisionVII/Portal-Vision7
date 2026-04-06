import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/system/BrandLogo';

// Email do administrador — nunca exibido na UI
const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_PRIMARY_EMAIL as string | undefined) ||
  'Visiondevgrid@proton.me';

const AdminAccessControlled = () => {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { sendOtpCode, verifyOtpCode, user, canAccessDashboard } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Se já autenticado com acesso, redireciona imediatamente
  useEffect(() => {
    if (user && canAccessDashboard) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, canAccessDashboard, navigate]);

  const handleSend = async () => {
    setIsSending(true);
    const { error } = await sendOtpCode(ADMIN_EMAIL);
    setIsSending(false);

    if (error) {
      // Supabase returns "Signup is disabled" if shouldCreateUser:false and no user — means email not registered
      const msg = /signup.*disabled|user.*not.*found|no user/i.test(error.message)
        ? 'Email administrativo não registado no sistema de autenticação.'
        : error.message;
      toast({ title: 'Erro ao enviar código', description: msg, variant: 'destructive' });
      return;
    }

    setStep('verify');
    toast({
      title: 'Código enviado',
      description: 'Verifique o email do administrador e insira o código abaixo.',
    });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;

    setIsVerifying(true);
    const { error } = await verifyOtpCode(ADMIN_EMAIL, code);
    setIsVerifying(false);

    if (error) {
      const isCodeError = /token.*expired|invalid.*otp|otp.*expired|has expired|is invalid|sessão|session/i.test(error.message);
      const msg = isCodeError
        ? 'Código expirado ou inválido. Solicite um novo código.'
        : (error.message || 'Erro de verificação. Tente novamente.');
      toast({ title: isCodeError ? 'Código inválido' : 'Erro', description: msg, variant: 'destructive' });
      setCode('');
      return;
    }

    // Sessão criada — navega imediatamente; o dashboard fará a verificação de roles
    navigate('/admin/dashboard', { replace: true });
  };

  const handleResend = async () => {
    setCode('');
    const { error } = await sendOtpCode(ADMIN_EMAIL);
    if (error) {
      toast({ title: 'Erro ao reenviar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Novo código enviado', description: 'Verifique novamente o email.' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 via-primary-950 to-neutral-900 p-4">
      <div className="w-full max-w-[380px]">

        <div className="rounded-2xl border border-white/10 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">

          {/* Brand + ícone de segurança */}
          <div className="mb-7 text-center">
            <div className="mb-3 flex justify-center">
              <BrandLogo showTagline={false} />
            </div>
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-600/10">
              <ShieldCheck className="h-5 w-5 text-primary-500" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Acesso administrativo</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {step === 'send'
                ? 'Envie um código de verificação para o email do administrador.'
                : 'Insira o código de 6 dígitos recebido no email.'}
            </p>
          </div>

          {step === 'send' ? (
            /* ── Passo 1: enviar código ── */
            <Button
              className="h-11 w-full font-semibold"
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar código…</>
                : 'Enviar código de acesso'}
            </Button>
          ) : (
            /* ── Passo 2: verificar código ── */
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Código recebido</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    autoFocus
                  >
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

              <Button
                type="submit"
                className="h-11 w-full font-semibold"
                disabled={isVerifying || code.length < 6}
              >
                {isVerifying
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A verificar…</>
                  : 'Verificar e entrar'}
              </Button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setStep('send'); setCode(''); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  className="flex items-center gap-1 text-primary-400 hover:text-primary-300"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Reenviar código
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-white/20">
          Acesso restrito · Área protegida do sistema
        </p>
      </div>
    </div>
  );
};

export default AdminAccessControlled;
