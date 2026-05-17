/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://portal.vision7.pt';

const VALID_ROLES = ['super_admin', 'admin', 'editor', 'redator', 'moderador', 'analyst'];

const fallbackAllowedOrigins = [
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  DEFAULT_SITE_URL,
  'https://portal.vision7.pt',
];

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (fallbackAllowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/[\w-]+\.github\.dev$/.test(origin)) return true;
  return false;
}

function buildCorsHeaders(origin: string): HeadersInit {
  const allowedOrigin = isOriginAllowed(origin) ? origin : fallbackAllowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')?.trim() ?? '';
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405, corsHeaders);
  }

  try {
    const { user_id, email, role } = await req.json();

    if (!user_id || !email || !role) {
      return jsonResponse({ error: 'user_id, email e role são obrigatórios.' }, 400, corsHeaders);
    }

    if (!VALID_ROLES.includes(role)) {
      return jsonResponse({ error: `Role inválido: ${role}` }, 400, corsHeaders);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify that an invite code was used for this email (security check)
    const { data: usedCode } = await adminClient
      .from('security_codes')
      .select('id, metadata')
      .eq('email', email.toLowerCase().trim())
      .eq('type', 'invite')
      .eq('used', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!usedCode) {
      console.error(`[assign-invite-role] No used invite code found for ${email}`);
      return jsonResponse({ error: 'Nenhum convite válido encontrado para este email.' }, 403, corsHeaders);
    }

    const inviteRole = (usedCode.metadata as { role?: string })?.role ?? role;

    // Auto-confirm email since user was invited via verified security code
    const { error: confirmError } = await adminClient.auth.admin.updateUserById(user_id, {
      email_confirm: true,
    });
    if (confirmError) {
      console.warn('[assign-invite-role] Could not auto-confirm email:', confirmError.message);
    }

    // Insert role into user_roles
    const { error: roleError } = await adminClient.from('user_roles').insert({
      user_id,
      role: inviteRole,
      is_active: true,
      reason: 'invite_registration',
    });

    if (roleError) {
      // Check if already assigned
      if (roleError.code === '23505') {
        console.log(`[assign-invite-role] Role ${inviteRole} already assigned to ${user_id}`);
        return jsonResponse({ success: true, message: 'Role já atribuído.' }, 200, corsHeaders);
      }
      console.error('[assign-invite-role] Role insert error:', roleError);
      return jsonResponse({ error: 'Erro ao atribuir role.' }, 500, corsHeaders);
    }

    // Create user_profile if not exists
    await adminClient.from('user_profiles').upsert({
      id: user_id,
      display_name: email.split('@')[0],
      is_active: true,
    }, { onConflict: 'id' });

    // Update registration_invites status if exists
    await adminClient
      .from('registration_invites')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('email', email.toLowerCase().trim())
      .neq('status', 'used');

    console.log(`[assign-invite-role] Assigned role ${inviteRole} to user ${user_id} (${email})`);

    return jsonResponse({ success: true, role: inviteRole }, 200, corsHeaders);
  } catch (err) {
    console.error('[assign-invite-role] Error:', err);
    return jsonResponse({ error: 'Erro interno do servidor.' }, 500, corsHeaders);
  }
});
