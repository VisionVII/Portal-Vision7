import { ArrowUpRight, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { CuratedPost } from '@/hooks/useCuratedPosts';

interface Category {
  id: string;
  name: string;
}

interface PromoteCategoriesDialogProps {
  open: boolean;
  postToPromote: CuratedPost | null;
  categories: Category[] | undefined;
  selectedCategoryIds: string[];
  isPromotePending: boolean;
  onToggleCategory: (catId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PromoteCategoriesDialog({
  open,
  postToPromote,
  categories,
  selectedCategoryIds,
  isPromotePending,
  onToggleCategory,
  onConfirm,
  onCancel,
}: PromoteCategoriesDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Promover Artigo
          </DialogTitle>
          <DialogDescription>
            Selecione as categorias para o artigo antes de promovê-lo para rascunho editorial.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">Categorias</p>
          {categories?.length ? (
            <div className="space-y-2">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedCategoryIds.includes(cat.id)}
                    onCheckedChange={() => onToggleCategory(cat.id)}
                  />
                  <span className="text-sm">{cat.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma categoria disponível.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            disabled={isPromotePending || !postToPromote}
            onClick={onConfirm}
          >
            <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
            {selectedCategoryIds.length > 0
              ? `Promover (${selectedCategoryIds.length} cat.)`
              : 'Promover sem categoria'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
