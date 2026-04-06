import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import AuthShell from '@/components/admin/AuthShell';
import { SUPABASE_ANON, SUPABASE_FUNCTIONS_URL } from '@/integrations/supabase/client';

const REQUESTABLE_ROLES: Array<{ value: string; label: string; description: string }> = [
  {
    value: 'editor',
    label: 'Editor',
    description: 'Curadoria, aprovação editorial, destaques e organização de pauta.',
  },
  {
    value: 'redator',
    label: 'Redator / Revisor',
    description: 'Produção de conteúdo, revisão e apoio operacional à publicação.',
  },
  {
    value: 'moderador',
    label: 'Moderador',
    description: 'Operação de comunidade, triagem, moderação e apoio à equipa.',
  },
  {
    value: 'analyst',
    label: 'Analista',
    description: 'Leitura de métricas, relatórios, performance e intelligence.',
  },
  {
    value: 'admin',
    label: 'Administrador operacional',
    description: 'Uso restrito. Só é aprovado após validação interna e necessidade comprovada.',
  },
];

const TeamAccess = () => {
  const [email, setEmail] = useState('');
  const [requestedRole, setRequestedRole] = useState('editor');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const selectedRole = useMemo(
    () => REQUESTABLE_ROLES.find((item) => item.value === requestedRole) ?? REQUESTABLE_ROLES[0],
    [requestedRole]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !requestedRole || !context.trim()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/request-team-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          requestedRole,
          context: context.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        toast({
          title: 'Não foi possível enviar o pedido',
          description: data?.error || `Erro ${res.status} ao solicitar acesso.`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Pedido enviado para análise',
        description: 'A equipa Vision7 recebeu a sua solicitação. Se houver enquadramento, o convite será enviado para o mesmo email.',
      });

      setEmail('');
      setRequestedRole('editor');
      setContext('');
    } catch {
      toast({
        title: 'Erro de ligação',
        description: 'Não foi possível contactar o serviço de pedidos. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Faça parte da Vision"
      description="Se pretende receber um convite de parceria ou acesso de equipa, submeta o seu email, selecione o perfil pretendido e explique o enquadramento real da solicitação."
      note="Entrada pública para pedidos analisados manualmente"
    >
      <div className="mb-6 rounded-2xl border border-border bg-muted/40 px-4 py-4 text-sm leading-6 text-muted-foreground">
        Este formulário não garante aprovação automática. Cada pedido é analisado pela administração com base em necessidade real, escopo de trabalho, responsabilidade operacional e aderência às regras do portal. Perfis críticos podem exigir validação adicional antes de qualquer convite.
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="partner-email">Email para convite</Label>
          <Input
            id="partner-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="parceria@empresa.pt"
            className="h-12 rounded-2xl"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Perfil pretendido</Label>
          <Select value={requestedRole} onValueChange={setRequestedRole}>
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue placeholder="Selecione o tipo de acesso" />
            </SelectTrigger>
            <SelectContent>
              {REQUESTABLE_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partner-context">Objetivo, contexto e responsabilidade esperada</Label>
          <Textarea
            id="partner-context"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Descreva como pretende utilizar o acesso, quais áreas precisa operar, duração estimada da parceria e quem responde pelo uso da conta."
            className="min-h-[140px] rounded-2xl"
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Seja específico. Respostas vagas tendem a não avançar. A equipa usa estas informações para evitar expectativas indevidas e definir o nível de acesso correto, prazos, limites e responsabilidades.
          </p>
        </div>

        <Button type="submit" className="h-12 w-full rounded-2xl text-base font-semibold" disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar solicitação…</>
            : 'Solicitar convite de parceria'}
        </Button>
      </form>

      <div className="mt-6 space-y-3 border-t border-border/80 pt-5 text-center">
        <Link
          to="/validar/entrada/tipodeuser"
          className="block text-sm font-semibold text-primary hover:text-primary/80"
        >
          Recebeu um convite? Validar entrada por tipo de utilizador
        </Link>
        <Link
          to="/acesso/admin/controlado"
          className="block text-sm font-semibold text-foreground hover:text-primary"
        >
          É administrador? Use o acesso controlado
        </Link>
        <Link
          to="/"
          className="block text-sm text-muted-foreground hover:text-foreground"
        >
          Voltar ao portal
        </Link>
      </div>
    </AuthShell>
  );
};

export default TeamAccess;