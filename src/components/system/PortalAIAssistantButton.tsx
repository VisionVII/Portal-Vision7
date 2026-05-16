import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useCategories } from '@/hooks/useCategories';
import { useCourses } from '@/hooks/useCourses';
import { usePosts } from '@/hooks/usePosts';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { supabase } from '@/integrations/supabase/client';
import {
  buildPortalAssistantReply,
  normalizePortalAssistantReply,
  portalAssistantConfig,
  selectPortalAssistantContext,
} from '@/modules/portal-ai';
import type { PortalAssistantConfig } from '@/modules/portal-ai';
import BrandLogo from '@/components/system/BrandLogo';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputArea } from './ChatInputArea';
import type { ChatMessage } from './ChatMessageList';
import type { AssistantMessageCardData } from './AssistantMessageCard';

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Retry a fetch-based call with exponential backoff for network errors */
async function retryEdgeFunction<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isNetError =
        err instanceof TypeError && /fetch|network|internet|disconnected/i.test(err.message);
      if (!isNetError || attempt === maxRetries) throw lastError;
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
    }
  }
  throw lastError;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && /fetch|network|internet|disconnected/i.test(err.message)) return true;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: string }).message);
    return /fetch|network|internet|disconnected|ERR_INTERNET/i.test(msg);
  }
  return false;
}

const normalizeUserQuery = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const hasLocationToolIntent = (value: string) =>
  /(clima|tempo|temperat|chuva|sol|frio|calor|hora local|localiza|onde estou|minha regiao|minha regiao|meu local)/.test(normalizeUserQuery(value));

// Simple anonymous fingerprint for learning preferences (not PII)
const getUserFingerprint = (): string => {
  const key = 'v7_ai_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, fp);
  }
  return fp;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PortalAIAssistantButtonProps {
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PortalAIAssistantButton = ({ compact = false }: PortalAIAssistantButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: posts = [] } = usePosts(false, isOpen);
  const { data: courses = [] } = useCourses(false, isOpen);
  const { data: categories = [] } = useCategories(isOpen);
  const { data: siteSettings } = useSiteSettings();
  const {
    country,
    region,
    timezone,
    localTime,
    temperatureC,
    hasConsent,
    locationSource,
    isLoading: locationLoading,
  } = useUserLocation();

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load AI config from DB (site_settings), merge with hardcoded defaults
  const [aiConfig, setAiConfig] = useState<PortalAssistantConfig>(portalAssistantConfig);
  const configLoadedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || configLoadedRef.current) return;
    const controller = new AbortController();
    const loadConfig = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'portal_ai_config')
          .abortSignal(controller.signal)
          .maybeSingle();
        if (data?.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) as Record<string, unknown> : null;
          if (parsed) {
            setAiConfig((prev) => ({
              ...prev,
              enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : prev.enabled,
              provider: (parsed.provider === 'claude-haiku' || parsed.provider === 'claude-sonnet' || parsed.provider === 'local-preview')
                ? parsed.provider
                : prev.provider,
              model: typeof parsed.model === 'string' && parsed.model ? parsed.model : prev.model,
            }));
            configLoadedRef.current = true;
          }
        } else {
          configLoadedRef.current = true; // No config in DB, use defaults
        }
      } catch {
        // Use hardcoded defaults — DB might be offline
      }
    };
    void loadConfig();
    return () => controller.abort();
  }, [isOpen]);

  const [activeProvider, setActiveProvider] = useState<'claude-edge' | 'local-preview'>(
    portalAssistantConfig.provider === 'claude-haiku' || portalAssistantConfig.provider === 'claude-sonnet' ? 'claude-edge' : 'local-preview'
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const dataContext = useMemo(() => ({
    posts: posts.map((post) => ({
      title: post.title,
      excerpt: post.excerpt,
      slug: post.slug,
      category: post.categories?.name,
    })),
    courses: courses.map((course) => ({
      title: course.title,
      description: course.description,
      slug: course.slug,
    })),
    categories: categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
  }), [posts, courses, categories]);

  const assistantContext = useMemo(() => selectPortalAssistantContext(dataContext), [dataContext]);

  const precisionLabel = (() => {
    switch (locationSource) {
      case 'gps': return 'GPS (exata)';
      case 'ip': return 'IP (cidade)';
      case 'timezone': return 'Fuso horário (aprox.)';
      default: return 'Indisponível';
    }
  })();

  const precisionHint = (() => {
    switch (locationSource) {
      case 'gps':
        return 'Precisão máxima ativa — localização obtida via GPS do dispositivo.';
      case 'ip':
        return 'Precisão ao nível da cidade (via IP). Para dados exatos, ative a localização do browser nas preferências de privacidade.';
      case 'timezone':
        return 'Precisão aproximada (capital do fuso horário). Para dados exatos, ative a localização do browser nas preferências de privacidade.';
      default:
        return 'Ative personalização e localização para usar clima, região e contexto local no chat.';
    }
  })();

  const viewerContext = useMemo(
    () => ({
      hasConsent,
      country,
      region,
      timezone,
      localTime,
      temperatureC,
      locationSource,
      precisionLabel,
    }),
    [country, hasConsent, localTime, locationSource, precisionLabel, region, temperatureC, timezone],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: 'Olá! Sou o assistente do portal. Posso ajudá-lo a encontrar notícias, cursos, análises e muito mais. O que procura?',
        suggestions: ['Quais são as últimas notícias?', 'Mostra-me os cursos disponíveis', 'O que há de novo hoje?'],
      }]);
    }
  }, [isOpen, messages.length]);

  const createAssistantMessage = (reply: {
    summary: string;
    suggestions?: string[];
    links?: Array<{ label: string; href: string; type: string }>;
    provider?: 'claude-edge' | 'local-preview';
  }, cards: AssistantMessageCardData[] = []): ChatMessage => ({
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    text: reply.summary,
    suggestions: reply.suggestions,
    links: reply.links,
    cards,
    provider: reply.provider,
  });

  const buildWeatherCard = (): AssistantMessageCardData => ({
    id: `weather-${Date.now()}`,
    kind: 'weather',
    title: hasConsent ? (region || country || 'Contexto local ativo') : 'Ferramenta local indisponível',
    description: precisionHint,
    badge: 'Ferramenta local',
    stats: [
      { label: 'Temperatura', value: hasConsent ? (temperatureC !== null ? `${temperatureC}°C` : locationLoading ? 'A carregar...' : 'Sem dado') : 'Bloqueado' },
      { label: 'Hora local', value: hasConsent ? localTime : 'Bloqueado' },
      { label: 'Fuso', value: hasConsent ? (timezone || 'Automático') : 'Bloqueado' },
      { label: 'Precisão', value: precisionLabel },
    ],
  });

  const buildConsentCard = (): AssistantMessageCardData => ({
    id: `consent-${Date.now()}`,
    kind: 'consent',
    title: 'Ative ferramentas de localização',
    description: 'Para eu usar clima, região e hora local no chat, a personalização e a geolocalização precisam estar autorizadas nas preferências de privacidade.',
    badge: 'Consentimento necessário',
    action: {
      label: 'Ativar ferramentas',
      action: 'open-cookie-preferences',
    },
    secondaryAction: {
      label: 'Ver política',
      href: '/politica-privacidade',
    },
  });

  const handleSend = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');

    const conversationContext = messages
      .slice(-5)
      .concat(userMsg)
      .map((message) => ({
        role: message.role,
        text: message.text,
      }));
    const wantsLocationTool = hasLocationToolIntent(trimmed);

    if (wantsLocationTool && !hasConsent) {
      setActiveProvider('local-preview');
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(
          {
            summary: 'Consigo mostrar clima, temperatura e contexto local, mas essa ferramenta só fica disponível depois de autorizar personalização e geolocalização nas preferências de privacidade.',
            suggestions: [
              'Abra as preferências e ative personalização/localização.',
              'Depois disso, posso responder com clima atual, hora local e sugestões contextualizadas.',
            ],
            links: [{ label: 'Política de privacidade', href: '/politica-privacidade', type: 'action' }],
            provider: 'local-preview',
          },
          [buildConsentCard()],
        ),
      ]);
      return;
    }

    setIsLoading(true);

    try {
      let reply = null;
      let edgeError: string | null = null;

      if (
        aiConfig.enabled &&
        (aiConfig.provider === 'claude-haiku' || aiConfig.provider === 'claude-sonnet') &&
        aiConfig.edgeFunctionName
      ) {
        try {
          const { data, error } = await retryEdgeFunction(() =>
            supabase.functions.invoke(
              aiConfig.edgeFunctionName!,
              {
                body: {
                  question: trimmed,
                  knowledge: assistantContext,
                  conversation: conversationContext,
                  viewerContext,
                  fingerprint: getUserFingerprint(),
                  assistantId: aiConfig.assistantId,
                  model: aiConfig.model,
                },
              }
            ),
          );

          if (error) {
            console.warn('[Vision7 AI] Edge function error:', error.message || error);
            edgeError = isNetworkError(error)
              ? 'network'
              : String(error.message || 'Erro na função IA');
          } else if (data?.error) {
            console.warn('[Vision7 AI] Edge function returned error:', data.error);
            edgeError = String(data.error);
          } else {
            reply = normalizePortalAssistantReply(data);
            if (!reply) {
              console.info('[Vision7 AI] Edge function returned empty/unparseable response, using local fallback');
            }
          }
        } catch (fnErr) {
          console.warn('[Vision7 AI] Edge function call failed:', fnErr instanceof Error ? fnErr.message : 'unknown');
          edgeError = isNetworkError(fnErr) ? 'network' : 'Falha ao contactar o serviço IA';
        }
      }

      if (!reply) {
        const fallbackReply = buildPortalAssistantReply(trimmed, assistantContext, conversationContext);
        const offlineNotice = edgeError === 'network'
          ? '\n\n⚠️ _Sem ligação à Internet — a usar modo offline com conteúdos do portal._'
          : edgeError
            ? '\n\n⚠️ _IA temporariamente indisponível — a mostrar sugestões do portal._'
            : '';
        reply = {
          ...fallbackReply,
          summary: fallbackReply.summary + offlineNotice,
          provider: 'local-preview' as const,
          links: fallbackReply.links.map((link) => ({
            label: link.label,
            href: link.href,
            type: link.type,
          })),
        };
      }

      const cards: AssistantMessageCardData[] = [
        ...(wantsLocationTool ? [buildWeatherCard()] : []),
      ].slice(0, 4);

      setActiveProvider(reply.provider ?? 'local-preview');
      setMessages((prev) => [...prev, createAssistantMessage(reply, cards)]);
    } catch (err) {
      console.warn('[Vision7 AI] Unexpected error:', err instanceof Error ? err.message : 'unknown error');
      const isNetwork = isNetworkError(err);
      setActiveProvider('local-preview');
      setMessages((prev) => [
        ...prev,
        createAssistantMessage({
          summary: isNetwork
            ? 'Parece que a ligação à Internet foi interrompida. Verifique a sua conexão e tente novamente.'
            : 'Ocorreu um erro inesperado ao processar a pergunta. Tente novamente em alguns instantes.',
          suggestions: [
            'Verifique a ligação à Internet',
            'Tente reformular a pergunta',
            'Navegue pelas categorias do portal',
          ],
          links: [{ label: 'Ir para a página inicial', href: '/', type: 'action' }],
          provider: 'local-preview',
        }),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleSend(question);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          aria-label="Abrir assistente Vision7 AI"
          className={`shrink-0 text-white shadow-lg shadow-[#027ae3]/25 hover:bg-[#0269c2] ${
            compact
              ? 'h-9 w-9 rounded-lg border border-white/15 bg-[#027ae3]/95 p-0'
              : 'rounded-full bg-[#027ae3] px-3.5 py-2 text-sm'
          }`}
        >
          <Bot className={`${compact ? '' : 'mr-2 '}${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          {!compact && 'Vision7 AI'}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="flex w-[96vw] flex-col gap-0 p-0 sm:max-w-lg lg:max-w-xl [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-white/15 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:bg-white/25 [&>button:hover]:text-white"
      >
        <VisuallyHidden><SheetTitle>Assistente Vision7 AI</SheetTitle></VisuallyHidden>

        {/* Chat header */}
        <div className="shrink-0 border-b border-border bg-gradient-to-r from-[#027ae3] to-[#035aa6] px-5 py-4 dark:from-[#027ae3] dark:to-[#013b73]">
          <div className="flex items-center min-h-[36px] pr-12">
            <BrandLogo siteName={siteSettings?.site_name} logoUrl={siteSettings?.logo_url} compact showTagline={false} className="[&_img]:h-8 [&_img]:max-w-[130px] sm:[&_img]:h-9 sm:[&_img]:max-w-[145px]" />
          </div>
        </div>

        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          scrollRef={scrollRef}
          onSend={(query) => { void handleSend(query); }}
          temperatureC={temperatureC}
          localTime={localTime}
        />

        <ChatInputArea
          question={question}
          isLoading={isLoading}
          activeProvider={activeProvider}
          messageCount={messages.length}
          onQuestionChange={setQuestion}
          onSubmit={handleSubmit}
        />
      </SheetContent>
    </Sheet>
  );
};

export default PortalAIAssistantButton;
