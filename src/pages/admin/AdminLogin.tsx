import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AuthShell from '@/components/admin/AuthShell';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    let result;
    try {
      result = await signIn(email, password);
    } catch (err) {
      setIsSubmitting(false);
      return;
    }

    const { error, isAdmin, canAccessDashboard: hasAccess } = result;

    setIsSubmitting(false);

    if (error) {
      const isCredentialError = /invalid.*credentials|invalid.*login|email.*not.*confirmed/i.test(error.message);
      toast({
        title: isCredentialError ? 'Credenciais inválidas' : 'Erro ao iniciar sessão',
        description: isCredentialError
          ? 'Email ou password incorretos. Verifique e tente novamente.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }

    if (!isAdmin) {
      toast({
        title: 'Sem privilégio administrativo',
        description: 'Esta conta não possui perfil admin ou super_admin ativo.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasAccess) {
      toast({
        title: 'Acesso negado',
        description: 'O perfil não tem permissão ativa para aceder ao dashboard.',
        variant: 'destructive',
      });
      return;
    }

    navigate('/admin/dashboard', { replace: true });
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
      </form>
    </AuthShell>
  );
};

export default AdminLogin;
