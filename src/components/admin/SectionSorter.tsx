import React from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type SectionId, type HomeSection } from '@/lib/homepage-config';

const sectionPreviewDescription: Record<SectionId, string> = {
  featured: 'Bloco editorial com a principal matéria e destaque visual.',
  latest: 'Grelha com as notícias mais recentes logo após o topo.',
  courses: 'Vitrine de cursos, parcerias e cartões de afiliados.',
  more: 'Feed expandido com conteúdo complementar e scroll contínuo.',
  newsletter: 'Call-to-action final para conversão e CRM.',
};

interface SectionSorterProps {
  sections: HomeSection[];
  draggedSectionId: SectionId | null;
  dragOverSectionId: SectionId | null;
  onDragStart: (id: SectionId) => void;
  onDragOver: (id: SectionId) => void;
  onDrop: (targetId: SectionId) => void;
  onDragEnd: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onUpdateSection: (index: number, patch: Partial<HomeSection>) => void;
}

const SectionSorter = ({
  sections,
  draggedSectionId,
  dragOverSectionId,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMove,
  onUpdateSection,
}: SectionSorterProps) => {
  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div
          key={section.id}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            onDragStart(section.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (draggedSectionId && draggedSectionId !== section.id) {
              onDragOver(section.id);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedSectionId && draggedSectionId !== section.id) {
              onDrop(section.id);
            }
          }}
          onDragEnd={onDragEnd}
          className={`rounded-xl border bg-muted/30 p-3 transition-all ${
            dragOverSectionId === section.id
              ? 'border-primary-400 bg-primary-50/60 dark:border-primary-700 dark:bg-primary-900/20'
              : 'border-border'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex cursor-grab rounded-lg border border-border bg-background p-2 text-muted-foreground shadow-sm">
                <GripVertical className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-foreground">{index + 1}. {section.label}</p>
                <p className="text-xs text-muted-foreground">{sectionPreviewDescription[section.id]}</p>
              </div>
            </div>
            <Switch
              checked={section.enabled}
              onCheckedChange={(checked) => onUpdateSection(index, { enabled: checked })}
            />
          </div>

          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label
                htmlFor={`section-label-${section.id}`}
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Título público da secção
              </Label>
              <Input
                id={`section-label-${section.id}`}
                value={section.label}
                onChange={(event) => onUpdateSection(index, { label: event.target.value })}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">Arraste o card para mudar a ordem real do layout.</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMove(index, 1)}
                  disabled={index === sections.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SectionSorter;
