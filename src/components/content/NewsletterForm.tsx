import React, { useState } from 'react';
import { useSubscribeNewsletter } from '@/hooks/useNewsletter';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle } from 'lucide-react';

interface NewsletterFormProps {
  variant?: 'sidebar' | 'footer' | 'hero';
}

const NewsletterForm: React.FC<NewsletterFormProps> = ({ variant = 'sidebar' }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const subscribe = useSubscribeNewsletter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      toast({
        title: "Erro",
        description: "Por favor insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      await subscribe.mutateAsync(email);
      setSubscribed(true);
      setEmail('');
      toast({
        title: "Subscrito com sucesso! 🎉",
        description: "Receberá as nossas notícias no seu email.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: message || "Erro ao subscrever. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span>Obrigado por subscrever!</span>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu melhor email"
          className="w-full rounded-lg border border-primary-900/30 bg-gray-900 px-3 py-2 text-white focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          required
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="w-full rounded-lg bg-primary-600 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {subscribe.isPending ? 'A subscrever...' : 'Subscrever'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu melhor email"
        className="w-full rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary-300"
        required
      />
      <button
        type="submit"
        disabled={subscribe.isPending}
        className="w-full rounded-lg bg-white py-2 font-semibold text-primary-700 transition-colors hover:bg-secondary-50 disabled:opacity-50"
      >
        {subscribe.isPending ? 'A subscrever...' : 'Subscrever'}
      </button>
    </form>
  );
};

export default NewsletterForm;
