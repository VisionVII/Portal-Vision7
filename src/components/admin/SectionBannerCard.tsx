import React from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ALLOWED_SECTION_PAGE_BANNER_TYPES,
  type SectionPageBannerEntry,
  type SectionPageId,
  type SectionPageBannerVariant,
} from '@/lib/sectionPageConfig';

interface SectionBannerCardProps {
  sectionId: SectionPageId;
  entry: SectionPageBannerEntry;
  uploadingBannerKey: string | null;
  onClear: (sectionId: SectionPageId) => void;
  onUrlChange: (sectionId: SectionPageId, patch: Partial<SectionPageBannerEntry>) => void;
  onUpload: (sectionId: SectionPageId, variant: SectionPageBannerVariant, file?: File | null) => void;
}

const SectionBannerCard = ({
  sectionId,
  entry,
  uploadingBannerKey,
  onClear,
  onUrlChange,
  onUpload,
}: SectionBannerCardProps) => {
  const desktopInputId = `section-banner-${sectionId}-desktop`;
  const mobileInputId = `section-banner-${sectionId}-mobile`;
  const hasAnyBanner = Boolean(entry.bannerUrl || entry.mobileBannerUrl);

  return (
    <div className="space-y-4 border-b border-border/50 pb-6 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">{entry.label}</p>
          <p className="text-sm text-muted-foreground">{entry.description}</p>
        </div>
        {hasAnyBanner ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => onClear(sectionId)}
          >
            <X className="h-4 w-4" />
            Limpar versões
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/60 bg-slate-950/95">
        {hasAnyBanner ? (
          <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.7fr)]">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Desktop</p>
              {entry.bannerUrl ? (
                <img
                  src={entry.bannerUrl}
                  alt={`Preview desktop do banner ${entry.label}`}
                  className="h-48 w-full rounded-2xl object-cover object-center lg:h-56"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/5 text-xs text-white/55 lg:h-56">
                  Sem imagem desktop
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Mobile</p>
              {entry.mobileBannerUrl ? (
                <img
                  src={entry.mobileBannerUrl}
                  alt={`Preview mobile do banner ${entry.label}`}
                  className="h-48 w-full rounded-2xl object-cover object-center lg:h-56"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/5 text-xs text-white/55 lg:h-56">
                  Sem imagem mobile
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-white/55">
            Nenhuma imagem configurada para esta secção.
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Versão desktop</p>
            <p className="text-xs text-muted-foreground">Paisagem ampla para notebook e desktop.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${desktopInputId}-url`}>URL pública</Label>
            <Input
              id={`${desktopInputId}-url`}
              value={entry.bannerUrl}
              onChange={(event) => onUrlChange(sectionId, { bannerUrl: event.target.value })}
              placeholder="https://... ou URL pública do Storage"
            />
          </div>
          <input
            id={desktopInputId}
            type="file"
            accept={ALLOWED_SECTION_PAGE_BANNER_TYPES.join(',')}
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              onUpload(sectionId, 'desktop', nextFile);
              event.currentTarget.value = '';
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={uploadingBannerKey === `${sectionId}:desktop`}
              onClick={() => document.getElementById(desktopInputId)?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploadingBannerKey === `${sectionId}:desktop` ? 'A carregar…' : 'Subir desktop'}
            </Button>
            <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Versão mobile</p>
            <p className="text-xs text-muted-foreground">Imagem vertical para smartphones e primeira dobra.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mobileInputId}-url`}>URL pública</Label>
            <Input
              id={`${mobileInputId}-url`}
              value={entry.mobileBannerUrl}
              onChange={(event) => onUrlChange(sectionId, { mobileBannerUrl: event.target.value })}
              placeholder="https://... ou URL pública do Storage"
            />
          </div>
          <input
            id={mobileInputId}
            type="file"
            accept={ALLOWED_SECTION_PAGE_BANNER_TYPES.join(',')}
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              onUpload(sectionId, 'mobile', nextFile);
              event.currentTarget.value = '';
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={uploadingBannerKey === `${sectionId}:mobile`}
              onClick={() => document.getElementById(mobileInputId)?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploadingBannerKey === `${sectionId}:mobile` ? 'A carregar…' : 'Subir mobile'}
            </Button>
            <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionBannerCard;
