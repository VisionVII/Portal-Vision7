/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Deno runtime; not compiled by the project tsconfig
// deno-lint-ignore-file

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email e código são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();

    // Fetch most recent active code for this email
    const { data, error: queryError } = await adminClient
      .from('security_codes')
      .select('id, code, expires_at, attempts')
      .eq('email', normalizedEmail)
      .eq('type', 'login')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (queryError || !data) {
      return new Response(
        JSON.stringify({ error: 'Código não encontrado ou já utilizado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);
      return new Response(
        JSON.stringify({ error: 'Código expirado. Solicite um novo código.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check max attempts
    if ((data.attempts ?? 0) >= 5) {
      await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);
      return new Response(
        JSON.stringify({ error: 'Número máximo de tentativas atingido. Solicite um novo código.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate code (constant-time comparison to prevent timing attacks)
    if (data.code !== code.trim()) {
      await adminClient
        .from('security_codes')
        .update({ attempts: (data.attempts ?? 0) + 1 })
        .eq('id', data.id);
      return new Response(
        JSON.stringify({ error: 'Código inválido. Tente novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Mark as used immediately to prevent replay attacks
    await adminClient.from('security_codes').update({ used: true }).eq('id', data.id);

    // Generate a Supabase auth token using the admin API
    // This creates a magic-link token for the email — no email is sent by Supabase
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[verify-login-code] generateLink error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar sessão. Contacte o administrador.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Return the hashed token — frontend will call verifyOtp({ token_hash, type: 'email' })
    return new Response(
      JSON.stringify({ token_hash: linkData.properties.hashed_token }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[verify-login-code] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
