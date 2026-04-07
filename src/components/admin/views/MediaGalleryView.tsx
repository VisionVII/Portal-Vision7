import React, { useCallback, useRef, useState } from 'react';
import { Check, Copy, Image, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BUCKET = 'post-images';
const FOLDER = 'gallery';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface GalleryImage {
  name: string;
  url: string;
  created_at: string;
}

const MediaGalleryView: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // List all images in the gallery folder
  const { data: images = [], isLoading } = useQuery<GalleryImage[]>({
    queryKey: ['media-gallery'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      return (data || [])
        .filter((f) => !f.name.startsWith('.'))
        .map((f) => {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${f.name}`);
          return {
            name: f.name,
            url: urlData.publicUrl,
            created_at: f.created_at || '',
          };
        });
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results: string[] = [];
      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`Tipo não suportado: ${file.type}`);
        }
        if (file.size > MAX_SIZE) {
          throw new Error(`Ficheiro muito grande: ${file.name} (máx 5MB)`);
        }
        const ext = file.name.split('.').pop() || 'jpg';
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(`${FOLDER}/${name}`, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (error) throw error;
        results.push(name);
      }
      return results;
    },
    onSuccess: (names) => {
      queryClient.invalidateQueries({ queryKey: ['media-gallery'] });
      toast({ title: 'Upload concluído', description: `${names.length} imagem(ns) adicionada(s)` });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([`${FOLDER}/${name}`]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-gallery'] });
      setDeleteConfirm(null);
      toast({ title: 'Imagem eliminada' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao eliminar', description: err.message, variant: 'destructive' });
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      uploadMutation.mutate(Array.from(files));
      e.target.value = '';
    },
    [uploadMutation],
  );

  const handleCopy = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }, []);

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <Card className="border-border/30 border-dashed dark:border-border/20">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/20">
            <Upload className="h-8 w-8 text-primary-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Carregar imagens</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP ou GIF — máx. 5 MB cada</p>
          </div>
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="gap-2 rounded-xl"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Selecionar ficheiros
          </Button>
          <Input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Gallery grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <div className="rounded-2xl bg-muted/40 p-5 dark:bg-muted/20">
            <Image className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/70">Galeria vazia</p>
          <p className="mt-1 text-xs text-muted-foreground">Faça upload de imagens para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {images.map((img) => (
            <div
              key={img.name}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/30 bg-muted/20 transition-all duration-200 hover:shadow-md dark:border-border/20"
            >
              <img
                src={img.url}
                alt={img.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="flex w-full items-center gap-1.5 p-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 flex-1 gap-1 rounded-lg text-xs"
                    onClick={() => handleCopy(img.url)}
                  >
                    {copiedUrl === img.url ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copiedUrl === img.url ? 'Copiado' : 'URL'}
                  </Button>
                  {deleteConfirm === img.name ? (
                    <div className="flex gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 rounded-lg p-0"
                        onClick={() => deleteMutation.mutate(img.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 rounded-lg p-0"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 rounded-lg p-0"
                      onClick={() => setDeleteConfirm(img.name)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {images.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">{images.length} imagem(ns) na galeria</p>
      )}
    </div>
  );
};

export default MediaGalleryView;
