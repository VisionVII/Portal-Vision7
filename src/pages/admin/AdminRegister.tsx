import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BrandLogo from '@/components/system/BrandLogo';

const AdminRegister = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite')?.trim() ?? '';
  const invitedEmail = searchParams.get('email')?.trim() ?? '';
  const inviteRole = searchParams.get('role')?.trim() ?? '';

  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const hasInvite = useMemo(() => Boolean(inviteToken), [inviteToken]);
  const inviteRoleLabel = useMemo(() => {
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
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

  useEffect(() => {
    if (user) {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasInvite) {
      toast({
        title: 'Convite obrigatório',
        description: 'Este registo é exclusivo para membros convidados. Abra o link enviado pelo administrador.',
        variant: 'destructive',
      });
      return;
    }

    if (!email || !password || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Por favor preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As passwords não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (invitedEmail && email.toLowerCase() !== invitedEmail.toLowerCase()) {
      toast({
        title: 'Email diferente do convite',
        description: 'Use o mesmo email que recebeu o convite para ativar o perfil corretamente.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A password deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: "Erro ao registar",
        description: error.message === 'User already registered' 
          ? 'Este email já está registado.' 
          : error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    toast({
      title: "Conta ativada",
      description: "Registo concluído com sucesso. Pode agora entrar com o perfil atribuído no convite.",
    });
    
    navigate('/admin/login');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-primary-100/70 bg-card/95 p-8 shadow-2xl backdrop-blur">
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <BrandLogo showTagline={false} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Ativar acesso da equipa</h1>
            <p className="text-muted-foreground mt-2">Conclua o registo com o convite recebido para entrar com o seu papel específico.</p>
          </div>

          <div className={`mb-6 rounded-xl border p-3 text-sm ${hasInvite ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'}`}>
            {hasInvite
              ? `Convite detetado${invitedEmail ? ` para ${invitedEmail}` : ''}. Perfil previsto: ${inviteRoleLabel}.`
              : 'Falta o token de convite. Peça ao administrador para lhe reenviar o link.'}
          </div>

          {hasInvite && (
            <div className="mb-6 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <p className="font-semibold text-foreground">Como funciona a ativação</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• confirme o email do convite;</li>
                <li>• defina a password de acesso;</li>
                <li>• entre no painel com o papel <span className="font-medium text-foreground">{inviteRoleLabel}</span>.</li>
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@vision.pt"
                className="h-12"
                readOnly={Boolean(invitedEmail)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pr-12"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-lg text-white"
              disabled={isLoading || !hasInvite}
            >
              {isLoading ? 'A registar...' : `Ativar conta ${hasInvite ? `de ${inviteRoleLabel}` : ''}`}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link 
              to="/admin/login" 
              className="block text-sm text-primary-600 hover:text-primary-700"
            >
              Já ativou a conta? Faça login
            </Link>
            <Link 
              to="/" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao site
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-primary-100/80">
          Registo protegido por convite individual e perfil da equipa
        </p>
      </div>
    </div>
  );
};

export default AdminRegister;
