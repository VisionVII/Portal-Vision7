const DEFAULT_KEEPALIVE_URL = 'https://n8n-vision7.onrender.com/healthz';

type ServerlessResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    send: (body: string) => void;
  };
};

function resolveKeepAliveUrl() {
  const explicit = (process.env.N8N_KEEPALIVE_URL || '').trim();
  if (explicit) {
    try {
      return new URL(explicit).toString().replace(/\/$/, '');
    } catch {
      return DEFAULT_KEEPALIVE_URL;
    }
  }

  const baseUrl = (process.env.N8N_BASE_URL || '').trim();
  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      const basePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
      url.pathname = `${basePath}/healthz`;
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch {
      // Fall through to the default public health endpoint.
    }
  }

  return DEFAULT_KEEPALIVE_URL;
}

function buildHealthUrlVariants(healthUrl: string): string[] {
  const normalized = healthUrl.replace(/\/$/, '');
  const variants = new Set<string>([normalized]);

  try {
    const parsed = new URL(normalized);
    const basePath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    const alternate = new URL(parsed.toString());
    if (basePath.endsWith('/n8n/healthz')) {
      alternate.pathname = basePath.replace(/\/n8n\/healthz$/, '/healthz');
    } else if (basePath.endsWith('/healthz')) {
      alternate.pathname = basePath.replace(/\/healthz$/, '/n8n/healthz');
    } else if (basePath.endsWith('/n8n')) {
      alternate.pathname = `${basePath}/healthz`;
    } else {
      alternate.pathname = `${basePath.replace(/\/$/, '')}/n8n/healthz`;
    }
    alternate.search = '';
    alternate.hash = '';
    variants.add(alternate.toString().replace(/\/$/, ''));
  } catch {
    // keep the normalized URL only
  }

  return [...variants];
}

export default async function handler(
  req: { method?: string },
  res: ServerlessResponse,
) {
  const method = (req.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'POST'].includes(method)) {
    res.setHeader('Allow', 'GET, HEAD, POST');
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  const keepAliveUrl = resolveKeepAliveUrl();
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const candidates = buildHealthUrlVariants(keepAliveUrl);
  let lastStatus = 0;
  let lastText = '';

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: 'GET',
        headers: {
          'User-Agent': 'Vision7-KeepAlive/1.0',
          Accept: 'text/plain, */*',
        },
      });

      lastStatus = response.status;
      lastText = await response.clone().text().catch(() => '');

      if (response.ok || ![404, 405, 501, 502, 503].includes(response.status)) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.status(response.ok ? 200 : 502).json({
          ok: response.ok,
          target: new URL(candidate).origin,
          status: response.status,
          elapsedMs: Date.now() - startedAt,
          checkedAt,
        });
        return;
      }
    } catch (error) {
      lastText = error instanceof Error ? error.message : 'Unknown keepalive error';
    }
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(500).json({
    ok: false,
    target: new URL(keepAliveUrl).origin,
    status: lastStatus || undefined,
    elapsedMs: Date.now() - startedAt,
    checkedAt,
    message: lastText || 'Unknown keepalive error',
  });
}