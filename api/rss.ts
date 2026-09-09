const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://portal.vision7.pt').replace(/\/$/, '');
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

type FeedPost = {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  categories?: { name?: string | null } | null;
};

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const absoluteUrl = (value?: string | null) => {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : new URL(value.startsWith('/') ? value : `/${value}`, `${SITE_URL}/`).toString();
};

export default async function handler(_req: unknown, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
}) {
  let posts: FeedPost[] = [];
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const url = new URL(`${SUPABASE_URL}/rest/v1/posts`);
      url.searchParams.set('select', 'title,slug,excerpt,author_name,published_at,updated_at,image_url,banner_url,categories!posts_category_id_fkey(name)');
      url.searchParams.set('status', 'eq.published');
      url.searchParams.set('order', 'published_at.desc');
      url.searchParams.set('limit', '50');
      const response = await fetch(url.toString(), { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } });
      if (response.ok) posts = (await response.json()) as FeedPost[];
    } catch {
      // Return a valid empty feed if the database is temporarily unavailable.
    }
  }

  const items = posts.filter((post) => post.slug && post.title).map((post) => {
    const url = `${SITE_URL}/post/${encodeURIComponent(post.slug as string)}`;
    const image = absoluteUrl(post.banner_url || post.image_url);
    return `<item>
      <title>${escapeXml(post.title as string)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      ${post.published_at ? `<pubDate>${escapeXml(new Date(post.published_at).toUTCString())}</pubDate>` : ''}
      ${post.updated_at ? `<dc:date>${escapeXml(new Date(post.updated_at).toISOString())}</dc:date>` : ''}
      ${post.categories?.name ? `<category>${escapeXml(post.categories.name)}</category>` : ''}
      ${post.author_name ? `<dc:creator>${escapeXml(post.author_name)}</dc:creator>` : ''}
      ${image ? `<enclosure url="${escapeXml(image)}" type="image/*" />` : ''}
    </item>`;
  }).join('');

  const latestUpdate = posts
    .map((post) => post.updated_at || post.published_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Vision7 - Mídia Tech</title>
    <link>${SITE_URL}/</link>
    <description>Notícias, análises e conteúdos da Vision7.</description>
    <language>pt-BR</language>
    ${latestUpdate ? `<lastBuildDate>${escapeXml(new Date(latestUpdate).toUTCString())}</lastBuildDate>` : ''}
    ${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(body);
}