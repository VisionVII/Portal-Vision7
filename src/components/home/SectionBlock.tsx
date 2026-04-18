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
  <section id={id} className={cn('space-y-5', className)}>
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-xl font-headline font-bold leading-tight text-foreground sm:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className={contentClassName}>{children}</div>
  </section>
);
