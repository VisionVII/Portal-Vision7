export type PartnerType = 'curso' | 'produto' | 'servico' | 'link';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration: string;
  category?: string;
  category_id?: string | null;
  instructor?: string;
  published_at: string;
  status?: string;
  tags?: string[];
  partner_type?: PartnerType;
  image_url?: string | null;
  thumbnail_url?: string | null;
  partnerName?: string;
  affiliateUrl?: string;
  ctaLabel?: string;
  badge?: string;
  categories?: {
    id: string;
    name: string;
    slug: string;
    color: string;
  } | null;
}

/** @deprecated Fallback courses removed — section now hidden when DB is empty */
export const courses: Course[] = [];
