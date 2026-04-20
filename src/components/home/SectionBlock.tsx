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
  <section id={id} className={cn('space-y-4', className)}>
    {/* Section header */}
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </span>
          )}
          <h2 className="section-title !mb-0 after:hidden">{title}</h2>
        </div>
        {subtitle && (
          <p className="ml-9 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {/* Accent underline */}
        <span
          className="mt-1.5 block h-[2px] w-14 rounded-full bg-gradient-to-r from-primary-500 via-secondary-500/60 to-transparent"
          aria-hidden="true"
        />
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>

    {/* Section content */}
    <div className={contentClassName}>{children}</div>
  </section>
);
