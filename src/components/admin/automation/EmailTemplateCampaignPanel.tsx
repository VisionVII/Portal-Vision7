import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Mail, PauseCircle, PlayCircle, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAvailableTemplates } from '@/lib/email/templates';
import type { EmailTemplateData, EmailTemplateType } from '@/lib/email/types';
import { sendEmail } from '@/services/email';

type CampaignStatus = 'idle' | 'running' | 'finished';
type TemplateRunStatus = 'pending' | 'sent' | 'failed';

interface RunItem {
  template: EmailTemplateType;
  label: string;
  description: string;
  status: TemplateRunStatus;
  sentAt?: string;
  error?: string;
}

const SEND_INTERVAL_MS = 60_000;
const DEFAULT_RECIPIENTS = 'visionvidevgrid,hvvctor@gmail.com';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRecipients(input: string): string[] {
  return input
    .split(/[;,\n\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function buildTemplateData(template: EmailTemplateType): EmailTemplateData[EmailTemplateType] {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vision-portal.pt';
  const now = new Date();

  switch (template) {
    case 'login_otp':
      return {
        code: `${Math.floor(100000 + Math.random() * 900000)}`,
        userName: 'Equipe Vision',
        expiresInMinutes: 10,
        ipAddress: '127.0.0.1',
        userAgent: 'Portal Vision7 QA Campaign',
      };
    case 'security_alert':
      return {
        alertType: 'new_login',
        userName: 'Equipe Vision',
        details: 'Template de alerta de seguranca em validacao visual e de copy para o portal.',
        ipAddress: '127.0.0.1',
        timestamp: now.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }),
      };
    case 'welcome':
      return {
        userName: 'Equipe Vision',
        role: 'Administrador',
        dashboardUrl: `${origin}/admin/dashboard`,
      };
    case 'invite':
      return {
        inviterName: 'Vision VII',
        role: 'Editor',
        activationUrl: `${origin}/acesso/equipa?invite=demo-template-campaign`,
        expiresAt: now.toLocaleDateString('pt-PT'),
      };
    case 'newsletter_welcome':
      return {
        subscriberEmail: 'assinante@vision7.pt',
        unsubscribeUrl: `${origin}/?unsubscribe=assinante%40vision7.pt`,
      };
    case 'newsletter_digest':
      return {
        posts: [
          {
            title: 'Panorama de Automacoes no Portal',
            excerpt: 'Resumo executivo das entregas de automacao e impacto editorial.',
            url: `${origin}/mundo`,
          },
          {
            title: 'Diretrizes de UX para Escala',
            excerpt: 'Boas praticas para interface em alta carga de conteudo.',
            url: `${origin}/musica`,
          },
        ],
        unsubscribeUrl: `${origin}/?unsubscribe=assinante%40vision7.pt`,
      };
    case 'password_reset':
      return {
        resetUrl: `${origin}/acesso/redefinir?token=demo-reset-campaign`,
        expiresInMinutes: 30,
        userName: 'Equipe Vision',
      };
    case 'role_change':
      return {
        userName: 'Equipe Vision',
        oldRole: 'Editor',
        newRole: 'Administrador',
        changedBy: 'Sistema de Governanca',
      };
    case 'account_deactivated':
      return {
        userName: 'Equipe Vision',
        reason: 'Teste controlado de comunicacao de conta.',
        contactEmail: 'suporte@vision-portal.pt',
      };
    case 'automation_post_ready':
      return {
        postTitle: 'Analise de Tendencias de Conteudo',
        postExcerpt: 'Artigo gerado para revisao com foco em qualidade editorial e SEO.',
        editorialScore: 88,
        reviewUrl: `${origin}/admin/dashboard?tab=automacoes`,
      };
    default:
      return {
        userName: 'Equipe Vision',
        role: 'Administrador',
        dashboardUrl: `${origin}/admin/dashboard`,
      } as EmailTemplateData['welcome'];
  }
}

export function EmailTemplateCampaignPanel() {
  const { toast } = useToast();
  const templates = useMemo(() => getAvailableTemplates(), []);

  const [recipientInput, setRecipientInput] = useState(DEFAULT_RECIPIENTS);
  const [status, setStatus] = useState<CampaignStatus>('idle');
  const [cursor, setCursor] = useState(0);
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [items, setItems] = useState<RunItem[]>(() =>
    templates.map((tpl) => ({
      template: tpl.type,
      label: tpl.label,
      description: tpl.description,
      status: 'pending',
    })),
  );

  const timerRef = useRef<number | null>(null);
  const recipients = useMemo(() => parseRecipients(recipientInput), [recipientInput]);

  const sentCount = items.filter((item) => item.status === 'sent').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const pendingItems = items.filter((item) => item.status === 'pending');

  const invalidRecipients = recipients.filter((email) => !isValidEmail(email));
  const validRecipients = recipients.filter((email) => isValidEmail(email));

  const stopCampaign = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (status === 'running') {
      setStatus('idle');
    }
  }, [status]);

  const runTemplateSend = useCallback(async (index: number) => {
    if (index >= items.length) {
      stopCampaign();
      setStatus('finished');
      toast({
        title: 'Campanha concluida',
        description: `Total: ${items.length} | enviados: ${sentCount} | falhas: ${failedCount}`,
      });
      return;
    }

    if (validRecipients.length === 0) {
      toast({
        title: 'Sem destinatarios validos',
        description: 'Adicione pelo menos 1 email valido para iniciar os disparos.',
        variant: 'destructive',
      });
      stopCampaign();
      return;
    }

    const current = items[index];
    if (!current) return;

    setIsSendingNow(true);

    const sendResults = await Promise.all(
      validRecipients.map(async (to) => {
        const result = await sendEmail({
          to,
          template: current.template,
          data: buildTemplateData(current.template),
        });
        return { to, error: result.error };
      }),
    );

    const hasError = sendResults.some((result) => result.error);
    const failedRecipients = sendResults.filter((result) => result.error).map((result) => result.to);

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (hasError) {
          return {
            ...item,
            status: 'failed',
            sentAt: new Date().toISOString(),
            error: `Falha no envio para: ${failedRecipients.join(', ')}`,
          };
        }

        return {
          ...item,
          status: 'sent',
          sentAt: new Date().toISOString(),
          error: undefined,
        };
      }),
    );

    setCursor(index + 1);
    setIsSendingNow(false);
  }, [items, validRecipients, stopCampaign, toast, sentCount, failedCount]);

  const startCampaign = async () => {
    if (status === 'running') return;

    setStatus('running');

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    await runTemplateSend(cursor);
  };

  const sendNextNow = async () => {
    if (isSendingNow) return;
    await runTemplateSend(cursor);
  };

  const resetCampaign = () => {
    stopCampaign();
    setStatus('idle');
    setCursor(0);
    setItems(
      templates.map((tpl) => ({
        template: tpl.type,
        label: tpl.label,
        description: tpl.description,
        status: 'pending',
      })),
    );
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cursor >= items.length && status === 'running') {
      stopCampaign();
      setStatus('finished');
    }
  }, [cursor, items.length, status, stopCampaign]);

  useEffect(() => {
    if (status !== 'running' || isSendingNow || cursor >= items.length) {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      void runTemplateSend(cursor);
    }, SEND_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, isSendingNow, cursor, items.length, runTemplateSend]);

  return (
    <section className="space-y-5 border-l-2 border-primary/25 pl-4 sm:pl-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Campanha de Templates de Email</h3>
        <p className="text-sm text-muted-foreground">
          Fluxo de desenvolvimento para validar design, copy e cobertura dos emails existentes. O envio segue 1 template por minuto ate concluir todos.
        </p>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        Ambiente de uso: desenvolvimento. Nao e um fluxo de producao.
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-b border-border/50 pb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total templates</p>
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
        </div>
        <div className="border-b border-border/50 pb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Enviados</p>
          <p className="text-2xl font-bold text-primary">{sentCount}</p>
        </div>
        <div className="border-b border-border/50 pb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Faltantes</p>
          <p className="text-2xl font-bold text-foreground">{pendingItems.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="campaign-recipients" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Destinatarios (separados por virgula, espaco ou quebra de linha)
        </label>
        <Input
          id="campaign-recipients"
          value={recipientInput}
          onChange={(event) => setRecipientInput(event.target.value)}
          placeholder="visionvidevgrid,hvvctor@gmail.com"
          className="h-11"
        />
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Validos: {validRecipients.length}</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">Invalidos: {invalidRecipients.length}</span>
          {invalidRecipients.length > 0 && (
            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
              Corrija: {invalidRecipients.join(', ')}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void startCampaign()} disabled={status === 'running' || isSendingNow || validRecipients.length === 0}>
          <PlayCircle className="mr-1.5 h-4 w-4" />
          Iniciar ciclo 1min
        </Button>
        <Button variant="outline" onClick={stopCampaign} disabled={status !== 'running'}>
          <PauseCircle className="mr-1.5 h-4 w-4" />
          Pausar
        </Button>
        <Button variant="secondary" onClick={() => void sendNextNow()} disabled={isSendingNow || cursor >= items.length}>
          <Send className="mr-1.5 h-4 w-4" />
          Enviar proximo agora
        </Button>
        <Button variant="ghost" onClick={resetCampaign}>
          Reiniciar
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">
          Estado: {status === 'running' ? 'Rodando' : status === 'finished' ? 'Concluido' : 'Parado'}
        </p>
        <p className="mt-1">
          Cadencia: 1 envio por minuto | Proximo indice: {Math.min(cursor + 1, items.length)}/{items.length}
        </p>
        <p className="mt-1">
          Assunto: cada disparo usa o titulo normal do template, sem prefixo tecnico adicional.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist de envio</h4>
        <ul className="space-y-1.5">
          {items.map((item, index) => {
            const icon =
              item.status === 'sent'
                ? <CheckCircle2 className="h-4 w-4 text-primary" />
                : item.status === 'failed'
                  ? <XCircle className="h-4 w-4 text-destructive" />
                  : index === cursor && status === 'running'
                    ? <Mail className="h-4 w-4 text-blue-500" />
                    : <Clock3 className="h-4 w-4 text-muted-foreground" />;

            return (
              <li key={item.template} className="border-b border-border/30 pb-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    {item.sentAt && <p className="mt-1 text-[11px] text-muted-foreground">{new Date(item.sentAt).toLocaleString('pt-BR')}</p>}
                    {item.error && <p className="mt-1 text-[11px] text-destructive">{item.error}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
