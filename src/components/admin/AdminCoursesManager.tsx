import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Pencil, Plus, Save, Trash2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MediaPickerDialog from '@/components/admin/MediaPickerDialog';
import { useCategories } from '@/hooks/useCategories';
import { useCreateCourse, useCourses, useDeleteCourse, useUpdateCourse } from '@/hooks/useCourses';
import { Course, PartnerType } from '@/data/courses';
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
  partner_type: PartnerType;
  image_url: string;
  affiliateUrl: string;
  partnerName: string;
  ctaLabel: string;
  badge: string;
}

const COURSE_META_KEY = 'course_partner_meta';

// Tipo de parceiro tem cor própria em toda a área — badge no cartão, chip de
// filtro e stat card usam sempre a mesma cor por tipo.
const PARTNER_TYPES: { id: PartnerType; label: string; noun: string; dot: string }[] = [
  { id: 'curso', label: 'Curso', noun: 'curso', dot: 'bg-sky-500' },
  { id: 'produto', label: 'Produto', noun: 'produto', dot: 'bg-amber-500' },
  { id: 'servico', label: 'Serviço', noun: 'serviço', dot: 'bg-violet-500' },
  { id: 'link', label: 'Link / Afiliado', noun: 'link', dot: 'bg-emerald-500' },
];

const defaultForm: CourseFormState = {
  title: '',
  slug: '',
  description: '',
  level: 'Iniciante',
  duration: '2h',
  instructor: '',
  status: 'published',
  category_id: '',
  partner_type: 'curso',
  image_url: '',
  affiliateUrl: '',
  partnerName: '',
  ctaLabel: 'Ver oferta',
  badge: 'Afiliado',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

interface PartnerCardProps {
  course: Course;
  meta: CourseMeta;
  typeMeta: { label: string; dot: string };
  onEdit: () => void;
  onDelete: () => void;
}

const PartnerCard: React.FC<PartnerCardProps> = ({ course, meta, typeMeta, onEdit, onDelete }) => {
  const isPublished = course.status !== 'draft';
  return (
    <div className="group overflow-hidden rounded-2xl border border-border/30 bg-card/60 transition-all duration-200 hover:shadow-md dark:border-border/20">
      <div className="relative aspect-[16/10] bg-muted/30">
        {course.image_url ? (
          <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeMeta.dot}`} />
          {typeMeta.label}
        </span>
        <span
          className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-black/40 ${isPublished ? 'bg-success' : 'bg-warning'}`}
          title={isPublished ? 'Publicado' : 'Rascunho'}
        />
      </div>
      <div className="p-3">
        <p className="truncate text-[13px] font-semibold text-foreground">{course.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11px] text-muted-foreground">
            {meta.partnerName || course.instructor || '—'}
          </span>
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminCoursesManagerProps {
  searchQuery?: string;
}

const AdminCoursesManager: React.FC<AdminCoursesManagerProps> = ({ searchQuery = '' }) => {
  const { data: categories = [] } = useCategories();
  const { data: courses = [], isLoading: isLoadingCourses } = useCourses(true);
  const { data: siteSettings } = useSiteSettings();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();
  const updateSetting = useUpdateSiteSetting();
  const { toast } = useToast();

  const [form, setForm] = useState<CourseFormState>(defaultForm);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [activeType, setActiveType] = useState<PartnerType | 'all'>('all');

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
      partner_type: editingCourse.partner_type || 'curso',
      image_url: editingCourse.image_url || '',
      affiliateUrl: meta.affiliateUrl || '',
      partnerName: meta.partnerName || '',
      ctaLabel: meta.ctaLabel || 'Ver oferta',
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

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setFormOpen(true);
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
          partner_type: form.partner_type,
          image_url: form.image_url || null,
        });

        await saveMeta(form.slug, editingCourse.slug);
        toast({ title: 'Parceiro atualizado', description: 'O cartão de parceria foi atualizado.' });
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
          partner_type: form.partner_type,
          image_url: form.image_url || null,
        });

        await saveMeta(form.slug);
        toast({ title: 'Parceiro criado', description: 'O novo cartão já pode ser exibido no portal.' });
      }

      setFormOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Erro ao salvar parceiro',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o parceiro.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const course = deleteTarget;

    try {
      await deleteCourse.mutateAsync(course.id);

      const nextMeta = { ...courseMeta };
      delete nextMeta[course.slug];
      await updateSetting.mutateAsync({
        key: COURSE_META_KEY,
        value: JSON.stringify(nextMeta),
      });

      toast({ title: 'Parceiro removido', description: 'O cartão deixou de ser exibido no portal.' });
      if (editingCourse?.id === course.id) {
        resetForm();
        setFormOpen(false);
      }
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        description: error instanceof Error ? error.message : 'Não foi possível remover o parceiro.',
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const total = courses.length;
  const published = useMemo(() => courses.filter((c) => c.status !== 'draft').length, [courses]);
  const draft = total - published;
  const cursoCount = useMemo(
    () => courses.filter((c) => (c.partner_type || 'curso') === 'curso').length,
    [courses],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: total };
    for (const t of PARTNER_TYPES) counts[t.id] = 0;
    for (const c of courses) {
      const t = c.partner_type || 'curso';
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [courses, total]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      if (activeType !== 'all' && (c.partner_type || 'curso') !== activeType) return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [courses, activeType, searchQuery]);

  const activeTypeMeta = PARTNER_TYPES.find((t) => t.id === form.partner_type) ?? PARTNER_TYPES[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-[3px] rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50">Parceiros</span>
          <span className="ml-1 text-xs text-muted-foreground">{total} no total</span>
        </div>
        <Button data-tour="courses-form" size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Novo parceiro
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-xl font-extrabold text-foreground">{total}</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-gradient-to-br from-success/15 via-success/5 to-transparent p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-success">Publicados</p>
          <p className="mt-1 text-xl font-extrabold text-success">{published}</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-gradient-to-br from-warning/15 via-warning/5 to-transparent p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-warning">Rascunhos</p>
          <p className="mt-1 text-xl font-extrabold text-warning">{draft}</p>
        </div>
        <div className="rounded-xl border border-info/30 bg-gradient-to-br from-info/15 via-info/5 to-transparent p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-info">Cursos</p>
          <p className="mt-1 text-xl font-extrabold text-info">{cursoCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveType('all')}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
            activeType === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
          }`}
        >
          Todos <span className="opacity-70">{typeCounts.all}</span>
        </button>
        {PARTNER_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveType(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              activeType === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
            {t.label} <span className="opacity-70">{typeCounts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div data-tour="courses-catalog">
        {isLoadingCourses ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="rounded-2xl bg-muted/40 p-5 dark:bg-muted/20">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground/70">
              {total === 0 ? 'Ainda sem parceiros' : 'Nenhum parceiro encontrado'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {total === 0 ? 'Crie o primeiro cartão de curso, produto, serviço ou link' : 'Tente outra pesquisa ou filtro'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filteredCourses.map((course) => {
              const typeMeta = PARTNER_TYPES.find((t) => t.id === (course.partner_type || 'curso')) ?? PARTNER_TYPES[0];
              return (
                <PartnerCard
                  key={course.id}
                  course={course}
                  meta={courseMeta[course.slug] ?? {}}
                  typeMeta={typeMeta}
                  onEdit={() => openEdit(course)}
                  onDelete={() => setDeleteTarget(course)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Criar / editar */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden rounded-2xl p-0">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
            <DialogTitle className="text-base">{editingCourse ? 'Editar parceiro' : 'Novo parceiro'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="course-title">Nome do parceiro / título</Label>
                <Input id="course-title" value={form.title} onChange={(event) => handleChange('title', event.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Imagem</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-1.5 border-primary/40 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    onClick={() => setPickerOpen(true)}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Escolher da Galeria
                  </Button>
                  <Input
                    value={form.image_url}
                    onChange={(event) => handleChange('image_url', event.target.value)}
                    placeholder="ou cole um URL"
                    className="flex-1"
                  />
                </div>
                {form.image_url && (
                  <div className="mt-1 h-16 w-16 overflow-hidden rounded-lg border border-border">
                    <img src={form.image_url} alt="Preview" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course-slug">Slug</Label>
                  <Input id="course-slug" value={form.slug} onChange={(event) => handleChange('slug', slugify(event.target.value))} required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.partner_type} onValueChange={(value: PartnerType) => handleChange('partner_type', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PARTNER_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="course-description">Descrição</Label>
                <Textarea
                  id="course-description"
                  value={form.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="min-h-[90px]"
                  required
                />
              </div>

              {form.partner_type === 'curso' ? (
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
                    <Label>Estado</Label>
                    <Select value={form.status} onValueChange={(value: CourseFormState['status']) => handleChange('status', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Publicado</SelectItem>
                        <SelectItem value="draft">Rascunho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={(value: CourseFormState['status']) => handleChange('status', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="course-instructor">Instrutor / parceiro</Label>
                <Input id="course-instructor" value={form.instructor} onChange={(event) => handleChange('instructor', event.target.value)} />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
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
                <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{form.ctaLabel || 'Ver oferta'} — {form.partnerName || 'Parceiro'}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-border/60 px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                {editingCourse ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingCourse ? `Atualizar ${activeTypeMeta.noun}` : `Criar ${activeTypeMeta.noun}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(url) => handleChange('image_url', url)}
      />

      {/* Eliminar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.title}" deixará de ser exibido no portal. ` : ''}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCourse.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCoursesManager;
