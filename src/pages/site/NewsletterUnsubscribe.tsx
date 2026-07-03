import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useUnsubscribeNewsletter } from '@/hooks/useNewsletter';
import { MailX, CheckCircle2, AlertCircle, Home } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface StatusConfig {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  body: string | React.ReactNode;
}

const NewsletterUnsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const unsubscribe = useUnsubscribeNewsletter();
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (!email) return;
    setStatus('loading');
    unsubscribe.mutate(email, {
      onSuccess: () => setStatus('success'),
      onError: () => setStatus('error'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const configs: Record<Exclude<Status, 'loading'> | 'invalid', StatusConfig> = {
    invalid: {
      icon: AlertCircle,
      iconClass: 'text-amber-500 bg-amber-500/10',
      title: 'Link inválido',
      body: 'Este link de cancelamento não contém um endereço de email válido.',
    },
    idle: {
      icon: AlertCircle,
      iconClass: 'text-muted-foreground bg-muted',
      title: 'Aguardando',
      body: 'A inicializar...',
    },
    success: {
      icon: CheckCircle2,
      iconClass: 'text-emerald-500 bg-emerald-500/10',
      title: 'Subscrição cancelada',
      body: (
        <>
          O email <strong className="text-foreground">{email}</strong> foi removido da
          newsletter. Não receberá mais comunicações da Vision7.
        </>
      ),
    },
    error: {
      icon: MailX,
      iconClass: 'text-destructive bg-destructive/10',
      title: 'Erro ao cancelar',
      body: 'Não foi possível processar o cancelamento. Tente novamente mais tarde ou contacte-nos.',
    },
  };

  const key = !email ? 'invalid' : (status === 'idle' ? 'idle' : status === 'loading' ? null : status);
  const config = key ? configs[key] : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
            {status === 'loading' ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-muted-foreground">A processar cancelamento...</p>
              </div>
            ) : config ? (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${config.iconClass}`}>
                  <config.icon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{config.title}</h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{config.body}</p>
                </div>
                <div className="w-full border-t border-border pt-4">
                  <Link
                    to="/"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Home className="h-4 w-4" />
                    Voltar ao portal
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            Vision7 · Portal Editorial
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewsletterUnsubscribe;
