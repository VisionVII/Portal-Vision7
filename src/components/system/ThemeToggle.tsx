import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

const ThemeToggle = ({ className, compact = false }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full bg-muted/50 p-1 text-foreground',
        compact ? 'gap-1' : 'gap-1.5 p-1.5',
        className
      )}
      aria-label="Alternar tema"
    >
      {[
        { value: 'light' as const, label: 'Claro' },
        { value: 'dark' as const, label: 'Escuro' },
      ].map((option) => {
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
              compact && 'px-2.5 py-1 text-[11px] sm:text-xs',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;