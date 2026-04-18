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
  title: _title,
  subtitle: _subtitle,
  icon: _icon,
  action: _action,
  children,
  id,
  className,
  contentClassName,
}) => (
  <section id={id} className={cn(className)}>
    <div className={contentClassName}>{children}</div>
  </section>
);
