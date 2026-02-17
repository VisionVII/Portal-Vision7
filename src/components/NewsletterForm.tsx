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
    
    if (!email || !email.includes('@')) {
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao subscrever. Tente novamente.",
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
          placeholder="Seu email"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-portugal-green text-white"
          required
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="w-full bg-portugal-green hover:bg-green-700 text-white py-2 rounded transition-colors disabled:opacity-50"
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
        placeholder="Seu email"
        className="w-full px-3 py-2 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
        required
      />
      <button
        type="submit"
        disabled={subscribe.isPending}
        className="w-full bg-white text-portugal-green py-2 rounded font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {subscribe.isPending ? 'A subscrever...' : 'Subscrever'}
      </button>
    </form>
  );
};

export default NewsletterForm;
