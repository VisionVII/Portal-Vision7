import React, { useCallback, useMemo, useState } from 'react';
import {
  Headphones,
  Music,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  FileAudio,
  Eye,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useAudiocasts,
  useCreateAudiocast,
  useUpdateAudiocast,
  useDeleteAudiocast,
  useAudiocastStats,
  type Audiocast,
  type CreateAudiocastData,
} from '@/hooks/useAudiocasts';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/lib/utils';

// ─── Form state ──────────────────────────────────────────────────────────────
interface AudiocastForm {
  title: string;
  slug: string;
  description: string;
  category_id: string;
  tags: string;
  status: string;
  audioFile: File | null;
  coverFile: File | null;
  audioPreview: string;
  coverPreview: string;
  duration: number;
}

const EMPTY_FORM: AudiocastForm = {
  title: '',
  slug: '',
  description: '',
  category_id: '',
  tags: '',
  status: 'draft',
  audioFile: null,
  coverFile: null,
  audioPreview: '',
  coverPreview: '',
  duration: 0,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

// ─── Component ───────────────────────────────────────────────────────────────
const AudiocastsView: React.FC = () => {
  const { data: audiocasts = [], isLoading } = useAudiocasts(true);
  const { data: stats } = useAudiocastStats();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateAudiocast();
  const updateMutation = useUpdateAudiocast();
  const deleteMutation = useDeleteAudiocast();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AudiocastForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return audiocasts;
    const q = search.toLowerCase();
    return audiocasts.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.categories?.name?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [audiocasts, search]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }, []);

  const openNew = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }, []);

  const openEdit = useCallback(
    (ac: Audiocast) => {
      setForm({
        title: ac.title,
        slug: ac.slug,
        description: ac.description ?? '',
        category_id: ac.category_id ?? '',
        tags: ac.tags?.join(', ') ?? '',
        status: ac.status,
        audioFile: null,
        coverFile: null,
        audioPreview: ac.audio_url ?? '',
        coverPreview: ac.cover_url ?? '',
        duration: ac.duration ?? 0,
      });
      setEditingId(ac.id);
      setShowForm(true);
    },
    [],
  );

  const handleTitleChange = useCallback((title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: prev.slug === slugify(prev.title) || !prev.slug ? slugify(title) : prev.slug,
    }));
  }, []);

  const handleAudioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Ficheiro inválido', description: 'Selecione um ficheiro de áudio (mp3, wav, ogg…)', variant: 'destructive' });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'Ficheiro demasiado grande', description: 'Máximo 100 MB', variant: 'destructive' });
      return;
    }
    // Get duration from audio
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      setForm((prev) => ({ ...prev, duration: Math.round(audio.duration) }));
      URL.revokeObjectURL(url);
    });
    setForm((prev) => ({ ...prev, audioFile: file, audioPreview: url }));
  }, [toast]);

  const handleCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ficheiro inválido', description: 'Selecione uma imagem (png, jpg, webp…)', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem demasiado grande', description: 'Máximo 5 MB', variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, coverFile: file, coverPreview: url }));
  }, [toast]);

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Título e slug são obrigatórios.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let audioUrl = form.audioPreview;
      let coverUrl = form.coverPreview;
      // Upload audio if new file selected
      if (form.audioFile) {
        audioUrl = await uploadFile(form.audioFile, 'podcasts', 'audiocasts');
      }
      // Upload cover image if new file selected
      if (form.coverFile) {
        coverUrl = await uploadFile(form.coverFile, 'audiocast-covers', 'covers');
      }

      const payload: CreateAudiocastData = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        audio_url: audioUrl || undefined,
        cover_url: coverUrl || undefined,
        duration: form.duration || undefined,
        category_id: form.category_id || undefined,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        status: form.status,
      };

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: 'Audiocast atualizado' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Audiocast criado' });
      }
      resetForm();
    } catch (err) {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      if (!window.confirm(`Eliminar "${title}"? Esta ação é irreversível.`)) return;
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: 'Audiocast eliminado' });
      } catch (err) {
        toast({ title: 'Erro ao eliminar', description: (err as Error).message, variant: 'destructive' });
      }
    },
    [deleteMutation, toast],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats?.total ?? 0, icon: Headphones },
          { label: 'Publicados', value: stats?.published ?? 0, icon: Music },
          { label: 'Reproduções', value: stats?.totalViews ?? 0, icon: Eye },
          { label: 'Downloads', value: stats?.totalDownloads ?? 0, icon: Download },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar audiocasts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Audiocast
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">
                {editingId ? 'Editar Audiocast' : 'Novo Audiocast'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Atualize os detalhes do audiocast.' : 'Preencha os campos e faça upload do áudio.'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="ac-title">Título *</Label>
                  <Input
                    id="ac-title"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Inovação Digital em Portugal"
                    required
                  />
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <Label htmlFor="ac-slug">Slug *</Label>
                  <Input
                    id="ac-slug"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="inovacao-digital-portugal"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ac-tags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="ac-tags"
                    value={form.tags}
                    onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                    placeholder="tecnologia, ia, portugal"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="ac-desc">Descrição</Label>
                <Textarea
                  id="ac-desc"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Breve descrição do episódio…"
                />
              </div>

              {/* Audio upload */}
              <div className="space-y-2">
                <Label>Ficheiro de Áudio</Label>
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
                  <FileAudio className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Arraste ou clique para selecionar (.mp3, .wav, .ogg — máx 100 MB)
                  </p>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="mx-auto block w-full max-w-xs cursor-pointer text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                  />
                  {form.audioPreview && (
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>Duração: {formatDuration(form.duration)}</p>
                      {form.audioFile && <p className="max-w-xs truncate">Ficheiro: {form.audioFile.name}</p>}
                      <audio controls src={form.audioPreview} className="mx-auto mt-2 w-full max-w-md" />
                    </div>
                  )}
                </div>
              </div>

              {/* Cover image upload */}
              <div className="space-y-2">
                <Label>Imagem de Capa</Label>
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Imagem de capa do episódio (.png, .jpg, .webp — máx 5 MB)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="mx-auto block w-full max-w-xs cursor-pointer text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
                  />
                  {form.coverPreview && (
                    <img
                      src={form.coverPreview}
                      alt="Capa"
                      className="mx-auto mt-2 h-32 w-32 rounded-xl object-cover shadow"
                    />
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading} className="gap-2">
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {editingId ? 'Guardar alterações' : 'Publicar Audiocast'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Headphones className="h-4 w-4 text-primary" />
            Biblioteca de Audiocasts
          </CardTitle>
          <CardDescription>
            {filtered.length} audiocast{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Headphones className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Nenhum audiocast encontrado</p>
              <p className="mt-1 text-xs">Crie o primeiro audiocast clicando em "Novo Audiocast".</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((ac) => (
                <div
                  key={ac.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {ac.cover_url ? (
                      <img src={ac.cover_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Headphones className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-semibold">{ac.title}</h4>
                      <Badge
                        variant={ac.status === 'published' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {ac.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      {ac.categories && (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: ac.categories.color, color: ac.categories.color }}
                        >
                          {ac.categories.name}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{formatDuration(ac.duration ?? 0)}</span>
                      <span>{ac.views.toLocaleString()} plays</span>
                      <span>{ac.downloads.toLocaleString()} downloads</span>
                      <span>
                        {new Date(ac.created_at).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {ac.tags && ac.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {ac.tags.map((t: string) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(ac)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(ac.id, ac.title)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AudiocastsView;
