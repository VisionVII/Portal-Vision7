import React, { useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import SectionPageHero from '@/components/content/SectionPageHero';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { parseSectionPageBanners, SECTION_PAGE_BANNERS_KEY } from '@/lib/sectionPageConfig';
import { Link } from 'react-router-dom';
import { Cpu, Globe, Heart, Music, Trophy, ArrowRight, Mail, BarChart2, Zap, Eye } from 'lucide-react';

const CATEGORIES = [
  { label: 'Tecnologia', href: '/tecnologia', icon: Cpu, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { label: 'Mundo', href: '/mundo', icon: Globe, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { label: 'Saúde', href: '/saude', icon: Heart, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { label: 'Música', href: '/musica', icon: Music, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  { label: 'Desporto', href: '/desporto', icon: Trophy, color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
];

const STATS = [
  { icon: Eye, label: 'Artigos publicados', value: '200+' },
  { icon: BarChart2, label: 'Categorias cobertas', value: '5' },
  { icon: Zap, label: 'Automações editoriais', value: '6' },
  { icon: Globe, label: 'Países cobertos', value: '30+' },
];

const DIFFERENTIATORS = [
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
];

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
          <div className="mx-auto max-w-4xl space-y-12">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm sm:p-5">
                  <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="font-headline text-xl font-bold text-foreground sm:text-2xl">{value}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{label}</p>
                </div>
              ))}
            </div>

            {/* Missão */}
            <section>
              <h2 className="font-editorial text-2xl font-bold mb-4 sm:text-3xl">A Nossa Missão</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                O Vision7 nasceu com um propósito claro: oferecer jornalismo analítico de qualidade em português brasileiro.
                Num ecossistema mediático saturado de notícias rápidas e superficiais, apostamos em conteúdo com profundidade,
                dados quantitativos e perspectiva estratégica.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Cobrimos as áreas que moldam o futuro — tecnologia, mundo, saúde, música e desporto —
                sempre com um olhar atento ao contexto português e europeu.
              </p>
            </section>

            {/* Diferenciais */}
            <section>
              <h2 className="font-editorial text-2xl font-bold mb-6 sm:text-3xl">O que nos Diferencia</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {DIFFERENTIATORS.map((item) => (
                  <Card key={item.title} className="border-border/60 transition-shadow hover:shadow-md">
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
              <h2 className="font-editorial text-2xl font-bold mb-4 sm:text-3xl">As Nossas Categorias</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map(({ label, href, icon: Icon, color }) => (
                  <Link
                    key={href}
                    to={href}
                    className={`flex items-center gap-3 rounded-xl border px-5 py-4 font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md ${color}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                    <ArrowRight className="ml-auto h-4 w-4 opacity-60" />
                  </Link>
                ))}
              </div>
            </section>

            {/* CTA duplo */}
            <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/5 to-secondary/8 p-8 text-center">
              <h2 className="font-editorial text-2xl font-bold mb-2">Faça Parte do Vision7</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Subscreva a newsletter para receber análises exclusivas, ou contacte-nos para colaborações e parcerias.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/contacto"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-primary/30 sm:w-auto"
                >
                  Entrar em Contacto
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#newsletter"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted sm:w-auto"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  Subscrever Newsletter
                </a>
              </div>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Sobre;
