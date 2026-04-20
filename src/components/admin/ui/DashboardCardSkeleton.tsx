import { motion } from 'framer-motion';

interface DashboardCardSkeletonProps {
  /**
   * Card height variant
   * - sm: 160px (compact stats, metrics)
   * - md: 240px (default cards)
   * - lg: 360px (detailed content cards)
   * - xl: 480px (full-featured sections)
   */
  height?: 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Show header with icon and title skeleton
   */
  showHeader?: boolean;
  
  /**
   * Number of content lines to show
   */
  contentLines?: number;
  
  /**
   * Show footer with button skeleton
   */
  showFooter?: boolean;
}

export const DashboardCardSkeleton = ({
  height = 'md',
  showHeader = true,
  contentLines = 3,
  showFooter = false,
}: DashboardCardSkeletonProps) => {
  const heightClasses = {
    sm: 'h-40',
    md: 'h-60',
    lg: 'h-[360px]',
    xl: 'h-[480px]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm ${heightClasses[height]}`}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
      
      <div className="relative h-full p-6 flex flex-col">
        {/* Header */}
        {showHeader && (
          <div className="flex items-start gap-3 mb-6">
            {/* Icon skeleton */}
            <div className="shrink-0 w-10 h-10 rounded-xl bg-muted animate-pulse" />
            
            <div className="flex-1 space-y-2">
              {/* Title skeleton */}
              <div className="h-5 w-3/4 rounded-lg bg-muted animate-pulse" />
              
              {/* Subtitle skeleton */}
              <div className="h-3 w-1/2 rounded-lg bg-muted/70 animate-pulse" />
            </div>
          </div>
        )}
        
        {/* Content lines */}
        <div className="flex-1 space-y-3">
          {Array.from({ length: contentLines }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded-lg bg-muted/70 animate-pulse"
              style={{
                width: `${Math.random() * 30 + 60}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
        
        {/* Footer */}
        {showFooter && (
          <div className="mt-6 flex gap-2">
            <div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 w-20 rounded-xl bg-muted/70 animate-pulse" />
          </div>
        )}
      </div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </motion.div>
  );
};

/**
 * Grid of skeleton cards for loading states
 */
interface DashboardSkeletonGridProps {
  /**
   * Number of skeleton cards to show
   */
  count?: number;
  
  /**
   * Grid columns (responsive)
   * - 1: single column
   * - 2: 2 columns on md+
   * - 3: 3 columns on xl+
   */
  columns?: 1 | 2 | 3;
  
  /**
   * Props to pass to each skeleton card
   */
  cardProps?: Omit<DashboardCardSkeletonProps, 'key'>;
}

export const DashboardSkeletonGrid = ({
  count = 3,
  columns = 2,
  cardProps,
}: DashboardSkeletonGridProps) => {
  const gridClasses = {
    1: 'grid grid-cols-1 gap-6',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    3: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6',
  };

  return (
    <div className={gridClasses[columns]}>
      {Array.from({ length: count }).map((_, i) => (
        <DashboardCardSkeleton key={i} {...cardProps} />
      ))}
    </div>
  );
};
