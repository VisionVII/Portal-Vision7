import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Eye,
  Newspaper,
  PencilLine,
  Plus,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Post, usePosts, usePostStats } from '@/hooks/usePosts';
import type { AdminView } from '@/components/admin/dashboard-types';

interface OverviewViewProps {
  onNewPost: () => void;
  onNavigate: (view: AdminView) => void;
  onEdit: (post: Post) => void;
  allowedViews: AdminView[];
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff}d atrás`;
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

const STATUS: Record<string, { bar: string; dot: string; text: string }> = {
  published: { bar: 'bg-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  draft:     { bar: 'bg-amber-400',   dot: 'bg-amber-400',   text: 'text-amber-400'  },
  scheduled: { bar: 'bg-blue-400',    dot: 'bg-blue-400',    text: 'text-blue-400'   },
};

// Section header with left accent bar
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3.5 w-[3px] rounded-full bg-primary" />
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">
        {children}
      </span>
    </div>
  );
}

/** Faixa de topo: data/hora ao vivo + mensagens do portal em rotação calma
 * (crossfade). Mesmo padrão de setInterval + pausa em document.hidden já
 * usado no carrossel de banners da homepage (src/pages/site/Index.tsx). */
function OverviewInfoBanner({ messages }: { messages: string[] }) {
  const [now, setNow] = useState(() => new Date());
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setMsgIndex((i) => (i >= messages.length ? 0 : i));
  }, [messages.length]);

  useEffect(() => {
    if (messages.length < 2) return;
    let intervalId: number | undefined;

    const start = () => {
      if (intervalId == null) {
        intervalId = window.setInterval(() => {
          setMsgIndex((prev) => (prev + 1) % messages.length);
        }, 5600);
      }
    };
    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [messages.length]);

  const dateLabel = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeLabel = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  const activeMessage = messages[msgIndex] ?? messages[0] ?? '';

  return (
    <div
      data-tour="overview-banner"
      className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-border/20 bg-card/50 px-5 py-3.5 shadow-sm dark:bg-card/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60">
        <span className="capitalize">{dateLabel}</span>
        <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/30" />
        <span className="tabular-nums text-foreground/70">{timeLabel}</span>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden sm:text-right">
        <p key={msgIndex} className="animate-in fade-in truncate text-[13px] font-medium text-foreground duration-500">
          {activeMessage}
        </p>
      </div>
    </div>
  );
}

const STAT_TONE = {
  success: {
    card: 'border-emerald-500/20 bg-emerald-500/[0.04]',
    icon: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    card: 'border-amber-500/20 bg-amber-500/[0.04]',
    icon: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    value: 'text-amber-600 dark:text-amber-400',
  },
  blue: {
    card: 'border-blue-500/20 bg-blue-500/[0.04]',
    icon: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
    value: 'text-blue-600 dark:text-blue-400',
  },
  neutral: {
    card: 'border-border/40 bg-card',
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
} as const;

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub: string;
  tone: keyof typeof STAT_TONE;
  progress?: number;
}

function StatCard({ icon: Icon, label, value, sub, tone, progress }: StatCardProps) {
  const t = STAT_TONE[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6 ${t.card}`}>
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${t.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">{label}</p>
      <p className={`mt-2 text-4xl font-black tabular-nums leading-none tracking-tight ${t.value}`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground/60">{sub}</p>
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-border/10">
          <div
            className={`h-full transition-all duration-700 ease-out ${tone === 'success' ? 'bg-emerald-400' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

const OverviewView: React.FC<OverviewViewProps> = ({ onNewPost, onNavigate, onEdit, allowedViews }) => {
  const { data: posts, isLoading: postsLoading } = usePosts(true);
  const { data: stats, isLoading: statsLoading } = usePostStats();

  const publishedPosts = useMemo(() => posts?.filter((p) => p.status === 'published') ?? [], [posts]);

  const recentPosts = useMemo(
    () => [...(posts ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4),
    [posts],
  );

  // Continua a ser calculado (não há secção "Top categorias" visível) porque
  // a faixa de informações usa a categoria mais forte numa das mensagens.
  const postsByCategory = useMemo(
    () =>
      Object.entries(
        publishedPosts.reduce<Record<string, number>>((acc, p) => {
          const name = p.categories?.name ?? 'Sem categoria';
          acc[name] = (acc[name] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [publishedPosts],
  );

  const thisMonth   = stats?.thisMonth ?? 0;
  const total       = stats?.total ?? 0;
  const totalViews  = stats?.totalViews ?? 0;
  const drafts      = stats?.drafts ?? 0;
  const monthlyTarget  = Math.max(Math.ceil(total / 30), 1);
  const targetProgress = Math.min((thisMonth / monthlyTarget) * 100, 100);
  const onTarget    = thisMonth >= monthlyTarget;

  const bannerMessages = useMemo(() => {
    const msgs: string[] = [
      `${total} post${total === 1 ? '' : 's'} publicados no total`,
      onTarget ? 'Meta do mês atingida ✓' : `Faltam ${monthlyTarget - thisMonth} posts para a meta do mês`,
    ];
    if (totalViews > 0) msgs.push(`${totalViews.toLocaleString('pt-PT')} visualizações acumuladas`);
    if (postsByCategory.length > 0) {
      const [topCategory, topCount] = postsByCategory[0];
      msgs.push(`${topCategory} é a categoria mais forte — ${topCount} post${topCount === 1 ? '' : 's'}`);
    }
    if (drafts > 0) msgs.push(`${drafts} rascunho${drafts === 1 ? '' : 's'} por publicar`);
    return msgs;
  }, [total, onTarget, monthlyTarget, thisMonth, totalViews, postsByCategory, drafts]);

  return (
    <div className="relative space-y-6">

      {/* ── Ambient glow (Vision7 blue) ─────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-[#027ae3] opacity-[0.06] blur-3xl dark:opacity-[0.08]"
      />

      {/* ── Info banner: data/hora + mensagens do portal ─── */}
      <OverviewInfoBanner messages={bannerMessages} />

      {/* ── Stats cards ──────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div data-tour="overview-stats" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            icon={Target}
            label="Este mês"
            value={thisMonth}
            sub={onTarget ? '✓ Meta atingida' : `−${monthlyTarget - thisMonth} em falta`}
            tone={onTarget ? 'success' : 'warning'}
            progress={Math.max(targetProgress, thisMonth > 0 ? 3 : 0)}
          />
          <StatCard
            icon={Newspaper}
            label="Publicados"
            value={total}
            sub="total acumulado"
            tone="blue"
          />
          <StatCard
            icon={Eye}
            label="Visualizações"
            value={totalViews.toLocaleString('pt-PT')}
            sub="total histórico"
            tone="neutral"
          />
          <StatCard
            icon={PencilLine}
            label="Rascunhos"
            value={drafts}
            sub="por publicar"
            tone={drafts > 0 ? 'warning' : 'neutral'}
          />
        </div>
      )}

      {/* ── Últimos artigos ──────────────────────────────── */}
      <div data-tour="overview-articles">
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>Últimos artigos</SectionLabel>
          {allowedViews.includes('content') && (
            <button
              type="button"
              onClick={() => onNavigate('content')}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {postsLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[52px] rounded-xl" />
            ))}
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Sem artigos ainda.</p>
            {allowedViews.includes('content') && (
              <Button size="sm" variant="ghost" onClick={onNewPost} className="mt-2 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Criar primeiro artigo
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {recentPosts.map((post) => {
              const s = STATUS[post.status] ?? STATUS.draft;
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onEdit(post)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/25 active:bg-muted/40"
                >
                  {/* Status left bar */}
                  <div className={`h-9 w-[3px] shrink-0 rounded-full ${s.bar} opacity-70 transition-opacity group-hover:opacity-100`} />
                  {/* Text */}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {post.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50">
                      {post.categories?.name ?? 'Sem categoria'} · {formatRelative(post.created_at)}
                    </p>
                  </div>
                  {/* Status dot */}
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewView;
