import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function SectionIcon({
  icon: Icon,
  className = '',
}: {
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${className}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function Section({
  title,
  description,
  icon,
  children,
  actions,
  collapsible = false,
  defaultExpanded = true,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 ${
          collapsible ? 'cursor-pointer select-none transition-colors hover:bg-muted/30' : ''
        }`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {collapsible && (
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-border/40 px-4 py-4 sm:px-5">{children}</div>
      )}
    </section>
  );
}
