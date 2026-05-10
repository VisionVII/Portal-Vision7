import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Clock, ArrowRight } from 'lucide-react';

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

  const imageUrl = image.startsWith('http') ? image : null;
  const bannerUrl = banner || null;
  const heroImage = bannerUrl || imageUrl;

  if (featured) {
    return (
      <article className="blog-card group relative overflow-hidden rounded-2xl border border-border/60 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10">
        <div className="relative min-h-[320px] sm:min-h-[360px] lg:min-h-[400px]">
          {heroImage ? (
            <img
              src={heroImage}
              alt={title}
              width={960}
              height={540}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="eager"
              fetchpriority="high"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />

          <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
            <div className="flex items-start justify-between">
              <span className={`category-badge ${categoryColor}`}>{category}</span>
              <span className="rounded-full bg-primary/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Destaque
              </span>
            </div>

            <div>
              <Link to={linkPath}>
                <h2 className="mb-2 text-xl font-headline font-bold leading-tight text-white transition-colors hover:text-primary-300 sm:text-2xl lg:text-3xl">
                  {title}
                </h2>
              </Link>
              <p className="mb-4 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{safeExcerpt}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-3">
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                  <div className="flex items-center gap-1.5"><User size={14} /><span>{author}</span></div>
                  <div className="flex items-center gap-1.5"><Calendar size={14} /><span>{date}</span></div>
                  <div className="flex items-center gap-1.5"><Clock size={14} /><span>{readTime}</span></div>
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-[16/9] overflow-hidden">
        {bannerUrl ? (
          <>
            <img
              src={bannerUrl}
              alt={title}
              width={640}
              height={360}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
          </>
        ) : imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={title}
              width={640}
              height={360}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3">
          <span className={`category-badge ${categoryColor} !px-2 !py-0.5 !text-[10px]`}>{category}</span>
        </div>
        <div className="absolute bottom-2.5 right-2.5">
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {readTime}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex-1">
          <Link to={linkPath}>
            <h2 className="mb-1.5 line-clamp-2 text-[clamp(0.8125rem,2.2vw,1.0625rem)] font-headline font-bold leading-snug text-card-foreground transition-colors hover:text-primary">
              {title}
            </h2>
          </Link>
          <p className="mb-2 line-clamp-2 hidden text-[13px] leading-relaxed text-muted-foreground sm:block">{safeExcerpt}</p>
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 truncate"><User size={11} />{author}</span>
          <span className="hidden items-center gap-1 sm:flex"><Calendar size={11} />{date}</span>
          <Link to={linkPath} className="ml-auto flex items-center gap-1 whitespace-nowrap font-medium text-primary hover:underline">
            Ler <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default React.memo(PostCard);
