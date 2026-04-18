import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, GraduationCap, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { useCreateCourse, useCourses, useDeleteCourse, useUpdateCourse } from '@/hooks/useCourses';
import { Course } from '@/data/courses';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useToast } from '@/hooks/use-toast';

interface CourseMeta {
  affiliateUrl?: string;
  partnerName?: string;
  ctaLabel?: string;
  badge?: string;
}

type CourseMetaMap = Record<string, CourseMeta>;

interface CourseFormState {
  title: string;
  slug: string;
  description: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration: string;
  instructor: string;
  status: 'draft' | 'published';
  category_id: string;
  affiliateUrl: string;
  partnerName: string;
  ctaLabel: string;
  badge: string;
}

const COURSE_META_KEY = 'course_partner_meta';

const defaultForm: CourseFormState = {
  title: '',
  slug: '',
  description: '',
  level: 'Iniciante',
  duration: '2h',
  instructor: '',
  status: 'published',
  category_id: '',
  affiliateUrl: '',
  partnerName: '',
  ctaLabel: 'Ver parceria',
  badge: 'Afiliado',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const parseMeta = (rawValue?: string | null): CourseMetaMap => {
  if (!rawValue) return {};

  try {
    return JSON.parse(rawValue) as CourseMetaMap;
  } catch (error) {
    console.warn('Falha ao ler metadados de cursos/parcerias.');
    return {};
  }
};

const AdminCoursesManager = () => {
  const { data: categories = [] } = useCategories();
  const { data: courses = [] } = useCourses(true);
  const { data: siteSettings } = useSiteSettings();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();

  const [form, setForm] = useState<CourseFormState>(defaultForm);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const courseMeta = useMemo(
    () => parseMeta(siteSettings?.[COURSE_META_KEY]),
    [siteSettings]
  );

  useEffect(() => {
    if (!editingCourse) return;

    const meta = courseMeta[editingCourse.slug] ?? {};
    setForm({
      title: editingCourse.title,
      slug: editingCourse.slug,
      description: editingCourse.description,
      level: editingCourse.level,
      duration: editingCourse.duration,
      instructor: editingCourse.instructor || '',
      status: editingCourse.status === 'draft' ? 'draft' : 'published',
      category_id: editingCourse.category_id || '',
      affiliateUrl: meta.affiliateUrl || '',
      partnerName: meta.partnerName || '',
      ctaLabel: meta.ctaLabel || 'Ver parceria',
      badge: meta.badge || 'Afiliado',
    });
  }, [courseMeta, editingCourse]);

  const handleChange = (key: keyof CourseFormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'title' && !editingCourse) {
        next.slug = slugify(value);
      }

      return next;
    });
  };

  const resetForm = () => {
    setEditingCourse(null);
    setForm(defaultForm);
  };

  const saveMeta = async (slug: string, previousSlug?: string) => {
    const nextMeta = { ...courseMeta };

    if (previousSlug && previousSlug !== slug) {
      delete nextMeta[previousSlug];
    }

    nextMeta[slug] = {
      affiliateUrl: form.affiliateUrl,
      partnerName: form.partnerName,
      ctaLabel: form.ctaLabel,
      badge: form.badge,
    };

    await updateSetting.mutateAsync({
      key: COURSE_META_KEY,
      value: JSON.stringify(nextMeta),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (editingCourse) {
        await updateCourse.mutateAsync({
          id: editingCourse.id,
          title: form.title,
          slug: form.slug,
          description: form.description,
          level: form.level,
          duration: form.duration,
          instructor: form.instructor,
          status: form.status,
          category_id: form.category_id || null,
        });

        await saveMeta(form.slug, editingCourse.slug);
        toast({ title: 'Curso atualizado', description: 'O card da parceria foi atualizado no CMS.' });
      } else {
        await createCourse.mutateAsync({
          title: form.title,
          slug: form.slug,
          description: form.description,
          level: form.level,
          duration: form.duration,
          instructor: form.instructor,
          status: form.status,
          category_id: form.category_id || null,
        });

        await saveMeta(form.slug);
        toast({ title: 'Curso criado', description: 'O novo cartão já pode ser exibido no portal.' });
      }

      resetForm();
    } catch (error) {
      toast({
        title: 'Erro ao salvar curso',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o curso/parceria.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Remover o curso/parceria "${course.title}"?`)) return;

    try {
      await deleteCourse.mutateAsync(course.id);

      const nextMeta = { ...courseMeta };
      delete nextMeta[course.slug];
      await updateSetting.mutateAsync({
        key: COURSE_META_KEY,
        value: JSON.stringify(nextMeta),
      });

      toast({ title: 'Curso removido', description: 'O cartão deixou de ser exibido no portal.' });
      if (editingCourse?.id === course.id) resetForm();
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        description: error instanceof Error ? error.message : 'Não foi possível remover o curso.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4 text-primary-600" />
            Cursos, afiliados e parcerias
          </CardTitle>
          <CardDescription>
            Crie os cartões comerciais do portal com texto, descrição e links externos controlados pelo admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">Título do curso/parceria</Label>
              <Input id="course-title" value={form.title} onChange={(event) => handleChange('title', event.target.value)} required />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course-slug">Slug</Label>
                <Input id="course-slug" value={form.slug} onChange={(event) => handleChange('slug', slugify(event.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category_id || 'none'} onValueChange={(value) => handleChange('category_id', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-description">Descrição</Label>
              <Textarea
                id="course-description"
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                className="min-h-[110px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select value={form.level} onValueChange={(value: CourseFormState['level']) => handleChange('level', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Iniciante">Iniciante</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-duration">Duração</Label>
                <Input id="course-duration" value={form.duration} onChange={(event) => handleChange('duration', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value: CourseFormState['status']) => handleChange('status', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-instructor">Instrutor / parceiro</Label>
              <Input id="course-instructor" value={form.instructor} onChange={(event) => handleChange('instructor', event.target.value)} />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Link comercial e CTA</p>
              <div className="space-y-2">
                <Label htmlFor="affiliate-url">Link de afiliado/parceria</Label>
                <Input id="affiliate-url" value={form.affiliateUrl} onChange={(event) => handleChange('affiliateUrl', event.target.value)} placeholder="https://parceiro.com/oferta" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="partner-name">Parceiro</Label>
                  <Input id="partner-name" value={form.partnerName} onChange={(event) => handleChange('partnerName', event.target.value)} placeholder="Udemy / Hotmart" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-label">Texto do botão</Label>
                  <Input id="cta-label" value={form.ctaLabel} onChange={(event) => handleChange('ctaLabel', event.target.value)} placeholder="Ver oferta" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge-label">Badge</Label>
                  <Input id="badge-label" value={form.badge} onChange={(event) => handleChange('badge', event.target.value)} placeholder="Afiliado" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="gap-2">
                {editingCourse ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingCourse ? 'Atualizar curso' : 'Criar curso'}
              </Button>
              {editingCourse && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar edição
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview do cartão no portal</CardTitle>
            <CardDescription>
              Visualização do bloco como será mostrado na vitrine de cursos e parcerias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-primary-200 bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
                    {form.badge || 'Afiliado'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{form.partnerName || 'Parceiro'}</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">{form.title || 'Título do curso/parceria'}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{form.description || 'A descrição comercial e editorial aparecerá aqui para o utilizador.'}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Nível: {form.level}</span>
                <span>{form.duration}</span>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white">
                  {form.ctaLabel || 'Ver oferta'}
                  <ExternalLink className="h-4 w-4" />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo atual</CardTitle>
            <CardDescription>
              Lista dos cursos disponíveis no admin para exibição pública, afiliados e parcerias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {courses.map((course) => {
              const meta = courseMeta[course.slug] ?? {};
              return (
                <div key={course.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{course.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {course.status === 'draft' ? 'Rascunho' : 'Publicado'}
                      </span>
                      {meta.badge && (
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          {meta.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {course.categories?.name || course.category || 'Sem categoria'} • {course.duration}
                      {meta.partnerName ? ` • ${meta.partnerName}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingCourse(course)} className="gap-1.5">
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(course)} className="gap-1.5 text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCoursesManager;
