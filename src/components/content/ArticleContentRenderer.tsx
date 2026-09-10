import React, { useMemo } from 'react';
import { processArticleToc, sanitizeRichContent } from '@/lib/richContent';
import { cn } from '@/lib/utils';

export type ArticleContentRendererVariant = 'article' | 'preview' | 'compact' | 'card';

interface ArticleContentRendererProps {
  html: string;
  variant?: ArticleContentRendererVariant;
  processToc?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  contentRef?: React.Ref<HTMLDivElement>;
}

const BASE_CLASSES = [
  'prose max-w-none break-words text-foreground dark:prose-invert',
  '[&_img]:max-w-full [&_img]:h-auto',
  '[&_pre]:max-w-full [&_pre]:overflow-x-auto',
  '[&_.table-scroll]:max-w-full [&_.table-scroll]:overflow-x-auto [&_.table-scroll]:pb-1',
  '[&_.table-scroll]:-mx-4 [&_.table-scroll]:px-4 sm:[&_.table-scroll]:mx-0 sm:[&_.table-scroll]:px-0',
  '[&_table]:min-w-[300px] [&_table]:border-collapse',
  '[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left',
  '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2',
  '[&_figure]:my-8 [&_figcaption]:mt-2 [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground',
  '[&_.internal-link-pending]:cursor-default [&_.internal-link-pending]:border-b [&_.internal-link-pending]:border-dashed [&_.internal-link-pending]:border-muted-foreground/50 [&_.internal-link-pending]:text-muted-foreground [&_.internal-link-pending]:no-underline',
  '[&_nav]:not-prose [&_.toc-block_a]:no-underline [&_.toc-block_a]:font-normal [&_.toc-block_li]:my-0 [&_.toc-block_ul]:my-0',
].join(' ');

const VARIANT_CLASSES: Record<ArticleContentRendererVariant, string> = {
  article: [
    'prose-base text-foreground dark:text-gray-300 sm:prose-lg',
    '[&_h1:first-child]:mt-0 [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold sm:[&_h1]:text-3xl md:[&_h1]:text-4xl',
    '[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold sm:[&_h2]:text-2xl md:[&_h2]:text-3xl',
    '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold sm:[&_h3]:text-2xl',
    '[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold',
    '[&_p]:my-4 [&_p]:leading-8 [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1 [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/35 [&_blockquote]:pl-4 [&_blockquote]:italic',
    '[&_img]:my-6 [&_img]:w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-border [&_img]:shadow-lg [&_hr]:my-8',
    '[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary/80',
    '[&_code]:rounded-md [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-neutral-800 dark:[&_code]:bg-neutral-800 dark:[&_code]:text-neutral-200',
    '[&_pre]:rounded-2xl [&_pre]:bg-neutral-950 [&_pre]:p-4 [&_pre]:text-neutral-100 dark:[&_pre]:bg-white dark:[&_pre]:text-neutral-900 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  ].join(' '),
  preview: 'prose-lg text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl prose-img:shadow-lg',
  compact: 'prose-sm text-foreground prose-headings:text-foreground prose-p:text-muted-foreground',
  card: 'prose-sm text-foreground prose-headings:text-foreground prose-p:text-muted-foreground line-clamp-3 [&>*]:line-clamp-3',
};

/** Shared safe renderer for article content in previews, the public article page and cards. */
export const ArticleContentRenderer = React.forwardRef<HTMLDivElement, ArticleContentRendererProps>(
  ({ html, variant = 'article', processToc = variant === 'article' || variant === 'preview', className, onClick, contentRef }, ref) => {
    const renderedHtml = useMemo(() => {
      const sanitized = sanitizeRichContent(html);
      return processToc ? processArticleToc(sanitized) : sanitized;
    }, [html, processToc]);

    return (
      <div
        ref={contentRef ?? ref}
        onClick={onClick}
        className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  },
);

ArticleContentRenderer.displayName = 'ArticleContentRenderer';
