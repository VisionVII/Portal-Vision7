import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';

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
  const cardClass = featured 
    ? "blog-card col-span-full lg:col-span-2 lg:flex lg:h-80"
    : "blog-card h-full";

  // Use slug if provided, otherwise fall back to id
  const linkPath = slug ? `/post/${slug}` : `/post/${id}`;

  // Handle image URL - if it's a full URL use it, otherwise assume Unsplash format
  const imageUrl = image.startsWith('http') 
    ? image 
    : image 
      ? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`
      : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';

  return (
    <article className={cardClass}>
      <div className={`relative ${featured ? 'lg:w-1/2' : 'h-48'} overflow-hidden`}>
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <span className={`category-badge ${categoryColor}`}>
            {category}
          </span>
        </div>
      </div>
      
      <div className={`p-6 ${featured ? 'lg:w-1/2 flex flex-col justify-between' : ''}`}>
        <div>
          <Link to={linkPath}>
            <h2 className={`font-headline font-bold text-gray-900 hover:text-portugal-green transition-colors mb-3 ${
              featured ? 'text-2xl lg:text-3xl' : 'text-xl'
            }`}>
              {title}
            </h2>
          </Link>
          
          <p className="text-gray-600 mb-4 line-clamp-3">
            {excerpt}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User size={16} />
              <span>{author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{date}</span>
            </div>
          </div>
          <span className="text-portugal-green font-medium">{readTime}</span>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
