// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

const N8N_BASE_URL = (Deno.env.get('N8N_BASE_URL') ?? '').replace(/\/$/, '');
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed n8n API paths (whitelist to prevent abuse)
const ALLOWED_PATHS = [
  '/rest/workflows',
  '/rest/executions',
];

const isAllowedPath = (path: string): boolean => {
  return ALLOWED_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`)
  );
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!N8N_BASE_URL || !N8N_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'n8n not configured on server' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { path, method, body, query } = await req.json();

    if (!path || !isAllowedPath(path)) {
      return new Response(
        JSON.stringify({ error: 'Path not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the n8n URL
    const url = new URL(`${N8N_BASE_URL}${path}`);
    if (query && typeof query === 'object') {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Forward request to n8n with the API key (server-side only)
    const n8nResponse = await fetch(url.toString(), {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const responseData = await n8nResponse.text();

    return new Response(responseData, {
      status: n8nResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': n8nResponse.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Proxy error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
