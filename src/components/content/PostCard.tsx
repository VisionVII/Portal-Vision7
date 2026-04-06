import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Clock } from 'lucide-react';

interface PostCardProps {
  id: string | number;
  title: string;
  excerpt: string;
  image: string;
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

  const imageUrl = image.startsWith('http') 
    ? image 
    : image 
      ? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`
      : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';

  if (featured) {
    return (
      <article className="blog-card group overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative aspect-[16/9] overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[280px]">
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
            <div className="absolute left-4 top-4">
              <span className={`category-badge ${categoryColor}`}>{category}</span>
            </div>
          </div>
          <div className="flex flex-col justify-between p-5 sm:p-6 lg:p-7">
            <div>
              <Link to={linkPath}>
                <h2 className="mb-2 text-lg font-headline font-bold leading-tight text-card-foreground transition-colors hover:text-primary sm:text-xl lg:text-2xl">
                  {title}
                </h2>
              </Link>
              <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">{safeExcerpt}</p>
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Ler destaque completo
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5"><User size={14} /><span>{author}</span></div>
                <div className="flex items-center gap-1.5"><Calendar size={14} /><span>{date}</span></div>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-primary">
                <Clock size={14} /><span>{readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3">
          <span className={`category-badge ${categoryColor} !px-2 !py-0.5 !text-[10px]`}>{category}</span>
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
          <span className="ml-auto flex items-center gap-1 whitespace-nowrap font-medium text-primary"><Clock size={11} />{readTime}</span>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
