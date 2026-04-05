import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCourses } from '@/hooks/useCourses';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface CourseMeta {
  affiliateUrl?: string;
  partnerName?: string;
  ctaLabel?: string;
  badge?: string;
}

const parseCourseMeta = (rawValue?: string | null): Record<string, CourseMeta> => {
  if (!rawValue) return {};

  try {
    return JSON.parse(rawValue) as Record<string, CourseMeta>;
  } catch {
    return {};
  }
};

const Course = () => {
  const { slug } = useParams();
  const { data: courses, isLoading } = useCourses();
  const { data: siteSettings } = useSiteSettings();
  const course = courses?.find((item) => item.slug === slug);
  const courseMeta = useMemo(() => parseCourseMeta(siteSettings?.course_partner_meta), [siteSettings]);
  const partnerMeta = course ? courseMeta[course.slug] ?? {} : {};

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary-600">
              ← Voltar para a página principal
            </Link>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">Carregando curso...</div>
          ) : !course ? (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h1 className="mb-4 text-2xl font-bold">Curso não encontrado</h1>
              <p className="mb-4 text-muted-foreground">Verifique se o link está correto.</p>
              <Link to="/" className="font-semibold text-primary-600 hover:text-primary-700">Voltar para a página principal</Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-8">
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
                      {partnerMeta.badge || 'Curso'}
                    </span>
                    {partnerMeta.partnerName && (
                      <span className="text-xs text-muted-foreground">Parceiro: {partnerMeta.partnerName}</span>
                    )}
                  </div>

                  <h1 className="mb-3 text-3xl font-headline font-bold leading-tight text-foreground sm:text-4xl">
                    {course.title}
                  </h1>
                  <p className="mb-2 text-sm text-muted-foreground">Categoria: {course.categories?.name || course.category || 'Geral'}</p>
                  <p className="mb-5 text-sm text-muted-foreground">Nível: {course.level} · Duração: {course.duration}</p>
                  <p className="text-base leading-8 text-foreground">{course.description}</p>
                  {course.instructor && <p className="mt-4 text-sm text-muted-foreground">Instrutor: {course.instructor}</p>}
                </div>

                <aside className="rounded-2xl border border-border bg-muted/30 p-4 lg:p-5">
                  <h2 className="mb-3 text-lg font-semibold text-foreground">Acesso rápido</h2>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Nível:</strong> {course.level}</p>
                    <p><strong className="text-foreground">Duração:</strong> {course.duration}</p>
                    {partnerMeta.partnerName ? <p><strong className="text-foreground">Parceiro:</strong> {partnerMeta.partnerName}</p> : null}
                  </div>

                  {partnerMeta.affiliateUrl && (
                    <div className="mt-5">
                      <a
                        href={partnerMeta.affiliateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
                      >
                        {partnerMeta.ctaLabel || 'Aceder ao parceiro'}
                      </a>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Course;
