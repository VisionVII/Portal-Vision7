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

  const imageUrl = image.startsWith('http') 
    ? image 
    : image 
      ? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`
      : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';

  if (featured) {
    return (
      <article className="blog-card group">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative h-56 sm:h-64 lg:h-80 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className={`category-badge ${categoryColor}`}>{category}</span>
            </div>
          </div>
          <div className="p-6 lg:p-8 flex flex-col justify-between">
            <div>
              <Link to={linkPath}>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-headline font-bold text-card-foreground hover:text-primary transition-colors mb-3 leading-tight">
                  {title}
                </h2>
              </Link>
              <p className="text-muted-foreground mb-4 line-clamp-3 text-sm sm:text-base">{excerpt}</p>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><User size={14} /><span>{author}</span></div>
                <div className="flex items-center gap-1.5"><Calendar size={14} /><span>{date}</span></div>
              </div>
              <div className="flex items-center gap-1.5 text-primary font-medium">
                <Clock size={14} /><span>{readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="blog-card group h-full flex flex-col">
      <div className="relative h-44 sm:h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`category-badge ${categoryColor}`}>{category}</span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex-1">
          <Link to={linkPath}>
            <h2 className="font-headline font-bold text-card-foreground hover:text-primary transition-colors mb-2 text-lg leading-snug line-clamp-2">
              {title}
            </h2>
          </Link>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{excerpt}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><User size={12} />{author}</span>
            <span className="flex items-center gap-1"><Calendar size={12} />{date}</span>
          </div>
          <span className="text-primary font-medium flex items-center gap-1"><Clock size={12} />{readTime}</span>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
