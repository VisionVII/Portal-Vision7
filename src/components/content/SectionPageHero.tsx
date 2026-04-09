import React from 'react';
import { cn } from '@/lib/utils';

interface SectionPageHeroMedia {
  desktopUrl?: string;
  mobileUrl?: string;
  alt: string;
}

interface SectionPageHeroProps {
  title: string;
  description: string;
  badge?: string;
  metaSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  media?: SectionPageHeroMedia | null;
  align?: 'left' | 'center';
  fallbackClassName?: string;
  overlayClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

const SectionPageHero: React.FC<SectionPageHeroProps> = ({
  title,
  description,
  badge,
  metaSlot,
  actionsSlot,
  media,
  align = 'left',
  fallbackClassName,
  overlayClassName,
  contentClassName,
  titleClassName,
  descriptionClassName,
}) => {
  const desktopUrl = media?.desktopUrl || media?.mobileUrl || '';
  const mobileUrl = media?.mobileUrl || media?.desktopUrl || desktopUrl;
  const hasMedia = Boolean(desktopUrl || mobileUrl);
  const hasTitle = Boolean(title.trim());
  const hasDescription = Boolean(description.trim());

  return (
    <section
      className={cn(
        'relative overflow-hidden text-white',
        hasMedia ? 'bg-slate-950' : fallbackClassName || 'bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800',
      )}
    >
      {hasMedia ? (
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(max-width: 767px)" srcSet={mobileUrl} />
          <img
            src={desktopUrl}
            alt={media?.alt || title}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </picture>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_24%)] opacity-80" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px]" />
        </>
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.52)_40%,rgba(2,6,23,0.94)_100%)]" />
      <div
        className={cn(
          'absolute inset-0 bg-[linear-gradient(118deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.36)_44%,rgba(2,6,23,0.84)_100%)]',
          overlayClassName,
        )}
      />
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:26px_26px]" />

      <div className="container relative mx-auto px-4">
        <div
          className={cn(
            'flex min-h-[calc(100svh-8rem)] py-8 sm:min-h-[calc(100svh-7.5rem)] sm:py-10 lg:min-h-[calc(100svh-7rem)] lg:py-14',
            align === 'center' ? 'items-end justify-center md:items-center' : 'items-end justify-start',
          )}
        >
          <div
            className={cn(
              'w-full space-y-4',
              align === 'center' ? 'mx-auto max-w-4xl text-center' : 'max-w-3xl text-left',
              contentClassName,
            )}
          >
            {badge ? (
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-sm">
                {badge}
              </span>
            ) : null}

            {metaSlot}

            {hasTitle || hasDescription ? (
              <div className="space-y-3">
                {hasTitle ? (
                  <h1
                    className={cn(
                      'text-balance text-4xl font-headline font-bold leading-tight text-white sm:text-5xl lg:text-6xl',
                      titleClassName,
                    )}
                  >
                    {title}
                  </h1>
                ) : null}
                {hasDescription ? (
                  <p
                    className={cn(
                      'max-w-3xl text-sm leading-relaxed text-white/78 sm:text-base lg:text-lg',
                      align === 'center' ? 'mx-auto' : '',
                      descriptionClassName,
                    )}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
            ) : null}

            {actionsSlot}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionPageHero;