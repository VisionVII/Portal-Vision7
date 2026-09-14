const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://portal.vision7.pt').replace(/\/$/, '');
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const staticUrls = [
  ['/', 'daily', '1.0'],
  ['/todas', 'daily', '0.8'],
  ['/tecnologia', 'daily', '0.8'],
  ['/desporto', 'daily', '0.8'],
  ['/musica', 'daily', '0.8'],
  ['/saude', 'daily', '0.8'],
  ['/mundo', 'daily', '0.8'],
  ['/sobre', 'monthly', '0.4'],
  ['/contacto', 'monthly', '0.4'],
  ['/politica-privacidade', 'monthly', '0.3'],
] as const;

type SitemapPost = { slug: string; updated_at?: string | null; published_at?: string | null };
type SitemapCategory = { slug: string; created_at?: string | null };
type SitemapCourse = { slug: string; updated_at?: string | null; published_at?: string | null };

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const renderUrl = (path: string, changefreq: string, priority: string, lastmod?: string | null) => `
  <url>
    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${lastmod ? `
    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

export default async function handler(_req: unknown, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
}) {
  const urlEntries = new Map<string, string>();
  const addUrl = (path: string, changefreq: string, priority: string, lastmod?: string | null) => {
    // Deduplicate by canonical URL path rather than rendered XML. The same
    // route may be returned by the static list and the categories table with
    // different lastmod values.
    if (!urlEntries.has(path)) urlEntries.set(path, renderUrl(path, changefreq, priority, lastmod));
  };

  staticUrls.forEach(([path, changefreq, priority]) => addUrl(path, changefreq, priority));
  let posts: SitemapPost[] = [];
  let categories: SitemapCategory[] = [];
  let courses: SitemapCourse[] = [];

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/posts`);
      url.searchParams.set('select', 'slug,updated_at,published_at');
      url.searchParams.set('status', 'eq.published');
      url.searchParams.set('order', 'published_at.desc');
      url.searchParams.set('limit', '1000');
      const response = await fetch(url.toString(), {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' },
      });
      if (response.ok) posts = (await response.json()) as SitemapPost[];
    } catch {
      // Keep public static URLs available if Supabase is temporarily unavailable.
    }

    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/categories`);
      url.searchParams.set('select', 'slug,created_at');
      url.searchParams.set('order', 'slug.asc');
      const response = await fetch(url.toString(), {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' },
      });
      if (response.ok) categories = (await response.json()) as SitemapCategory[];
    } catch {
      // Categories are optional; static known routes remain available.
    }

    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/courses`);
      url.searchParams.set('select', 'slug,updated_at,published_at');
      url.searchParams.set('status', 'eq.published');
      url.searchParams.set('order', 'published_at.desc');
      url.searchParams.set('limit', '1000');
      const response = await fetch(url.toString(), {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' },
      });
      if (response.ok) courses = (await response.json()) as SitemapCourse[];
    } catch {
      // Courses are optional and do not affect article discovery.
    }
  }

  categories
    .filter((category) => category.slug && staticUrls.some(([path]) => path === `/${category.slug}`))
    .forEach((category) => addUrl(`/${encodeURIComponent(category.slug)}`, 'daily', '0.8', category.created_at));
  posts
    .filter((post) => post.slug)
    .forEach((post) => addUrl(`/post/${encodeURIComponent(post.slug)}`, 'weekly', '0.7', post.updated_at || post.published_at));
  courses
    .filter((course) => course.slug)
    .forEach((course) => addUrl(`/curso/${encodeURIComponent(course.slug)}`, 'weekly', '0.5', course.updated_at || course.published_at));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...urlEntries.values()].join('')}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(body);
}
