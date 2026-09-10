import React from 'react';
import { ArticleContentRenderer } from '@/components/content/ArticleContentRenderer';

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
  const rendererVariant = variant === 'full' ? 'preview' : variant;
  return <ArticleContentRenderer html={html} variant={rendererVariant} className={className} />;
}
