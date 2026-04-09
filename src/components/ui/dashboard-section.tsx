import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  actions?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'gradient' | 'bordered' | 'minimal';
}

export function DashboardSection({
  title,
  description,
  icon,
  badge,
  children,
  defaultExpanded = true,
  collapsible = false,
  actions,
  className,
  headerClassName,
  contentClassName,
  variant = 'default',
}: DashboardSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const variantStyles = {
    default: 'bg-card border-border',
    gradient: 'bg-gradient-to-br from-card via-card to-card/50 border-primary-500/20',
    bordered: 'bg-card border-primary-500/30 shadow-lg shadow-primary-500/5',
    minimal: 'bg-transparent border-transparent',
  };

  const headerVariants = {
    default: 'border-b border-border',
    gradient: 'border-b border-primary-500/10 bg-gradient-to-r from-primary-500/5 to-transparent',
    bordered: 'border-b border-primary-500/20',
    minimal: 'border-b border-border/50',
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300',
        variantStyles[variant],
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-6 py-4 flex items-center justify-between',
          headerVariants[variant],
          headerClassName,
          collapsible && 'cursor-pointer select-none'
        )}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">
                {title}
              </h3>
              {badge}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
          {collapsible && (
            <button
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className={cn('px-6 py-6', contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}

interface SectionIconProps {
  icon: React.ElementType;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SectionIcon({
  icon: Icon,
  variant = 'primary',
  size = 'md',
  className,
}: SectionIconProps) {
  const variantStyles = {
    primary: 'bg-gradient-to-br from-primary-500 to-primary-600',
    secondary: 'bg-gradient-to-br from-secondary-500 to-secondary-600',
    accent: 'bg-gradient-to-br from-accent-500 to-accent-600',
    success: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    warning: 'bg-gradient-to-br from-amber-500 to-amber-600',
    error: 'bg-gradient-to-br from-red-500 to-red-600',
  };

  const sizeStyles = {
    sm: 'p-2 rounded-lg',
    md: 'p-2.5 rounded-xl',
    lg: 'p-3 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={cn(variantStyles[variant], sizeStyles[size], className)}>
      <Icon className={cn(iconSizes[size], 'text-white')} />
    </div>
  );
}
