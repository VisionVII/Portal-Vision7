import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AuthShell from '@/components/admin/AuthShell';

// Email do administrador — nunca exibido na UI
const ADMIN_EMAIL =
  ((import.meta.env.VITE_ADMIN_PRIMARY_EMAIL as string | undefined) ||
  'Visiondevgrid@proton.me').trim().toLowerCase();

const AdminAccessControlled = () => {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { requestAdminCode, verifyAdminCode, user, canAccessDashboard } = useAuth();
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
    const { error } = await requestAdminCode(ADMIN_EMAIL);
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
    const { error, canAccessDashboard: hasAccess, isAdmin } = await verifyAdminCode(ADMIN_EMAIL, code);
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

    if (!isAdmin) {
      toast({
        title: 'Perfil sem privilégio administrativo',
        description: 'O código foi validado, mas este email não possui role admin ou super_admin ativa no portal.',
        variant: 'destructive',
      });
      setCode('');
      return;
    }

    if (!hasAccess) {
      toast({
        title: 'Acesso pendente',
        description: 'O email autenticado ainda não tem um perfil administrativo ativo.',
        variant: 'destructive',
      });
      setCode('');
      return;
    }

    navigate('/admin/dashboard', { replace: true });
  };

  const handleResend = async () => {
    setCode('');
    const { error } = await requestAdminCode(ADMIN_EMAIL);
    if (error) {
      toast({ title: 'Erro ao reenviar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Novo código enviado', description: 'Verifique novamente o email.' });
    }
  };

  return (
    <AuthShell
      title="Acesso administrativo"
      description={step === 'send'
        ? 'Solicite um código de acesso único para validar a sessão administrativa.'
        : 'Introduza o código de 6 dígitos recebido no email protegido do administrador.'}
      note="Área protegida do sistema"
    >
      {step === 'send' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
            O código é de uso único, expira em poucos minutos e só libera acesso quando o perfil administrativo está ativo.
          </div>

          <Button
            className="h-12 w-full rounded-2xl text-base font-semibold"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar código…</>
              : 'Enviar código de acesso'}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-5">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Código recebido</Label>
            <div className="rounded-2xl border border-border bg-muted/30 px-3 py-5">
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
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            disabled={isVerifying || code.length < 6}
          >
            {isVerifying
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A verificar…</>
              : 'Validar e entrar'}
          </Button>

          <div className="flex items-center justify-between pt-1 text-sm">
            <button
              type="button"
              onClick={() => { setStep('send'); setCode(''); }}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-primary hover:text-primary/80"
            >
              Reenviar código
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
};

export default AdminAccessControlled;
