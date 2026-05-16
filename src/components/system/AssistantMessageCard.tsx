import React from 'react';
import { ArrowUpRight, CloudSun, Lock, Newspaper, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useSkyInfo } from '@/hooks/useSkyInfo';

export interface AssistantCardAction {
  label: string;
  href?: string;
  action?: 'open-cookie-preferences';
}

export interface AssistantMessageCardData {
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

const openCookiePreferences = () => {
  window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
};

interface CardActionProps {
  action: AssistantCardAction;
  secondary?: boolean;
}

const CardAction = ({ action, secondary = false }: CardActionProps) => {
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

interface WeatherCardProps {
  card: AssistantMessageCardData;
  temperatureC: number | null;
  localTime: string;
}

const WeatherCard = ({ card, temperatureC, localTime }: WeatherCardProps) => {
  const skyInfo = useSkyInfo(temperatureC, localTime);

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-background to-secondary-50 p-4 text-foreground shadow-[0_16px_34px_rgba(14,116,217,0.12)] dark:border-sky-200/20 dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_36%),linear-gradient(135deg,rgba(8,47,73,0.96),rgba(15,23,42,0.96))] dark:text-white dark:shadow-[0_18px_42px_rgba(8,47,73,0.3)]">
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
};

interface ConsentCardProps {
  card: AssistantMessageCardData;
}

const ConsentCard = ({ card }: ConsentCardProps) => (
  <div className="min-w-0 rounded-2xl border border-primary-200/70 bg-gradient-to-br from-primary-50 via-background to-secondary-50 p-4 shadow-[0_14px_30px_rgba(14,116,217,0.14)] dark:border-primary-300/25 dark:bg-gradient-to-br dark:from-primary-800/20 dark:to-slate-950 dark:shadow-[0_14px_34px_rgba(2,132,199,0.2)]">
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
      {card.action ? <CardAction action={card.action} /> : null}
      {card.secondaryAction ? <CardAction action={card.secondaryAction} secondary /> : null}
    </div>
  </div>
);

interface ContentCardProps {
  card: AssistantMessageCardData;
}

const ContentCard = ({ card }: ContentCardProps) => (
  <div className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-colors hover:border-primary-300/40">
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

interface AssistantMessageCardProps {
  card: AssistantMessageCardData;
  temperatureC: number | null;
  localTime: string;
}

export const AssistantMessageCard = ({ card, temperatureC, localTime }: AssistantMessageCardProps) => {
  if (card.kind === 'weather') {
    return <WeatherCard card={card} temperatureC={temperatureC} localTime={localTime} />;
  }

  if (card.kind === 'consent') {
    return <ConsentCard card={card} />;
  }

  return <ContentCard card={card} />;
};

export interface ChatMessageLink {
  label: string;
  href: string;
  type: string;
}

interface MessageLinksProps {
  links: ChatMessageLink[];
}

export const MessageLinks = ({ links }: MessageLinksProps) => (
  <div className="space-y-1 pl-1">
    {links.map((link) => (
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
);
