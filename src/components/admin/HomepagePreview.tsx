import React from 'react';
import { Eye, LayoutTemplate } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type SectionId, type HomeSection } from '@/lib/homepage-config';

const sectionPreviewDescription: Record<SectionId, string> = {
  featured: 'Bloco editorial com a principal matéria e destaque visual.',
  latest: 'Grelha com as notícias mais recentes logo após o topo.',
  courses: 'Vitrine de cursos, parcerias e cartões de afiliados.',
  more: 'Feed expandido com conteúdo complementar e scroll contínuo.',
  newsletter: 'Call-to-action final para conversão e CRM.',
};

interface HomepagePreviewProps {
  enabledSections: HomeSection[];
}

const HomepagePreview = ({ enabledSections }: HomepagePreviewProps) => {
  return (
    <Card className="overflow-hidden border-primary-200/60 shadow-lg">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-primary-600" />
          Preview ao vivo do portal
        </CardTitle>
        <CardDescription>
          Camadas e posições definidas no painel à esquerda. O hero tem o seu próprio canvas interactivo na tab "Hero & banners".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 md:p-6">
        <div className="flex items-start gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
          <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <span>O hero (texto + banners rotativos) edita-se e pré-visualiza-se directamente no canvas da tab "Hero &amp; banners" — o que vês lá é exactamente o que vai para o portal.</span>
        </div>

        <div className="space-y-3">
          {enabledSections.map((section, index) => (
            <div key={section.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary-600">Camada {index + 1}</p>
                  <h3 className="text-lg font-headline font-bold text-foreground">{section.label}</h3>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {section.id}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{sectionPreviewDescription[section.id]}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HomepagePreview;
