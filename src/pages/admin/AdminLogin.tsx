import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/system/BrandLogo';

const env = import.meta.env as Record<string, string | undefined>;
const primaryAdminEmail = env.VITE_ADMIN_PRIMARY_EMAIL || 'admin@vision-portal.pt';

const AdminLogin = () => {
  const [email, setEmail] = useState(primaryAdminEmail);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestAdminCode, verifyAdminCode, canAccessDashboard, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const roleLabels = useMemo(
    () => ({
      super_admin: 'Super Admin',
      admin: 'Administrador',
      editor: 'Editor',
      redator: 'Redator',
      moderador: 'Moderador',
      analyst: 'Analista',
    }),
    []
  );

  useEffect(() => {
    if (user && canAccessDashboard) {
      navigate('/admin/dashboard');
    }
  }, [user, canAccessDashboard, navigate]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Informe o email autorizado para receber o código.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await requestAdminCode(email.trim());
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Falha ao enviar código',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setStep('verify');
    toast({
      title: 'Código enviado',
      description: `Enviámos um código de acesso seguro para ${email.trim()}.`,
    });
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.trim().length < 6) {
      toast({
        title: 'Código incompleto',
        description: 'Insira o código recebido no email para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error, canAccessDashboard: hasDashboardAccess, roles } = await verifyAdminCode(email.trim(), code.trim());
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Código inválido',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (!hasDashboardAccess) {
      toast({
        title: 'Sem perfil ativo',
        description: 'O código foi validado, mas este utilizador ainda não tem escopo ativo na dashboard.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Acesso autorizado',
      description: `Perfis carregados: ${roles.map((role) => roleLabels[role] ?? role).join(', ')}.`,
    });

    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-950 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-primary-100/70 bg-card/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <BrandLogo showTagline={false} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Acesso seguro à equipa Vision</h1>
            <p className="mt-2 text-muted-foreground">
              O login administrativo agora exige um código temporário enviado por email.
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-primary-100 bg-primary-50/80 p-4 text-sm dark:border-primary-900/40 dark:bg-primary-950/20">
            <p className="font-semibold text-foreground">Email principal sugerido</p>
            <p className="mt-1 text-primary-700 dark:text-primary-300">{primaryAdminEmail}</p>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email autorizado</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@vision-portal.pt"
                    className="h-12 pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full bg-primary-600 text-base text-white hover:bg-primary-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'A enviar código...' : 'Enviar código de acesso'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">Código recebido</Label>
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <KeyRound className="h-4 w-4 text-primary-600" />
                    <span>Introduza o código enviado para {email.trim()}</span>
                  </div>
                  <InputOTP id="otp" maxLength={6} value={code} onChange={setCode} containerClassName="justify-center">
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
                className="h-12 w-full bg-primary-600 text-base text-white hover:bg-primary-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'A validar...' : 'Validar código e entrar'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={async () => {
                  const { error } = await requestAdminCode(email.trim());
                  if (error) {
                    toast({ title: 'Falha ao reenviar', description: error.message, variant: 'destructive' });
                    return;
                  }
                  toast({ title: 'Novo código enviado', description: 'Verifique novamente a sua caixa de entrada.' });
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                Reenviar código
              </Button>
            </form>
          )}

          <div className="mt-6 space-y-2 text-center">
            <Link to="/admin/register" className="block text-sm font-medium text-primary-600 hover:text-primary-700">
              Recebeu um convite? Ativar conta
            </Link>
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao site
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-primary-100/80">
          Acesso restrito com validação por código e escopos hierárquicos
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
