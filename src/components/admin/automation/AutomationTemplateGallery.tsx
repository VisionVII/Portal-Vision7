import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { CATEGORY_META } from '@/types/automation';
import type { AutomationTemplate, AutomationCategory } from '@/types/automation';

interface AutomationTemplateGalleryProps {
  templates: AutomationTemplate[];
  isLoading: boolean;
  onUseTemplate: (template: AutomationTemplate) => void;
  activeCategory: AutomationCategory | 'all';
}

export function AutomationTemplateGallery({
  templates,
  isLoading,
  onUseTemplate,
  activeCategory,
}: AutomationTemplateGalleryProps) {
  const filtered = activeCategory === 'all' ? templates : templates.filter((t) => t.category === activeCategory);

  if (isLoading || filtered.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary-400" />
        <h4 className="text-sm font-medium text-foreground">Templates rápidos</h4>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
        {filtered.map((tpl) => {
          const meta = CATEGORY_META[tpl.category];
          return (
            <Card
              key={tpl.id}
              className="bg-card border-border hover:border-border/80 hover:shadow-sm transition-all min-w-[220px] max-w-[260px] shrink-0 cursor-pointer"
              onClick={() => onUseTemplate(tpl)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-${meta.color}-500/30 text-${meta.color}-400`}>
                    {meta.label}
                  </Badge>
                  {tpl.isSystem && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary-500/30 text-primary-400">
                      Sistema
                    </Badge>
                  )}
                </div>
                <h5 className="text-sm font-medium text-foreground mb-1">{tpl.name}</h5>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{tpl.description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseTemplate(tpl);
                  }}
                >
                  Usar template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
