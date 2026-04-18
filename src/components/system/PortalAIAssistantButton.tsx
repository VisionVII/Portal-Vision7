import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Bot, CloudSun, Loader2, Lock, MapPin, Newspaper, Search, Send, Sparkles, TrendingUp, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCategories } from '@/hooks/useCategories';
import { useCourses } from '@/hooks/useCourses';
import { usePosts } from '@/hooks/usePosts';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useSkyInfo } from '@/hooks/useSkyInfo';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { supabase } from '@/integrations/supabase/client';
import {
  buildPortalAssistantReply,
  normalizePortalAssistantReply,
  portalAssistantConfig,
  selectPortalAssistantContext,
} from '@/modules/portal-ai';
import BrandLogo from '@/components/system/BrandLogo';

interface AssistantCardAction {
  label: string;
  href?: string;
  action?: 'open-cookie-preferences';
}

interface AssistantMessageCard {
  id: string;
  kind: 'content' | 'weather' | 'consent';
  title: string;
  description: string;
  badge?: string;
  href?: string;
  imageUrl?: string | null;
  ctaLabel?: string;
  meta?: string[];
  stats?: Array<{ label: string; value: string }>;
  action?: AssistantCardAction;
  secondaryAction?: AssistantCardAction;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: string[];
  links?: Array<{ label: string; href: string; type: string }>;
  cards?: AssistantMessageCard[];
  provider?: 'groq-edge' | 'hf-edge' | 'local-preview';
}

interface PortalAIAssistantButtonProps {
  compact?: boolean;
}

const normalizeUserQuery = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hasLocationToolIntent = (value: string) =>
  /(clima|tempo|temperat|chuva|sol|frio|calor|hora local|localiza|onde estou|minha regiao|minha regiao|meu local)/.test(normalizeUserQuery(value));

const openCookiePreferences = () => {
  window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
};

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
    isLoading: locationLoading,
  } = useUserLocation();
  const skyInfo = useSkyInfo(temperatureC, localTime);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'groq-edge' | 'hf-edge' | 'local-preview'>(
    portalAssistantConfig.provider === 'groq-edge' ? 'groq-edge' : portalAssistantConfig.provider === 'hf-edge' ? 'hf-edge' : 'local-preview'
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

  const contentCardsByHref = useMemo(() => {
    const map = new Map<string, Omit<AssistantMessageCard, 'id'>>();

    posts.forEach((post) => {
      map.set(`/post/${post.slug}`, {
        kind: 'content',
        title: post.title,
        description: post.excerpt,
        badge: post.categories?.name || 'Leitura',
        href: `/post/${post.slug}`,
        imageUrl: post.banner_url || post.image_url,
        ctaLabel: 'Abrir leitura',
        meta: [post.read_time, post.author_name].filter(Boolean),
      });
    });

    courses.forEach((course) => {
      map.set(`/curso/${course.slug}`, {
        kind: 'content',
        title: course.title,
        description: course.description,
        badge: course.categories?.name || course.category || 'Curso',
        href: `/curso/${course.slug}`,
        imageUrl: null,
        ctaLabel: 'Ver curso',
        meta: [course.level, course.duration].filter(Boolean),
      });
    });

    categories.forEach((category) => {
      map.set(`/${category.slug}`, {
        kind: 'content',
        title: category.name,
        description: `Explorar notícias, destaques e curadoria dentro da secção ${category.name}.`,
        badge: 'Categoria',
        href: `/${category.slug}`,
        imageUrl: null,
        ctaLabel: 'Explorar secção',
        meta: ['Vision7'],
      });
    });

    map.set('/audiocasts', {
      kind: 'content',
      title: 'Audiocasts Vision7',
      description: 'Abrir episódios, análises em áudio e curadoria para ouvir sem sair do portal.',
      badge: 'Áudio',
      href: '/audiocasts',
      imageUrl: null,
      ctaLabel: 'Abrir audiocasts',
      meta: ['Portal'],
    });

    return map;
  }, [posts, courses, categories]);

  const assistantContext = useMemo(() => selectPortalAssistantContext(dataContext), [dataContext]);
  const viewerContext = useMemo(
    () => ({
      hasConsent,
      country,
      region,
      timezone,
      localTime,
      temperatureC,
    }),
    [country, hasConsent, localTime, region, temperatureC, timezone],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([]);
    }
  }, [isOpen, messages.length]);

  const createAssistantMessage = (reply: {
    summary: string;
    suggestions?: string[];
    links?: Array<{ label: string; href: string; type: string }>;
    provider?: 'groq-edge' | 'hf-edge' | 'local-preview';
  }, cards: AssistantMessageCard[] = []): ChatMessage => ({
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    text: reply.summary,
    suggestions: reply.suggestions,
    links: reply.links,
    cards,
    provider: reply.provider,
  });

  const buildWeatherCard = (): AssistantMessageCard => ({
    id: `weather-${Date.now()}`,
    kind: 'weather',
    title: hasConsent ? (region || country || 'Contexto local ativo') : 'Ferramenta local indisponível',
    description: hasConsent
      ? 'Clima e hora local autorizados para enriquecer a conversa no Vision7.'
      : 'Ative personalização e localização para usar clima, região e contexto local no chat.',
    badge: 'Ferramenta local',
    stats: [
      { label: 'Temperatura', value: hasConsent ? (temperatureC !== null ? `${temperatureC}°C` : locationLoading ? 'A carregar...' : 'Sem dado') : 'Bloqueado' },
      { label: 'Hora local', value: hasConsent ? localTime : 'Bloqueado' },
      { label: 'Fuso', value: hasConsent ? (timezone || 'Automático') : 'Bloqueado' },
    ],
  });

  const buildConsentCard = (): AssistantMessageCard => ({
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

  const buildCardsFromLinks = (links?: Array<{ label: string; href: string; type: string }>) => {
    if (!links?.length) {
      return [] as AssistantMessageCard[];
    }

    // Only show cards for weather/consent - keep content suggestions as simple links
    return [];
  };

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

      if (
        portalAssistantConfig.enabled &&
        (portalAssistantConfig.provider === 'groq-edge' || portalAssistantConfig.provider === 'hf-edge') &&
        portalAssistantConfig.edgeFunctionName
      ) {
        const { data, error } = await supabase.functions.invoke(
          portalAssistantConfig.edgeFunctionName,
          {
            body: {
              question: trimmed,
              knowledge: assistantContext,
              conversation: conversationContext,
              viewerContext,
              assistantId: portalAssistantConfig.assistantId,
              model: portalAssistantConfig.model,
            },
          }
        );

        if (error) {
          throw error;
        }

        reply = normalizePortalAssistantReply(data);
      }

      if (!reply) {
        const fallbackReply = buildPortalAssistantReply(trimmed, assistantContext, conversationContext);
        reply = {
          ...fallbackReply,
          provider: 'local-preview' as const,
          links: fallbackReply.links.map((link) => ({
            label: link.label,
            href: link.href,
            type: link.type,
          })),
        };
      }

      const cards = [
        ...(wantsLocationTool ? [buildWeatherCard()] : []),
        ...buildCardsFromLinks(reply.links),
      ].slice(0, 4);

      setActiveProvider(reply.provider ?? 'local-preview');
      setMessages((prev) => [...prev, createAssistantMessage(reply, cards)]);
    } catch {
      const fallbackReply = buildPortalAssistantReply(trimmed, assistantContext, conversationContext);
      const cards = [
        ...(wantsLocationTool ? [buildWeatherCard()] : []),
        ...buildCardsFromLinks(fallbackReply.links),
      ].slice(0, 4);
      setActiveProvider('local-preview');
      setMessages((prev) => [
        ...prev,
        createAssistantMessage({
          summary: fallbackReply.summary,
          suggestions: fallbackReply.suggestions,
          links: fallbackReply.links.map((link) => ({
            label: link.label,
            href: link.href,
            type: link.type,
          })),
          provider: 'local-preview',
        }, cards),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleSend(question);
  };

  const quickActions = [
    { label: 'Principais notícias', icon: Newspaper, query: 'Quais são as notícias mais relevantes e recentes no Vision7?' },
    { label: 'Guiar por categorias', icon: Search, query: 'Qual categoria do portal Vision7 é melhor para encontrar análises sobre tecnologia e inovação?' },
    { label: 'Explorar cursos', icon: TrendingUp, query: 'Quais cursos ou formações aparecem atualmente no portal Vision7 e por que são relevantes?' },
  ];

  const renderCardAction = (action?: AssistantCardAction, secondary = false) => {
    if (!action) return null;

    const className = secondary
      ? 'inline-flex items-center justify-center rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted'
      : 'inline-flex items-center justify-center rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-700';

    if (action.href) {
      return (
        <Link to={action.href} className={className}>
          {action.label}
        </Link>
      );
    }

    if (action.action === 'open-cookie-preferences') {
      return (
        <button type="button" className={className} onClick={openCookiePreferences}>
          {action.label}
        </button>
      );
    }

    return null;
  };

  const renderMessageCard = (card: AssistantMessageCard) => {
    if (card.kind === 'weather') {
      return (
        <div key={card.id} className="min-w-0 overflow-hidden rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-background to-secondary-50 p-4 text-foreground shadow-[0_16px_34px_rgba(14,116,217,0.12)] dark:border-sky-200/20 dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_36%),linear-gradient(135deg,rgba(8,47,73,0.96),rgba(15,23,42,0.96))] dark:text-white dark:shadow-[0_18px_42px_rgba(8,47,73,0.3)]">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              {card.badge ? <p className="break-words text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-700/80 dark:text-white/60">{card.badge}</p> : null}
              <h4 className="mt-1 break-words text-base font-semibold text-foreground dark:text-white">{card.title}</h4>
              <p className="mt-1 break-words text-sm text-muted-foreground dark:text-white/72">{card.description}</p>
            </div>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${skyInfo.temperatureBg}`}>
              <CloudSun className={`h-5 w-5 ${skyInfo.temperatureColor}`} />
            </div>
          </div>

          {card.stats?.length ? (
            <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
              {card.stats.map((stat) => (
                <div key={`${card.id}-${stat.label}`} className="min-w-0 rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/6">
                  <p className="break-words text-[10px] uppercase tracking-[0.18em] text-muted-foreground dark:text-white/52">{stat.label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-foreground dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (card.kind === 'consent') {
      return (
        <div key={card.id} className="min-w-0 rounded-2xl border border-primary-200/70 bg-gradient-to-br from-primary-50 via-background to-secondary-50 p-4 shadow-[0_14px_30px_rgba(14,116,217,0.14)] dark:border-primary-300/25 dark:bg-gradient-to-br dark:from-primary-800/20 dark:to-slate-950 dark:shadow-[0_14px_34px_rgba(2,132,199,0.2)]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {card.badge ? <p className="break-words text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-700/80 dark:text-primary-200/80">{card.badge}</p> : null}
              <h4 className="mt-1 break-words text-base font-semibold text-foreground dark:text-white">{card.title}</h4>
              <p className="mt-1 break-words text-sm text-muted-foreground dark:text-slate-200">{card.description}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap">
            {renderCardAction(card.action)}
            {renderCardAction(card.secondaryAction, true)}
          </div>
        </div>
      );
    }

    return (
      <div key={card.id} className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-colors hover:border-primary-300/40">
        <div className={`relative ${card.imageUrl ? 'h-32' : 'h-28 bg-gradient-to-br from-primary-600 via-primary-700 to-slate-950'}`}>
          {card.imageUrl ? (
            <img src={card.imageUrl} alt={card.title} className="h-full w-full object-cover object-center" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-white/70" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/15 to-transparent" />
          {card.badge ? (
            <span className="absolute left-3 top-3 rounded-full border border-white/12 bg-slate-950/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/82 backdrop-blur-sm">
              {card.badge}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 space-y-3 p-3.5">
          <div className="min-w-0">
            <h4 className="line-clamp-2 break-words text-sm font-semibold text-foreground">{card.title}</h4>
            <p className="mt-1 line-clamp-3 break-words text-xs leading-relaxed text-muted-foreground">{card.description}</p>
          </div>

          {card.meta?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {card.meta.map((item) => (
                <span key={`${card.id}-${item}`} className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {card.href ? (
            <Link to={card.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700">
              {card.ctaLabel || 'Abrir'}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
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
        className="flex w-[96vw] flex-col gap-0 p-0 sm:max-w-lg lg:max-w-xl [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-white/15 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:bg-white/25 [&>button:hover]:text-white"
      >
        {/* Chat header */}
        <div className="shrink-0 border-b border-border bg-gradient-to-r from-[#027ae3] to-[#035aa6] px-5 py-4 dark:from-[#027ae3] dark:to-[#013b73]">
          <div className="flex items-center min-h-[36px] pr-12">
            <BrandLogo siteName={siteSettings?.site_name} logoUrl={siteSettings?.logo_url} compact showTagline={false} className="[&_img]:h-8 [&_img]:max-w-[130px] sm:[&_img]:h-9 sm:[&_img]:max-w-[145px]" />
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
                    <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </div>
                )}
                <div className={`min-w-0 space-y-2 ${msg.cards && msg.cards.length > 0 ? 'max-w-full sm:max-w-[94%]' : 'max-w-[92%] sm:max-w-[85%]'} ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-primary-600 text-white'
                      : 'rounded-bl-md border border-border/50 bg-muted/50 text-foreground dark:bg-muted/30'
                  }`}>
                    {msg.text}
                  </div>


                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {msg.suggestions.map((s) => (
                        <div key={s} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary-500" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.cards && msg.cards.length > 0 ? (
                    <div className={`grid min-w-0 gap-2.5 ${msg.cards.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                      {msg.cards.map((card) => renderMessageCard(card))}
                    </div>
                  ) : null}

                  {(!msg.cards || msg.cards.length === 0) && msg.links && msg.links.length > 0 && (
                    <div className="space-y-1 pl-1">
                      {msg.links.map((link) => (
                        <Link
                          key={`${link.type}-${link.href}`}
                          to={link.href}
                          className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-3 py-2 text-xs transition-colors hover:bg-muted"
                        >
                          <span className="flex items-center gap-1.5 text-foreground">
                            {link.type === 'category' ? <MapPin className="h-3.5 w-3.5 text-primary-500" /> : <Newspaper className="h-3.5 w-3.5 text-primary-500" />}
                            <span className="line-clamp-1">{link.label}</span>
                          </span>
                          <Badge variant="secondary" className="ml-2 shrink-0 text-[9px]">{link.type}</Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
                  <Bot className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="max-w-[85%] space-y-2">
                  <div className="rounded-2xl rounded-bl-md border border-border/50 bg-muted/50 px-4 py-2.5 text-sm text-foreground dark:bg-muted/30">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                      A organizar uma resposta contextualizada do portal...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sugestões rápidas</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        void handleSend(action.query);
                      }}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary-500" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pergunte algo..."
              disabled={isLoading}
              className="flex-1 rounded-xl border-border/50 bg-muted/30 text-sm"
            />
            <Button type="submit" size="icon" disabled={isLoading} className="h-10 w-10 shrink-0 rounded-xl">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PortalAIAssistantButton;
