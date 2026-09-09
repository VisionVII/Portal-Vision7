import React, { useMemo, useState } from 'react';
import { Image, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MEDIA_SOURCES, useGalleryImages } from '@/hooks/useMediaGallery';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

const MediaPickerDialog: React.FC<MediaPickerDialogProps> = ({ open, onOpenChange, onSelect }) => {
  const { data: images = [], isLoading } = useGalleryImages();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return images;
    return images.filter((img) => img.name.toLowerCase().includes(q));
  }, [images, query]);

  const handlePick = (url: string) => {
    onSelect(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden rounded-2xl p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
          <DialogTitle className="text-base">Escolher da Galeria</DialogTitle>
          <DialogDescription className="sr-only">
            Selecione uma imagem da galeria para utilizar no conteúdo.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-5 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar imagens…"
              className="h-auto border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <div className="rounded-2xl bg-muted/40 p-4 dark:bg-muted/20">
                <Image className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground/70">
                {images.length === 0 ? 'Galeria vazia' : 'Nenhuma imagem encontrada'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {images.length === 0 ? 'Faça upload em Media > Galeria' : 'Tente outra pesquisa'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {filtered.map((img) => {
                const sourceMeta = MEDIA_SOURCES.find((s) => s.id === img.source);
                return (
                  <button
                    key={img.key}
                    type="button"
                    onClick={() => handlePick(img.url)}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border/30 bg-muted/20 transition-all hover:border-primary hover:shadow-md"
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    {sourceMeta && (
                      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sourceMeta.dot}`} />
                        {sourceMeta.shortLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPickerDialog;
