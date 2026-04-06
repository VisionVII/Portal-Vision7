import { Link } from 'react-router-dom';
import { Mail, Shield } from 'lucide-react';
import AuthShell from '@/components/admin/AuthShell';

const UserLogin = () => {
  return (
    <AuthShell
      title="Acesso de equipa"
      description="Os membros da equipa editorial acedem ao portal por convite. O fluxo de entrada por código será ativado em breve."
      note="Funcionalidade em preparação"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/40 px-5 py-6 text-center">
          <Mail className="mx-auto mb-4 h-10 w-10 text-primary/60" />
          <h2 className="mb-2 text-lg font-semibold text-foreground">Login por código de acesso</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Quando ativo, receberá um código de uso único no email registado.
            O código expira em poucos minutos e só libera acesso quando o perfil está ativo no portal.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Fluxo previsto para utilizadores
          </h3>
          <ol className="list-inside list-decimal space-y-2 text-sm leading-6 text-muted-foreground">
            <li>Membro recebe convite de acesso por email</li>
            <li>Ativa a conta com o código do convite</li>
            <li>Nos acessos seguintes, introduz o email e recebe um código OTP</li>
            <li>Insere o código de 6 dígitos para entrar no dashboard</li>
            <li>O acesso é validado contra o perfil ativo (editor, redator, moderador, etc.)</li>
          </ol>
        </div>

        <div className="space-y-3 border-t border-border/80 pt-5 text-center">
          <Link
            to="/admin/login"
            className="block text-sm font-semibold text-primary hover:text-primary/80"
          >
            É administrador? Use o login admin
          </Link>
          <Link
            to="/"
            className="block text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar ao portal
          </Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default UserLogin;
