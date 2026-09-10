import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Image, Loader2, Lock, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MEDIA_BUCKET, MEDIA_SOURCES, useGalleryImages, type GalleryImage, type MediaSource } from '@/hooks/useMediaGallery';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const UPLOAD_FOLDER = 'gallery';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Heróis fixos de páginas públicas (PrivacyPolicy.tsx, Course.tsx, CategoryPage.tsx) —
// não vivem em nenhuma tabela, por isso não há forma de saber que estão "em uso"
// exceto por esta lista à mão. Eliminar um destes ficheiros parte essas páginas em produção.
const PROTECTED_GALLERY_FILENAMES = new Set([
  '1776256435058-nothbe.webp',
  '1776535407111-snex7r.webp',
  '1776535397143-4au28q.webp',
  '1776535403028-rffe3x.webp',
  '1776535392917-a6qrs3.webp',
  '1776535384442-995lep.webp',
]);

interface PostUse {
  id: string;
  title: string;
}

function isProtectedImage(img: GalleryImage): boolean {
  return img.source === 'gallery' && PROTECTED_GALLERY_FILENAMES.has(img.name);
}

function formatRelative(iso: string): string {
  if (!iso) return '';
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays <= 0) return 'hoje';
  if (diffDays === 1) return 'há 1 dia';
  if (diffDays < 7) return `há ${diffDays} dias`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 5) return weeks === 1 ? 'há 1 semana' : `há ${weeks} semanas`;
  const months = Math.floor(diffDays / 30);
  return months <= 1 ? 'há 1 mês' : `há ${months} meses`;
}

interface MediaTileProps {
  img: GalleryImage;
  sourceMeta: { label: string; shortLabel: string; dot: string };
  uses: PostUse[];
  protectedImage: boolean;
  selected: boolean;
  copied: boolean;
  onToggleSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const MediaTile: React.FC<MediaTileProps> = ({
  img,
  sourceMeta,
  uses,
  protectedImage,
  selected,
  copied,
  onToggleSelect,
  onCopy,
  onDelete,
}) => {
  const used = protectedImage || uses.length > 0;
  const usageLabel = protectedImage
    ? uses.length > 0
      ? `Usado · ${uses.length} post${uses.length > 1 ? 's' : ''} + página fixa`
      : 'Usado · página fixa'
    : uses.length > 0
      ? `Usado · ${uses.length} post${uses.length > 1 ? 's' : ''}`
      : 'Não utilizada';

  return (
    <div
      className={`group relative aspect-square overflow-hidden rounded-xl border bg-muted/20 transition-all duration-200 hover:shadow-md ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border/30 dark:border-border/20'
      }`}
    >
      <img
        src={img.url}
        alt={img.name}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 backdrop-blur-sm">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sourceMeta.dot}`} />
        <span className="text-[10px] font-semibold text-white">{sourceMeta.shortLabel}</span>
      </div>

      <div
        className={`absolute right-2 top-2 transition-opacity duration-150 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="border-white/70 bg-black/40 data-[state=checked]:bg-primary"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-7">
        <p className="truncate text-[11px] font-medium text-white">{img.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p className={`text-[10px] font-semibold ${used ? 'text-success' : 'text-warning'}`}>{usageLabel}</p>
          <span className="text-[10px] text-white/45">· {formatRelative(img.created_at)}</span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <Button variant="secondary" size="sm" className="h-7 flex-1 gap-1 rounded-lg text-[11px]" onClick={onCopy}>
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado' : 'URL'}
          </Button>
          {protectedImage ? (
            <Button
              variant="secondary"
              size="sm"
              disabled
              className="h-7 w-7 rounded-lg p-0"
              title="Imagem protegida — usada diretamente numa página do site"
            >
              <Lock className="h-3 w-3 text-muted-foreground" />
            </Button>
          ) : (
            <Button variant="secondary" size="sm" className="h-7 w-7 rounded-lg p-0" onClick={onDelete}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface MediaGalleryViewProps {
  searchQuery?: string;
}

const MediaGalleryView: React.FC<MediaGalleryViewProps> = ({ searchQuery = '' }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<MediaSource | 'all'>('all');
  const [onlyUnused, setOnlyUnused] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<GalleryImage[] | null>(null);

  const { data: images = [], isLoading, isError, error } = useGalleryImages();

  // posts.image_url / posts.banner_url guardam o URL público completo do Storage,
  // por isso comparar por igualdade de string chega para saber se uma imagem está em uso.
  const { data: usageIndex } = useQuery({
    queryKey: ['media-gallery-usage'],
    queryFn: async () => {
      const { data, error } = await supabase.from('posts').select('id, title, image_url, banner_url');
      if (error) throw error;
      const map = new Map<string, PostUse[]>();
      for (const post of data || []) {
        for (const url of [post.image_url, post.banner_url]) {
          if (!url) continue;
          const list = map.get(url) ?? [];
          list.push({ id: post.id, title: post.title });
          map.set(url, list);
        }
      }
      return map;
    },
  });

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: images.length };
    for (const s of MEDIA_SOURCES) counts[s.id] = 0;
    for (const img of images) counts[img.source] = (counts[img.source] ?? 0) + 1;
    return counts;
  }, [images]);

  const unusedCount = useMemo(() => {
    if (!usageIndex) return 0;
    return images.filter((img) => !isProtectedImage(img) && !usageIndex.get(img.url)?.length).length;
  }, [images, usageIndex]);

  const filteredImages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return images.filter((img) => {
      if (activeSource !== 'all' && img.source !== activeSource) return false;
      if (q && !img.name.toLowerCase().includes(q)) return false;
      if (onlyUnused) {
        const used = isProtectedImage(img) || (usageIndex?.get(img.url)?.length ?? 0) > 0;
        if (used) return false;
      }
      return true;
    });
  }, [images, activeSource, searchQuery, onlyUnused, usageIndex]);

  const selectedImages = useMemo(
    () => filteredImages.filter((img) => selected.has(img.key)),
    [filteredImages, selected],
  );

  // Upload continua a servir só a galeria manual — capas/banners vêm do editor de posts,
  // e as imagens de IA vêm do pipeline de automação.
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
        const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(`${UPLOAD_FOLDER}/${name}`, file, {
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

  const deleteMutation = useMutation({
    mutationFn: async (targets: GalleryImage[]) => {
      const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(targets.map((t) => t.key));
      if (error) throw error;
      return targets;
    },
    onSuccess: (targets) => {
      queryClient.invalidateQueries({ queryKey: ['media-gallery'] });
      setSelected((prev) => {
        const next = new Set(prev);
        targets.forEach((t) => next.delete(t.key));
        return next;
      });
      setDeleteTargets(null);
      toast({ title: targets.length > 1 ? `${targets.length} imagens eliminadas` : 'Imagem eliminada' });
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

  const handleCopy = useCallback((key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleBatchCopy = useCallback(() => {
    navigator.clipboard.writeText(selectedImages.map((img) => img.url).join('\n'));
    toast({ title: `${selectedImages.length} URLs copiados` });
  }, [selectedImages, toast]);

  const handleBatchDelete = useCallback(() => {
    const deletable = selectedImages.filter((img) => !isProtectedImage(img));
    const blocked = selectedImages.length - deletable.length;
    if (blocked > 0) {
      toast({
        title: 'Algumas imagens foram ignoradas',
        description: `${blocked} imagem(ns) protegida(s) — usada(s) diretamente numa página do site — não pode(m) ser eliminada(s) aqui.`,
      });
    }
    if (deletable.length) setDeleteTargets(deletable);
  }, [selectedImages, toast]);

  const deleteUsage = useMemo(() => {
    if (!deleteTargets) return null;
    const rows = deleteTargets.map((img) => ({ img, uses: usageIndex?.get(img.url) ?? [] }));
    return { rows, inUse: rows.filter((r) => r.uses.length > 0) };
  }, [deleteTargets, usageIndex]);

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <Card data-tour="media-upload" className="border-border/30 border-dashed dark:border-border/20">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/20">
            <Upload className="h-8 w-8 text-primary-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Carregar imagens</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP ou GIF — máx. 5 MB cada</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">Vai para a Galeria manual — capas e banners são geridos no editor de posts</p>
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

      {/* Section label + count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-[3px] rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">Galeria</span>
          <span className="ml-1 text-xs text-muted-foreground">
            {images.length} imagem(ns){unusedCount > 0 ? ` · ${unusedCount} não utilizadas` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOnlyUnused((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            onlyUnused
              ? 'border-warning/40 bg-warning/10 text-warning'
              : 'border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          Só não utilizadas
        </button>
      </div>

      {/* Source filter */}
      <div className="flex w-fit flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setActiveSource('all')}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
            activeSource === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
          }`}
        >
          Todas <span className="opacity-70">{sourceCounts.all}</span>
        </button>
        {MEDIA_SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSource(s.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              activeSource === s.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
            {s.label} <span className="opacity-70">{sourceCounts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <div className="flex h-[17px] w-[17px] items-center justify-center rounded-[5px] bg-primary">
              <Check className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
            {selected.size} selecionada{selected.size > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleBatchCopy}>
              <Copy className="h-3 w-3" /> Copiar URLs
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-3 w-3" /> Eliminar
            </Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Gallery grid */}
      <div data-tour="media-grid">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="rounded-2xl bg-destructive/10 p-5">
              <AlertTriangle className="h-10 w-10 text-destructive/70" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground/80">Não foi possível carregar a galeria</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {error instanceof Error && error.message
                ? error.message
                : 'Verifique as permissões do Storage e tente novamente.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['media-gallery'] })}
            >
              Tentar novamente
            </Button>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="rounded-2xl bg-muted/40 p-5 dark:bg-muted/20">
              <Image className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground/70">
              {images.length === 0 ? 'Galeria vazia' : 'Nenhuma imagem encontrada'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {images.length === 0 ? 'Faça upload de imagens para começar' : 'Tente outra pesquisa ou filtro'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filteredImages.map((img) => {
              const sourceMeta = MEDIA_SOURCES.find((s) => s.id === img.source)!;
              return (
                <MediaTile
                  key={img.key}
                  img={img}
                  sourceMeta={sourceMeta}
                  uses={usageIndex?.get(img.url) ?? []}
                  protectedImage={isProtectedImage(img)}
                  selected={selected.has(img.key)}
                  copied={copiedKey === img.key}
                  onToggleSelect={() => toggleSelect(img.key)}
                  onCopy={() => handleCopy(img.key, img.url)}
                  onDelete={() => setDeleteTargets([img])}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTargets} onOpenChange={(o) => !o && setDeleteTargets(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTargets && deleteTargets.length > 1 ? `Eliminar ${deleteTargets.length} imagens?` : 'Eliminar imagem?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {deleteUsage && deleteUsage.inUse.length > 0 ? (
                  <>
                    <p className="flex items-center gap-1.5 font-medium text-warning">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {deleteTargets && deleteTargets.length > 1
                        ? `${deleteUsage.inUse.length} das imagens selecionadas estão em uso:`
                        : 'Esta imagem está em uso:'}
                    </p>
                    <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
                      {deleteUsage.inUse.map(({ img, uses }) => (
                        <li key={img.key} className="truncate">
                          <span className="font-medium text-foreground">{img.name}</span>
                          {' — '}
                          {uses.map((u) => u.title).join(', ')}
                        </li>
                      ))}
                    </ul>
                    <p>Esta ação não pode ser desfeita. Eliminar mesmo assim?</p>
                  </>
                ) : (
                  <p>Esta ação não pode ser desfeita.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargets && deleteMutation.mutate(deleteTargets)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MediaGalleryView;
