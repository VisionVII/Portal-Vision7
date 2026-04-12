const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://www.vision7.pt').replace(/\/$/, '');
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const DEFAULT_TITLE = 'Vision7 - Portal Tecnologico';
const DEFAULT_DESCRIPTION = 'Vision7 reúne notícias, análises e conteúdos premium sobre tecnologia, negócios, cultura, saúde e tendências globais.';
const DEFAULT_IMAGE = `${SITE_URL}/vision-logo-premium-default.webp`;

type PreviewPost = {
  title?: string;
  slug?: string;
  excerpt?: string;
  image_url?: string | null;
  banner_url?: string | null;
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

const renderHtml = ({ title, description, url, image }: { title: string; description: string; url: string; image: string }) => `<!DOCTYPE html>
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

    <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}" />
  </head>
  <body>
    <script>window.location.replace(${JSON.stringify(url)});</script>
    <p>Redirecionando para <a href="${escapeHtml(url)}">${escapeHtml(title)}</a>...</p>
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

  if (normalizedSlug && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/posts`);
      url.searchParams.set('select', 'title,slug,excerpt,image_url,banner_url,status');
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
        }
      }
    } catch {
      // Fallback to generic metadata when remote fetch fails.
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.setHeader('Vary', 'User-Agent');
  res.status(200).send(renderHtml({ title, description, url: canonicalUrl, image }));
}
