import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { courses as initialCourses, Course } from '@/data/courses';

export interface CreateCourseData {
  title: string;
  slug: string;
  description: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  duration?: string;
  instructor?: string;
  status?: string;
  category_id?: string | null;
  tags?: string[];
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  id: string;
}

const COURSE_CATEGORY_SELECT = `
  categories (
    id,
    name,
    slug,
    color
  )
`;

const PUBLIC_COURSE_SELECT = `
  id,
  title,
  slug,
  description,
  level,
  duration,
  category_id,
  thumbnail_url,
  published_at,
  created_at,
  status,
  ${COURSE_CATEGORY_SELECT}
`;

const FULL_COURSE_SELECT = `
  id,
  title,
  slug,
  description,
  level,
  duration,
  category_id,
  thumbnail_url,
  published_at,
  created_at,
  status,
  ${COURSE_CATEGORY_SELECT}
`;

const normalizePublicCourse = (course: Partial<Course> & { created_at?: string; published_at?: string | null }): Course => ({
  id: course.id || '',
  title: course.title || '',
  slug: course.slug || '',
  description: course.description || '',
  level: course.level || 'Iniciante',
  duration: course.duration || 'n/d',
  category: course.category || (course.categories as { name?: string } | null)?.name,
  category_id: course.category_id || null,
  instructor: course.instructor,
  published_at: course.published_at || course.created_at || new Date(0).toISOString(),
  status: course.status || 'published',
  tags: course.tags || [],
  categories: course.categories || null,
});

const fallbackCourses: Course[] = initialCourses.map((course) => ({
  ...course,
  status: 'published',
  tags: [],
  category_id: null,
  categories: course.category
    ? {
        id: `fallback-${course.slug}`,
        name: course.category,
        slug: course.category.toLowerCase(),
        color: 'bg-blue-600',
      }
    : null,
}));

export const useCourses = (adminView = false) => {
  return useQuery({
    queryKey: ['courses', adminView],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select(adminView ? FULL_COURSE_SELECT : PUBLIC_COURSE_SELECT)
        .order('published_at', { ascending: false });

      if (!adminView) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('404') && !/AbortError|signal is aborted/i.test(error.message ?? '')) {
          console.warn('useCourses supabase query error', error);
        }
        return adminView ? [] : fallbackCourses;
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return adminView ? [] : fallbackCourses;
      }

      return adminView
        ? ((data as unknown as Course[]) ?? [])
        : ((data as Array<Partial<Course> & { created_at?: string; published_at?: string | null }>)?.map((course) => normalizePublicCourse(course)) ?? fallbackCourses);
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseData: CreateCourseData) => {
      const payload = {
        title: courseData.title,
        slug: courseData.slug,
        description: courseData.description,
        level: courseData.level,
        duration: courseData.duration,
        status: courseData.status,
        category_id: courseData.category_id ?? null,
        published_at: courseData.status === 'published' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('courses')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...courseData }: UpdateCourseData) => {
      const payload = {
        title: courseData.title,
        slug: courseData.slug,
        description: courseData.description,
        level: courseData.level,
        duration: courseData.duration,
        status: courseData.status,
        category_id: courseData.category_id ?? undefined,
        published_at: courseData.status === 'published' ? new Date().toISOString() : undefined,
      };

      const { data, error } = await supabase
        .from('courses')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
};
