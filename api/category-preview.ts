const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://portal.vision7.pt').replace(/\/$/, '');
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const DEFAULT_DESCRIPTION = 'Conteúdos editoriais da Vision7.';

type Category = { name?: string | null; slug?: string | null };
type CategoryPost = { title?: string; slug?: string; excerpt?: string | null; published_at?: string | null };

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderHtml = ({ slug, category, posts }: { slug: string; category: Category; posts: CategoryPost[] }) => {
  const title = `${category.name || slug} | Vision7`;
  const description = category.name ? `Notícias, análises e conteúdos de ${category.name} na Vision7.` : DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}/${encodeURIComponent(slug)}`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: category.name || slug, item: url },
    ],
  };
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    isPartOf: { '@type': 'WebSite', name: 'Vision7', url: `${SITE_URL}/` },
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <script type="application/ld+json">${JSON.stringify(collection).replace(/</g, '\\u003c')}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}</script>
  </head>
  <body>
    <main>
      <nav aria-label="Breadcrumb"><a href="${escapeHtml(`${SITE_URL}/`)}">Início</a> / ${escapeHtml(category.name || slug)}</nav>
      <h1>${escapeHtml(category.name || slug)}</h1>
      <p>${escapeHtml(description)}</p>
      <section aria-label="Artigos de ${escapeHtml(category.name || slug)}">
        ${posts.map((post) => `<article>
          <h2><a href="${escapeHtml(`${SITE_URL}/post/${encodeURIComponent(post.slug || '')}`)}">${escapeHtml(post.title || '')}</a></h2>
          <p>${escapeHtml(post.excerpt || '')}</p>
          ${post.published_at ? `<time datetime="${escapeHtml(post.published_at)}">${escapeHtml(post.published_at)}</time>` : ''}
        </article>`).join('')}
      </section>
    </main>
  </body>
</html>`;
};

export default async function handler(req: { query?: Record<string, string | string[] | undefined> }, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
}) {
  const rawSlug = req.query?.slug;
  const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug || '').trim();
  let category: Category = { name: slug, slug };
  let posts: CategoryPost[] = [];

  if (slug && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const categoryUrl = new URL(`${SUPABASE_URL}/rest/v1/categories`);
      categoryUrl.searchParams.set('select', 'name,slug');
      categoryUrl.searchParams.set('slug', `eq.${slug}`);
      categoryUrl.searchParams.set('limit', '1');
      const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' };
      const categoryResponse = await fetch(categoryUrl.toString(), { headers });
      if (categoryResponse.ok) category = ((await categoryResponse.json()) as Category[])[0] || category;

      const postsUrl = new URL(`${SUPABASE_URL}/rest/v1/posts`);
      postsUrl.searchParams.set('select', 'title,slug,excerpt,published_at,categories!posts_category_id_fkey!inner(slug)');
      postsUrl.searchParams.set('categories.slug', `eq.${slug}`);
      postsUrl.searchParams.set('status', 'eq.published');
      postsUrl.searchParams.set('order', 'published_at.desc');
      postsUrl.searchParams.set('limit', '50');
      const postsResponse = await fetch(postsUrl.toString(), { headers });
      if (postsResponse.ok) posts = (await postsResponse.json()) as CategoryPost[];
    } catch {
      // Return a crawlable fallback if Supabase is temporarily unavailable.
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.setHeader('Vary', 'User-Agent');
  res.status(200).send(renderHtml({ slug, category, posts }));
}
