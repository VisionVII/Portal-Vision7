import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface PostCardProps {
  id: string | number;
  title: string;
  excerpt: string;
  image: string;
  banner?: string | null;
  category: string;
  categoryColor: string;
  author: string;
  date: string;
  readTime: string;
  featured?: boolean;
  slug?: string;
}

const PostCard: React.FC<PostCardProps> = ({
  id,
  title,
  excerpt,
  image,
  banner,
  category,
  categoryColor,
  author,
  date,
  readTime,
  featured = false,
  slug
}) => {
  const linkPath = slug ? `/post/${slug}` : `/post/${id}`;
  const safeExcerpt = excerpt?.trim() || 'Leia a análise completa desta matéria no Vision7.';
  const categoryTextColor = categoryColor.startsWith('bg-') ? categoryColor.replace('bg-', 'text-') : categoryColor;

  const imageUrl = image.startsWith('http') ? image : null;
  const bannerUrl = banner || null;
  const heroImage = bannerUrl || imageUrl;

  if (featured) {
    return (
      <article className="group relative overflow-hidden rounded-2xl border border-border/50 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
        <div className="relative min-h-[320px] sm:min-h-[360px] lg:min-h-[400px]">
          {heroImage ? (
            <img
              src={heroImage}
              alt={title}
              width={960}
              height={540}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="eager"
              fetchPriority="high"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/10" />

          <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                <span className={`h-1.5 w-1.5 rounded-full ${categoryColor}`} />
                {category}
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                Destaque
              </span>
            </div>

            <div>
              <Link to={linkPath}>
                <h2 className="mb-2 font-editorial text-xl font-bold leading-tight text-white transition-colors hover:text-primary-300 sm:text-2xl lg:text-3xl">
                  {title}
                </h2>
              </Link>
              <p className="mb-4 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{safeExcerpt}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <span>{author}</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span>{date}</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span>{readTime}</span>
                </div>
                <Link to={linkPath} className="flex items-center gap-1.5 text-sm font-semibold text-primary-300 transition-colors hover:text-primary-200">
                  Ler artigo <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={title}
            width={640}
            height={360}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            width={640}
            height={360}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${categoryColor}`} />
            <span className={`truncate text-[11px] font-bold uppercase tracking-wider ${categoryTextColor}`}>{category}</span>
          </div>
          <Link to={linkPath}>
            <h2 className="mb-2 line-clamp-2 font-editorial text-[clamp(0.9375rem,2.4vw,1.125rem)] font-bold leading-snug text-card-foreground transition-colors group-hover:text-primary">
              {title}
            </h2>
          </Link>
          <p className="mb-3 line-clamp-2 hidden text-[13px] leading-relaxed text-muted-foreground sm:block">{safeExcerpt}</p>
        </div>
        <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{author}</span>
          <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="shrink-0">{date}</span>
          <span className="hidden h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/50 xs:inline-block" />
          <span className="hidden shrink-0 xs:inline">{readTime}</span>
          <Link to={linkPath} className="ml-auto shrink-0 whitespace-nowrap font-semibold text-primary hover:underline">
            Ler →
          </Link>
        </div>
      </div>
    </article>
  );
};

export default React.memo(PostCard);
