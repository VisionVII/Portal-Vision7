import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Download, Calendar, User, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface PodcastCardProps {
  podcast: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    duration: number | null;
    status: string;
    published_at: string | null;
    created_at: string;
    views: number;
    downloads: number;
    categories?: {
      name: string;
      color: string;
    } | null;
  };
  showStats?: boolean;
  compact?: boolean;
}

const PodcastCard: React.FC<PodcastCardProps> = ({
  podcast,
  showStats = true,
  compact = false
}) => {
  const formattedDate = new Date(podcast.published_at || podcast.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (compact) {
    return (
      <Link to={`/podcast/${podcast.slug}`}>
        <Card className="hover:shadow-md transition-shadow group">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Play className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {podcast.title}
                </h3>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatDuration(podcast.duration || 0)}</span>
                  <span>•</span>
                  <span>{formattedDate}</span>
                </div>

                {podcast.categories && (
                  <Badge
                    variant="secondary"
                    className="mt-2 text-xs"
                    style={{ backgroundColor: `${podcast.categories.color}20`, color: podcast.categories.color }}
                  >
                    {podcast.categories.name}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/podcast/${podcast.slug}`}>
      <Card className="hover:shadow-lg transition-all group overflow-hidden">
        <CardContent className="p-0">
          {/* Header with play button */}
          <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {podcast.categories && (
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: `${podcast.categories.color}20`, color: podcast.categories.color }}
                    >
                      {podcast.categories.name}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Podcast
                  </span>
                </div>

                <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                  {podcast.title}
                </h3>

                {podcast.description && (
                  <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                    {podcast.description}
                  </p>
                )}
              </div>

              <Button
                size="lg"
                className="rounded-full h-12 w-12 flex-shrink-0 ml-4"
                onClick={(e) => {
                  e.preventDefault();
                  // Navigate to podcast page
                  window.location.href = `/podcast/${podcast.slug}`;
                }}
              >
                <Play className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Footer with metadata */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(podcast.duration || 0)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formattedDate}</span>
                </div>
              </div>

              {showStats && (
                <div className="flex items-center gap-3">
                  <span className="text-xs">
                    {podcast.views.toLocaleString()} plays
                  </span>
                  <span className="text-xs">
                    {podcast.downloads.toLocaleString()} downloads
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PodcastCard;