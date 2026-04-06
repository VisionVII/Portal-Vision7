import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/system/BrandLogo';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, user, canAccessDashboard } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && canAccessDashboard) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, canAccessDashboard, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    const { error, canAccessDashboard: hasAccess } = await signIn(email.trim(), password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Não foi possível autenticar',
        description: /invalid login credentials/i.test(error.message)
          ? 'Email ou password incorretos.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }

    if (!hasAccess) {
      toast({
        title: 'Sem acesso ao painel',
        description: 'A sua conta ainda não tem um perfil ativo. Contacte o administrador.',
        variant: 'destructive',
      });
      return;
    }

    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-950 p-4">
      <div className="w-full max-w-[420px]">

        <div className="rounded-2xl border border-white/10 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">

          <div className="mb-7 text-center">
            <div className="mb-4 flex justify-center">
              <BrandLogo showTagline={false} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Área de colaboradores</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com o email e password da sua conta Vision7
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@vision7.pt"
                  className="h-11 pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="mt-2 h-11 w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A autenticar…</>
                : 'Entrar no painel'}
            </Button>
          </form>

          <div className="mt-6 space-y-3 border-t border-border pt-5 text-center">
            <Link
              to="/admin/register"
              className="block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Recebeu um convite? Ativar conta →
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao portal
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-primary-100/50">
          Portal Vision7 · Acesso exclusivo à equipa editorial
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
