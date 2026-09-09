const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://portal.vision7.pt').replace(/\/$/, '');
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const DEFAULT_TITLE = 'Vision7 - Mídia Tech';
const DEFAULT_DESCRIPTION = 'Vision7 reúne notícias, análises e conteúdos premium sobre tecnologia, negócios, cultura, saúde e tendências globais.';
const DEFAULT_IMAGE = `${SITE_URL}/vision-logo-premium-default.webp`;

type PreviewPost = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  author_name?: string | null;
  tags?: string[] | null;
  categories?: { name?: string | null; slug?: string | null } | null;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toAbsoluteUrl = (value?: string | null) => {
  if (!value) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.startsWith('/') ? value : `/${value}`, `${SITE_URL}/`).toString();
};

const stripHtml = (value: string) => value
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>|<\/h[1-6]>|<\/li>|<\/blockquote>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const renderHtml = ({ title, description, url, image, publishedAt, modifiedAt, content, authorName, categoryName, categorySlug, tags }: { title: string; description: string; url: string; image: string; publishedAt?: string | null; modifiedAt?: string | null; content?: string | null; authorName?: string | null; categoryName?: string | null; categorySlug?: string | null; tags?: string[] | null }) => `<!DOCTYPE html>
<html lang="pt-PT">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />

    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:site_name" content="Vision7" />
    <meta property="og:locale" content="pt_PT" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:url" content="${escapeHtml(url)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(title)}" />

    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: title,
      description,
      url,
      image: [image],
      datePublished: publishedAt || undefined,
      dateModified: modifiedAt || publishedAt || undefined,
      author: { '@type': 'Person', name: authorName || 'Equipa Vision7' },
      articleSection: categoryName || undefined,
      keywords: tags?.length ? tags.join(', ') : undefined,
      inLanguage: 'pt-BR',
      wordCount: stripHtml(content || '').split(/\s+/).filter(Boolean).length || undefined,
      publisher: {
        '@type': 'Organization',
        name: 'Vision7',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/vision-logo-premium-default.webp` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    }).replace(/</g, '\\u003c')}</script>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
        ...(categoryName && categorySlug ? [{ '@type': 'ListItem', position: 2, name: categoryName, item: `${SITE_URL}/${encodeURIComponent(categorySlug)}` }] : []),
        { '@type': 'ListItem', position: categoryName && categorySlug ? 3 : 2, name: title, item: url },
      ],
    }).replace(/</g, '\\u003c')}</script>
  </head>
  <body>
    <main>
      <article>
        <header>
          <p>Vision7</p>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
          ${categoryName && categorySlug ? `<nav aria-label="Breadcrumb"><a href="${escapeHtml(SITE_URL)}">Início</a> / <a href="${escapeHtml(`${SITE_URL}/${encodeURIComponent(categorySlug)}`)}">${escapeHtml(categoryName)}</a> / ${escapeHtml(title)}</nav>` : ''}
          ${publishedAt ? `<time datetime="${escapeHtml(publishedAt)}">Publicado em ${escapeHtml(publishedAt)}</time>` : ''}
        </header>
        <div>${escapeHtml(stripHtml(content || description)).replace(/\n/g, '<br />')}</div>
      </article>
    </main>
  </body>
</html>`;

export default async function handler(req: { query?: Record<string, string | string[] | undefined> }, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
}) {
  const rawSlug = req.query?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const normalizedSlug = typeof slug === 'string' ? slug.trim() : '';
  const canonicalUrl = normalizedSlug ? `${SITE_URL}/post/${encodeURIComponent(normalizedSlug)}` : `${SITE_URL}/`;

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_IMAGE;
  let publishedAt: string | null = null;
  let modifiedAt: string | null = null;
  let content: string | null = null;
  let authorName: string | null = null;
  let categoryName: string | null = null;
  let categorySlug: string | null = null;
  let tags: string[] | null = null;

  if (normalizedSlug && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/posts`);
      url.searchParams.set('select', 'title,slug,excerpt,content,image_url,banner_url,status,published_at,updated_at,author_name,tags,categories(name,slug)');
      url.searchParams.set('slug', `eq.${normalizedSlug}`);
      url.searchParams.set('status', 'eq.published');
      url.searchParams.set('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = (await response.json()) as PreviewPost[];
        const post = data?.[0];

        if (post?.title) {
          title = `${post.title} | Vision7`;
          const rawExcerpt = post.excerpt?.trim() || DEFAULT_DESCRIPTION;
          // Social platforms (WhatsApp, LinkedIn, iMessage) ignore og:description > ~155 chars
          description = rawExcerpt.length > 155
            ? rawExcerpt.slice(0, rawExcerpt.lastIndexOf(' ', 152)) + '…'
            : rawExcerpt;
          const rawImage = post.banner_url || post.image_url;
          image = rawImage ? toAbsoluteUrl(rawImage) : DEFAULT_IMAGE;
          publishedAt = post.published_at || null;
          modifiedAt = post.updated_at || post.published_at || null;
          content = post.content || null;
          authorName = post.author_name || null;
          categoryName = post.categories?.name || null;
          categorySlug = post.categories?.slug || null;
          tags = post.tags || null;
        }
      }
    } catch {
      // Fallback to generic metadata when remote fetch fails.
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.setHeader('Vary', 'User-Agent');
  res.status(200).send(renderHtml({ title, description, url: canonicalUrl, image, publishedAt, modifiedAt, content, authorName, categoryName, categorySlug, tags }));
}
