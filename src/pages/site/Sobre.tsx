import React, { useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import SectionPageHero from '@/components/content/SectionPageHero';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { parseSectionPageBanners, SECTION_PAGE_BANNERS_KEY } from '@/lib/sectionPageConfig';
import { Link } from 'react-router-dom';

const Sobre = () => {
  const { data: siteSettings } = useSiteSettings();
  const sectionPageBanners = useMemo(
    () => parseSectionPageBanners(siteSettings?.[SECTION_PAGE_BANNERS_KEY]),
    [siteSettings],
  );
  const aboutHero = sectionPageBanners.about;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <SectionPageHero
        title="Sobre o Vision7"
        description="Um portal editorial português dedicado a tecnologia, cultura, saúde, desporto e tendências globais — com rigor analítico e curadoria premium."
        align="left"
        fallbackClassName="bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-800"
        media={aboutHero?.bannerUrl || aboutHero?.mobileBannerUrl ? {
          desktopUrl: aboutHero.bannerUrl,
          mobileUrl: aboutHero.mobileBannerUrl,
          alt: 'Banner da página Sobre',
        } : null}
        metaSlot={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/88 backdrop-blur-sm">
              Identidade
            </span>
          </div>
        )}
      />

      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl space-y-10">

            {/* Missão */}
            <section>
              <h2 className="font-editorial text-3xl font-bold mb-4">A Nossa Missão</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                O Vision7 nasceu com um propósito claro: oferecer jornalismo analítico de qualidade em português europeu.
                Num ecossistema mediático saturado de notícias rápidas e superficiais, apostamos em conteúdo com profundidade,
                dados quantitativos e perspectiva estratégica.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Cobrimos as áreas que moldam o futuro — tecnologia, mundo, saúde, música, desporto e audiocasts —
                sempre com um olhar atento ao contexto português e europeu.
              </p>
            </section>

            {/* O que nos diferencia */}
            <section>
              <h2 className="font-editorial text-3xl font-bold mb-6">O que nos Diferencia</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    title: 'Rigor Analítico',
                    desc: 'Cada artigo inclui dados quantitativos, fontes verificadas e previsões fundamentadas — nunca apenas descrição de factos.',
                  },
                  {
                    title: 'Contexto Portugal',
                    desc: 'Analisamos o impacto de cada tendência global no mercado português, com cenários concretos para empresas e cidadãos.',
                  },
                  {
                    title: 'IA Editorial',
                    desc: 'Utilizamos inteligência artificial para apoiar a investigação e estruturação de conteúdo, com revisão editorial humana.',
                  },
                  {
                    title: 'Profundidade Temática',
                    desc: 'Abordamos temas com a extensão que merecem — artigos longos, bem estruturados, com índice navegável.',
                  },
                ].map((item) => (
                  <Card key={item.title}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Categorias */}
            <section>
              <h2 className="font-editorial text-3xl font-bold mb-4">As Nossas Categorias</h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'Tecnologia', href: '/tecnologia' },
                  { label: 'Mundo', href: '/mundo' },
                  { label: 'Saúde', href: '/saude' },
                  { label: 'Música', href: '/musica' },
                  { label: 'Desporto', href: '/desporto' },
                  { label: 'Audiocasts', href: '/audiocasts' },
                ].map((cat) => (
                  <li key={cat.href}>
                    <Link
                      to={cat.href}
                      className="block rounded-lg border border-border bg-muted/40 px-4 py-3 font-medium transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Contacto CTA */}
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-8 text-center">
              <h2 className="font-editorial text-2xl font-bold mb-3">Fale Connosco</h2>
              <p className="text-muted-foreground mb-5">
                Tem sugestões, quer colaborar ou tem uma história para partilhar? Estamos disponíveis.
              </p>
              <Link
                to="/contacto"
                className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Entrar em Contacto
              </Link>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Sobre;
