import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Calendar, Headphones, Download } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { useAudioPlayerOptional } from '@/contexts/audio-player';

interface AudiocastCardProps {
  podcast: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    audio_url?: string | null;
    cover_url?: string | null;
    duration: number | null;
    status: string;
    published_at: string | null;
    created_at: string;
    views: number;
    downloads: number;
    categories?: {
      name: string;
      color: string;
    } | null;
  };
  showStats?: boolean;
  compact?: boolean;
  featured?: boolean;
}

const FALLBACK_GRADIENT = 'bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800';

const AudiocastCard: React.FC<AudiocastCardProps> = ({
  podcast,
  showStats = true,
  compact = false,
  featured = false,
}) => {
  const player = useAudioPlayerOptional();
  const navigate = useNavigate();

  const formattedDate = new Date(podcast.published_at || podcast.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const hasCover = !!podcast.cover_url;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (player && podcast.audio_url) {
      player.play({
        id: podcast.id,
        title: podcast.title,
        audio_url: podcast.audio_url,
        cover_url: podcast.cover_url,
        duration: podcast.duration,
        description: podcast.description,
        slug: podcast.slug,
      });
    } else {
      navigate(`/audiocast/${podcast.slug}`);
    }
  };

  // ─── Compact: sidebar / related section ─────────────────────────────────
  if (compact) {
    return (
      <Link to={`/audiocast/${podcast.slug}`} className="group block">
        <div className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-muted/60">
          {/* Thumbnail */}
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
            {hasCover ? (
              <img src={podcast.cover_url!} alt={podcast.title} width={56} height={56} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className={`${FALLBACK_GRADIENT} flex h-full w-full items-center justify-center`}>
                <Headphones className="h-5 w-5 text-white/60" />
              </div>
            )}
            <button onClick={handlePlay} aria-label={`Reproduzir ${podcast.title}`} className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="h-4 w-4 fill-white text-white" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
              {podcast.title}
            </h4>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{formatDuration(podcast.duration || 0)}</span>
              <span className="opacity-40">·</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ─── Featured: hero-style wide card ─────────────────────────────────────
  if (featured) {
    return (
      <Link to={`/audiocast/${podcast.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-2xl border border-border/50 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
          {/* Cover background */}
          <div className="relative h-72 sm:h-80 md:h-96">
            {hasCover ? (
              <img src={podcast.cover_url!} alt={podcast.title} width={640} height={400} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            ) : (
              <div className={`${FALLBACK_GRADIENT} h-full w-full`} />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Play button */}
            <button onClick={handlePlay} aria-label={`Reproduzir ${podcast.title}`} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-1 h-7 w-7 fill-white text-white" />
              </div>
            </button>

            {/* Content overlay */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {podcast.categories && (
                  <Badge className="border-0 text-xs font-semibold" style={{ backgroundColor: podcast.categories.color, color: '#fff' }}>
                    {podcast.categories.name}
                  </Badge>
                )}
                <Badge variant="outline" className="border-white/30 bg-white/10 text-[11px] text-white backdrop-blur-sm">
                  Audiocast
                </Badge>
              </div>
              <h2 className="mb-2 text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                {podcast.title}
              </h2>
              {podcast.description && (
                <p className="mb-4 line-clamp-2 max-w-2xl text-sm text-white/80 sm:text-base">
                  {podcast.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatDuration(podcast.duration || 0)}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formattedDate}</span>
                {showStats && (
                  <>
                    <span className="flex items-center gap-1.5"><Headphones className="h-4 w-4" />{podcast.views.toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"><Download className="h-4 w-4" />{podcast.downloads.toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // ─── Regular: grid card with cover as background ────────────────────────
  return (
    <Link to={`/audiocast/${podcast.slug}`} className="group block h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
        {/* Cover image area */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {hasCover ? (
            <img src={podcast.cover_url!} alt={podcast.title} width={640} height={400} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className={`${FALLBACK_GRADIENT} flex h-full w-full items-center justify-center`}>
              <Headphones className="h-12 w-12 text-white/20" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Play button */}
          <button onClick={handlePlay} aria-label={`Reproduzir ${podcast.title}`} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
              <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
            </div>
          </button>

          {/* Category badge */}
          {podcast.categories && (
            <div className="absolute left-3 top-3">
              <Badge className="border-0 text-[10px] font-semibold shadow-sm" style={{ backgroundColor: podcast.categories.color, color: '#fff' }}>
                {podcast.categories.name}
              </Badge>
            </div>
          )}

          {/* Duration pill */}
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <Clock className="h-3 w-3" />
              {formatDuration(podcast.duration || 0)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <h3 className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {podcast.title}
          </h3>
          {podcast.description && (
            <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {podcast.description}
            </p>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
            {showStats && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Headphones className="h-3 w-3" />{podcast.views.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{podcast.downloads.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
};

export default AudiocastCard;