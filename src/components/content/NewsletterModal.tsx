import { useState, useEffect, useRef } from 'react';
import { X, Mail, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { useSubscribeNewsletter } from '@/hooks/useNewsletter';

interface NewsletterModalProps {
  open: boolean;
  onClose: () => void;
}

const NewsletterModal = ({ open, onClose }: NewsletterModalProps) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'duplicate'>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const subscribe = useSubscribeNewsletter();

  useEffect(() => {
    if (open) {
      setEmail('');
      setStatus('idle');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError('Por favor insira um email válido.');
      return;
    }

    try {
      const result = await subscribe.mutateAsync(trimmed);
      setStatus(result.alreadySubscribed ? 'duplicate' : 'success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Assinar newsletter"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/90 to-blue-700 px-6 py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Newsletter Vision7</h2>
          <p className="mt-1.5 text-sm text-blue-100">
            Análises, tendências e insights exclusivos toda semana
          </p>
        </div>

        <div className="px-6 py-6">
          {status === 'success' ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Inscrição confirmada!</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Bem-vindo à Vision7. Verifique sua caixa de entrada — um email de boas-vindas está a caminho.
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continuar lendo
              </button>
            </div>
          ) : status === 'duplicate' ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Mail className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Você já é assinante!</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Este email já está inscrito na newsletter Vision7. Obrigado por fazer parte da comunidade.
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Continuar lendo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {['Análises aprofundadas semanais', 'Notícias tecnologia, negócios e inovação', 'Conteúdo exclusivo para assinantes', 'Cancele quando quiser — sem spam'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={subscribe.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {subscribe.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                ) : (
                  <><Mail className="h-4 w-4" /> Assinar gratuitamente</>
                )}
              </button>

              <p className="text-center text-[11px] text-muted-foreground/70">
                Ao assinar, concorda com nossa{' '}
                <a href="/privacy-policy" className="underline hover:text-foreground transition-colors">
                  Política de Privacidade
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsletterModal;
