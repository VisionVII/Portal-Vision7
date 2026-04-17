const DEFAULT_KEEPALIVE_URL = 'https://portal-vision7.onrender.com/healthz';

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

  try {
    const response = await fetch(keepAliveUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Vision7-KeepAlive/1.0',
        Accept: 'text/plain, */*',
      },
    });

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      target: new URL(keepAliveUrl).origin,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      checkedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown keepalive error';
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(500).json({
      ok: false,
      target: new URL(keepAliveUrl).origin,
      elapsedMs: Date.now() - startedAt,
      checkedAt,
      message,
    });
  }
}