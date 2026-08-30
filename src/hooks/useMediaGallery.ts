import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const MEDIA_BUCKET = 'post-images';

export type MediaSource = 'posts' | 'banners' | 'gallery' | 'manus';

export const MEDIA_SOURCES: { id: MediaSource; label: string; shortLabel: string; dot: string }[] = [
  { id: 'posts', label: 'Capas', shortLabel: 'Capa', dot: 'bg-sky-500' },
  { id: 'banners', label: 'Banners', shortLabel: 'Banner', dot: 'bg-amber-500' },
  { id: 'gallery', label: 'Galeria manual', shortLabel: 'Galeria', dot: 'bg-violet-500' },
  { id: 'manus', label: 'Geradas por IA', shortLabel: 'IA', dot: 'bg-emerald-500' },
];

export interface GalleryImage {
  key: string;
  name: string;
  source: MediaSource;
  url: string;
  created_at: string;
}

// Lista as 4 pastas do bucket que guardam imagens do portal (capas de posts,
// banners, uploads manuais da galeria e capas geradas pela IA).
export function useGalleryImages() {
  return useQuery<GalleryImage[]>({
    queryKey: ['media-gallery'],
    queryFn: async () => {
      const lists = await Promise.all(
        MEDIA_SOURCES.map(async (s) => {
          const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(s.id, {
            limit: 200,
            sortBy: { column: 'created_at', order: 'desc' },
          });
          if (error) throw error;
          return (data || [])
            .filter((f) => !f.name.startsWith('.'))
            .map((f): GalleryImage => {
              const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(`${s.id}/${f.name}`);
              return {
                key: `${s.id}/${f.name}`,
                name: f.name,
                source: s.id,
                url: urlData.publicUrl,
                created_at: f.created_at || '',
              };
            });
        }),
      );
      return lists.flat().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },
  });
}
