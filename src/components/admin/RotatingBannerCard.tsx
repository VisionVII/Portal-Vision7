import React from 'react';
import { ArrowDown, ArrowUp, GripVertical, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ALLOWED_HOME_BANNER_TYPES, type HomePageBanner } from '@/lib/homepage-config';

interface RotatingBannerCardProps {
  banner: HomePageBanner;
  index: number;
  total: number;
  uploadingBannerKey: string | null;
  isDragOver: boolean;
  onUpdate: (id: string, patch: Partial<HomePageBanner>) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onUpload: (id: string, variant: 'desktop' | 'mobile', file?: File | null) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}

const RotatingBannerCard = ({
  banner,
  index,
  total,
  uploadingBannerKey,
  isDragOver,
  onUpdate,
  onRemove,
  onMove,
  onUpload,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: RotatingBannerCardProps) => {
  const desktopInputId = `rotating-banner-${banner.id}-desktop`;
  const mobileInputId = `rotating-banner-${banner.id}-mobile`;

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(banner.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(banner.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(banner.id);
      }}
      onDragEnd={onDragEnd}
      className={`space-y-4 rounded-2xl border p-4 transition-all ${
        isDragOver ? 'border-primary-400 bg-primary-50/60 dark:border-primary-700 dark:bg-primary-900/20' : 'border-border/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="cursor-grab rounded-lg border border-border bg-background p-1.5 text-muted-foreground shadow-sm">
            <GripVertical className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-foreground">Banner {index + 1}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onMove(index, -1)} disabled={index === 0}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onMove(index, 1)} disabled={index === total - 1}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Switch checked={banner.enabled} onCheckedChange={(checked) => onUpdate(banner.id, { enabled: checked })} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(banner.id)}
            disabled={total <= 1}
            title={total <= 1 ? 'Tem de existir pelo menos um banner' : 'Remover banner'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${banner.id}-title`}>Título</Label>
          <Input
            id={`${banner.id}-title`}
            value={banner.title}
            onChange={(event) => onUpdate(banner.id, { title: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${banner.id}-cta-label`}>Texto do CTA</Label>
          <Input
            id={`${banner.id}-cta-label`}
            value={banner.ctaLabel}
            onChange={(event) => onUpdate(banner.id, { ctaLabel: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${banner.id}-description`}>Descrição</Label>
        <Textarea
          id={`${banner.id}-description`}
          rows={2}
          value={banner.description}
          onChange={(event) => onUpdate(banner.id, { description: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${banner.id}-cta-href`}>Destino do CTA</Label>
        <Input
          id={`${banner.id}-cta-href`}
          value={banner.ctaHref}
          onChange={(event) => onUpdate(banner.id, { ctaHref: event.target.value })}
          placeholder="#noticias ou /categoria"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-slate-950/95">
        {banner.imageUrl || banner.mobileImageUrl ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Desktop</p>
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={`Preview desktop — ${banner.title}`} className="h-32 w-full rounded-xl object-cover object-center" />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/12 bg-white/5 text-xs text-white/55">Sem imagem</div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Mobile</p>
              {banner.mobileImageUrl ? (
                <img src={banner.mobileImageUrl} alt={`Preview mobile — ${banner.title}`} className="h-32 w-full rounded-xl object-cover object-center" />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/12 bg-white/5 text-xs text-white/55">Sem imagem</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center text-xs text-white/55">Nenhuma imagem configurada</div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <input
            id={desktopInputId}
            type="file"
            accept={ALLOWED_HOME_BANNER_TYPES.join(',')}
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              onUpload(banner.id, 'desktop', nextFile);
              event.currentTarget.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={uploadingBannerKey === `${banner.id}:desktop`}
            onClick={() => document.getElementById(desktopInputId)?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {uploadingBannerKey === `${banner.id}:desktop` ? 'A carregar…' : 'Subir desktop'}
          </Button>
        </div>
        <div className="space-y-2">
          <input
            id={mobileInputId}
            type="file"
            accept={ALLOWED_HOME_BANNER_TYPES.join(',')}
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              onUpload(banner.id, 'mobile', nextFile);
              event.currentTarget.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={uploadingBannerKey === `${banner.id}:mobile`}
            onClick={() => document.getElementById(mobileInputId)?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {uploadingBannerKey === `${banner.id}:mobile` ? 'A carregar…' : 'Subir mobile'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RotatingBannerCard;
