import React from 'react';
import { FileAudio, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDuration } from '@/lib/utils';
import type { Audiocast } from '@/hooks/useAudiocasts';

export interface AudiocastFormState {
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

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface AudiocastFormCardProps {
  form: AudiocastFormState;
  editingId: string | null;
  categories: Category[];
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  onPatch: (patch: Partial<AudiocastFormState>) => void;
  onTitleChange: (title: string) => void;
  onAudioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
}

export const AudiocastFormCard = ({
  form,
  editingId,
  categories,
  isSubmitting,
  submitLabel,
  onSubmit,
  onPatch,
  onTitleChange,
  onAudioChange,
  onCoverChange,
  onClose,
}: AudiocastFormCardProps) => (
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
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ac-title">Título *</Label>
            <Input
              id="ac-title"
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ex: Inovação Digital em Portugal"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ac-slug">Slug *</Label>
            <Input
              id="ac-slug"
              value={form.slug}
              onChange={(e) => onPatch({ slug: e.target.value })}
              placeholder="inovacao-digital-portugal"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => onPatch({ category_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Estado de publicação</Label>
            <Select value={form.status} onValueChange={(v) => onPatch({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Só audiocasts com estado <strong>Publicado</strong> aparecem na página pública e na home.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ac-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="ac-tags"
              value={form.tags}
              onChange={(e) => onPatch({ tags: e.target.value })}
              placeholder="tecnologia, ia, portugal"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ac-desc">Descrição</Label>
          <Textarea
            id="ac-desc"
            value={form.description}
            onChange={(e) => onPatch({ description: e.target.value })}
            rows={3}
            placeholder="Breve descrição do episódio…"
          />
        </div>

        <div className="space-y-2">
          <Label>Ficheiro de Áudio</Label>
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
            <FileAudio className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Arraste ou clique para selecionar (.mp3, .m4a, .opus, .ogg, .wav — máx 100 MB)
            </p>
            <input
              type="file"
              accept="audio/*"
              onChange={onAudioChange}
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
              onChange={onCoverChange}
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {submitLabel}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
);
