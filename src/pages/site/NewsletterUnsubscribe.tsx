import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useUnsubscribeNewsletter } from '@/hooks/useNewsletter';
import { MailX, CheckCircle2, AlertCircle } from 'lucide-react';

const NewsletterUnsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const unsubscribe = useUnsubscribeNewsletter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!email) return;
    setStatus('loading');
    unsubscribe.mutate(email, {
      onSuccess: () => setStatus('success'),
      onError: () => setStatus('error'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {!email ? (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="text-xl font-bold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link de cancelamento não contém um email válido.
            </p>
          </>
        ) : status === 'loading' ? (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">A processar cancelamento...</p>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="text-xl font-bold">Subscrição cancelada</h1>
            <p className="text-sm text-muted-foreground">
              O email <strong>{email}</strong> foi removido da newsletter. Não receberá mais comunicações.
            </p>
          </>
        ) : (
          <>
            <MailX className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="text-xl font-bold">Erro ao cancelar</h1>
            <p className="text-sm text-muted-foreground">
              Não foi possível processar o cancelamento. Tente novamente mais tarde ou contacte-nos.
            </p>
          </>
        )}
        <Link
          to="/"
          className="inline-block text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          Voltar ao site
        </Link>
      </div>
    </div>
  );
};

export default NewsletterUnsubscribe;
