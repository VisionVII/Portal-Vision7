import { Star } from 'lucide-react';

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-primary' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive';
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Star className="w-3 h-3" />
      {score.toFixed(0)}
    </span>
  );
}
