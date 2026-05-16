import React from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ALLOWED_HOME_BANNER_TYPES } from '@/lib/homepage-config';

interface HomeBannerUploaderProps {
  bannerUrl: string;
  mobileBannerUrl: string;
  uploadingBannerKey: string | null;
  onBannerUrlChange: (url: string) => void;
  onMobileBannerUrlChange: (url: string) => void;
  onUpload: (variant: 'desktop' | 'mobile', file?: File | null) => void;
}

const HomeBannerUploader = ({
  bannerUrl,
  mobileBannerUrl,
  uploadingBannerKey,
  onBannerUrlChange,
  onMobileBannerUrlChange,
  onUpload,
}: HomeBannerUploaderProps) => {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Banner desktop</p>
          <p className="text-xs text-muted-foreground">Imagem horizontal para desktop e notebook.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="home-banner-url" className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-primary-500" />
            URL pública desktop
          </Label>
          <Input
            id="home-banner-url"
            value={bannerUrl}
            onChange={(event) => onBannerUrlChange(event.target.value)}
            placeholder="https://... ou URL pública do Storage"
          />
        </div>
        <input
          id="home-banner-desktop-upload"
          type="file"
          accept={ALLOWED_HOME_BANNER_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            onUpload('desktop', nextFile);
            event.currentTarget.value = '';
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={uploadingBannerKey === 'home:desktop'}
            onClick={() => document.getElementById('home-banner-desktop-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploadingBannerKey === 'home:desktop' ? 'A carregar…' : 'Subir desktop'}
          </Button>
          <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Banner mobile</p>
          <p className="text-xs text-muted-foreground">Imagem vertical para smartphones e primeira dobra.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="home-banner-mobile-url" className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-primary-500" />
            URL pública mobile
          </Label>
          <Input
            id="home-banner-mobile-url"
            value={mobileBannerUrl}
            onChange={(event) => onMobileBannerUrlChange(event.target.value)}
            placeholder="https://... ou URL pública do Storage"
          />
        </div>
        <input
          id="home-banner-mobile-upload"
          type="file"
          accept={ALLOWED_HOME_BANNER_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            onUpload('mobile', nextFile);
            event.currentTarget.value = '';
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={uploadingBannerKey === 'home:mobile'}
            onClick={() => document.getElementById('home-banner-mobile-upload')?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploadingBannerKey === 'home:mobile' ? 'A carregar…' : 'Subir mobile'}
          </Button>
          <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 5MB.</span>
        </div>
      </div>
    </div>
  );
};

export default HomeBannerUploader;
