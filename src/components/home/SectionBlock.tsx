import React from 'react';
import { cn } from '@/lib/utils';

interface SectionBlockProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
  contentClassName?: string;
}

export const SectionBlock: React.FC<SectionBlockProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  id,
  className,
  contentClassName,
}) => (
  <section id={id} className={cn('space-y-6', className)}>
    {/* Header row */}
    <div className="flex items-end justify-between gap-4 border-b border-border/50 pb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
            {icon}
          </span>
        )}
        <div>
          <h2 className="font-headline text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0 pb-0.5">{action}</div>}
    </div>

    <div className={contentClassName}>{children}</div>
  </section>
);
