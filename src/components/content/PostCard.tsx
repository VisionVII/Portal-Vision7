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
      <article className="blog-card group overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[320px]">
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
          <div className="flex flex-col justify-between p-6 lg:p-8">
            <div>
              <Link to={linkPath}>
                <h2 className="mb-3 text-xl font-headline font-bold leading-tight text-card-foreground transition-colors hover:text-primary sm:text-2xl lg:text-3xl">
                  {title}
                </h2>
              </Link>
              <p className="mb-4 line-clamp-3 text-sm leading-6 text-muted-foreground sm:text-base">{safeExcerpt}</p>
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Ler destaque completo
              </span>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
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
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5 hover:ring-1 hover:ring-primary/10">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute left-3 top-3">
          <span className={`category-badge ${categoryColor}`}>{category}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <Link to={linkPath}>
            <h2 className="mb-2 line-clamp-2 text-lg font-headline font-bold leading-snug text-card-foreground transition-colors hover:text-primary">
              {title}
            </h2>
          </Link>
          <p className="mb-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{safeExcerpt}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="flex items-center gap-1"><User size={12} />{author}</span>
            <span className="flex items-center gap-1"><Calendar size={12} />{date}</span>
          </div>
          <span className="flex items-center gap-1 whitespace-nowrap font-medium text-primary"><Clock size={12} />{readTime}</span>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
