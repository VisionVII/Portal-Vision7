import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AuthShell from '@/components/admin/AuthShell';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

    setIsSubmitting(true);
    setLoginError(null);

    let result;
    try {
      result = await signIn(email, password);
    } catch (err) {
      setIsSubmitting(false);
      toast({
        title: 'Erro ao iniciar sessão',
        description: err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    const { error, canAccessDashboard: hasAccess } = result;

    setIsSubmitting(false);

    if (error) {
      const msg = error.message ?? '';
      const isCredentialError = /invalid.*credentials|invalid.*login|email.*not.*confirmed/i.test(msg);
      const displayMsg = isCredentialError
        ? 'Email ou password incorretos. Verifique e tente novamente.'
        : msg || 'Não foi possível iniciar sessão.';
      setLoginError(displayMsg);
      toast({
        title: isCredentialError ? 'Credenciais inválidas' : 'Erro ao iniciar sessão',
        description: displayMsg,
        variant: 'destructive',
      });
      return;
    }

    // Auth succeeded - the useEffect will handle redirect when canAccessDashboard becomes true
    if (hasAccess) {
      navigate('/admin/dashboard', { replace: true });
    }
    // If !hasAccess but no error, roles are still loading via listener - useEffect handles it
  };

  return (
    <AuthShell
      title="Acesso administrativo"
      description="Introduza as credenciais do perfil administrativo para aceder ao dashboard."
      note="Área restrita — apenas perfis autorizados"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@vision7.pt"
            className="h-12 rounded-2xl"
            autoComplete="email"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-2xl pr-12"
              autoComplete="current-password"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-2xl text-base font-semibold"
          disabled={isSubmitting || !email.trim() || !password}
        >
          {isSubmitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A validar…</>
            : 'Entrar no dashboard'}
        </Button>

        {loginError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center">
            <p className="text-sm text-destructive">{loginError}</p>
            <button
              type="button"
              className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
              onClick={async () => {
                await supabase.auth.signOut({ scope: 'local' });
                localStorage.clear();
                setLoginError(null);
                toast({ title: 'Sessão limpa', description: 'Tente iniciar sessão novamente.' });
              }}
            >
              Limpar sessão e tentar novamente
            </button>
          </div>
        )}
      </form>
    </AuthShell>
  );
};

export default AdminLogin;
