import React, { useMemo } from 'react';
import { sanitizeRichContent } from '@/lib/richContent';

interface RichContentPreviewProps {
  html: string;
  variant?: 'compact' | 'full' | 'card';
  className?: string;
}

/**
 * Componente para renderizar preview seguro de rich content HTML
 * com estilos consistentes aos templates de posts
 */
export function RichContentPreview({ html, variant = 'full', className = '' }: RichContentPreviewProps) {
  const sanitizedHtml = useMemo(() => sanitizeRichContent(html), [html]);

  const variantClasses = {
    // Preview completo (dialog/modal)
    full: 'prose prose-lg max-w-none text-foreground dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl prose-img:shadow-lg',
    
    // Preview compacto (sidebar/aside) 
    compact: 'prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground',
    
    // Preview em card (lista/grid) com line-clamp
    card: 'prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground line-clamp-3 [&>*]:line-clamp-3',
  };

  return (
    <div 
      className={`${variantClasses[variant]} ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
