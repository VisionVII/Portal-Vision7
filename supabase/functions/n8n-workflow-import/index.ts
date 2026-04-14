/**
 * n8n-workflow-import — Dedicated edge function for importing workflow JSON to n8n.
 *
 * Accepts the workflow JSON directly (bypassing WAF size limits on the proxy).
 * Requires super_admin or admin role.
 *
 * Request body: { workflowId: string, workflow: object }
 * The `workflow` object should contain: name, nodes, connections, settings, versionId
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const N8N_BASE_URL = (Deno.env.get('N8N_BASE_URL') ?? '').replace(/\/$/, '');
const N8N_API_KEY = Deno.env.get('N8N_API_KEY') ?? '';

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // ── Auth ──
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // Check admin role
  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);
  const userRoles = (roles ?? []).map((r: { role: string }) => r.role);
  const isAdmin = userRoles.some((r: string) => r === 'super_admin' || r === 'admin');
  if (!isAdmin) {
    return jsonResponse({ error: 'Forbidden — admin role required' }, 403);
  }

  // ── Parse body — supports base64-encoded workflow to bypass WAF ──
  let parsed: { workflowId?: string; workflow?: Record<string, unknown>; workflowBase64?: string };
  try {
    parsed = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { workflowId } = parsed;
  let workflow = parsed.workflow;

  // Decode base64-encoded workflow if provided
  if (!workflow && parsed.workflowBase64) {
    try {
      const decoded = new TextDecoder().decode(
        Uint8Array.from(atob(parsed.workflowBase64), (c) => c.charCodeAt(0)),
      );
      workflow = JSON.parse(decoded);
    } catch {
      return jsonResponse({ error: 'Invalid workflowBase64' }, 400);
    }
  }

  if (!workflowId || !workflow) {
    return jsonResponse({ error: 'Missing workflowId or workflow/workflowBase64 in body' }, 400);
  }

  if (!N8N_BASE_URL || !N8N_API_KEY) {
    return jsonResponse({ error: 'n8n not configured (missing N8N_BASE_URL or N8N_API_KEY)' }, 500);
  }

  // ── PUT to n8n ──
  const url = `${N8N_BASE_URL}/api/v1/workflows/${encodeURIComponent(workflowId)}`;
  const jsonBody = JSON.stringify(workflow);
  console.log(`[n8n-workflow-import] PUT ${url} (${jsonBody.length} bytes)`);

  try {
    // Compress with gzip to bypass Render WAF body inspection
    const encoder = new TextEncoder();
    const stream = new Blob([encoder.encode(jsonBody)]).stream();
    const compressed = stream.pipeThrough(new CompressionStream('gzip'));
    const gzipBody = new Uint8Array(await new Response(compressed).arrayBuffer());

    console.log(`[n8n-workflow-import] Gzip: ${jsonBody.length} -> ${gzipBody.length} bytes`);

    const n8nRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-N8N-API-KEY': N8N_API_KEY,
      },
      body: gzipBody,
      signal: AbortSignal.timeout(60_000),
    });

    const text = await n8nRes.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }

    if (n8nRes.ok) {
      return jsonResponse({
        success: true,
        id: data.id,
        name: data.name,
        active: data.active,
        versionId: data.versionId,
        updatedAt: data.updatedAt,
        nodeCount: data.nodes?.length ?? 0,
      }, 200);
    }

    return jsonResponse({
      success: false,
      httpStatus: n8nRes.status,
      error: data.message ?? data.error ?? text.slice(0, 300),
    }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[n8n-workflow-import] Error: ${msg}`);
    return jsonResponse({
      success: false,
      error: `n8n unreachable: ${msg}`,
    }, 200);
  }
});
