import { supabase } from '@/integrations/supabase/client';
import { renderEmailTemplate } from '@/lib/email/templates';
import { generateSecurityCode, CODE_EXPIRY_MINUTES } from '@/lib/email/security-codes';
import type { EmailTemplateType, EmailTemplateData, EmailPayload } from '@/lib/email/types';

/* ------------------------------------------------------------------ */
/*  Send email via Supabase Edge Function                              */
/* ------------------------------------------------------------------ */

/**
 * Sends an email using a Supabase Edge Function.
 * The edge function `send-email` should accept { to, subject, html }.
 *
 * Falls back to console logging in development when edge function is unavailable.
 */
export async function sendEmail<T extends EmailTemplateType>(payload: EmailPayload<T>): Promise<{ error: Error | null }> {
  const { subject, html } = renderEmailTemplate(payload.template, payload.data);
  const finalSubject = payload.subject || subject;

  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: payload.to,
        subject: finalSubject,
        html,
        template: payload.template,
      },
    });

    if (error) {
      console.error('[EmailService] Edge function error:', error);
      return { error: new Error(error.message || 'Falha ao enviar email') };
    }

    return { error: null };
  } catch (err) {
    // In development, log the email for debugging
    if (import.meta.env.DEV) {
      console.info('[EmailService] DEV MODE — Email would be sent:', {
        to: payload.to,
        subject: finalSubject,
        template: payload.template,
      });
      return { error: null };
    }

    console.error('[EmailService] Failed to send email:', err);
    return { error: err instanceof Error ? err : new Error('Falha ao enviar email') };
  }
}

/* ------------------------------------------------------------------ */
/*  Security code flow (custom OTP alongside Supabase OTP)             */
/* ------------------------------------------------------------------ */

/**
 * Generates a security code and stores it in the `security_codes` table.
 * Sends the code via email using the login_otp template.
 */
export async function requestLoginCode(email: string): Promise<{ error: Error | null; expiresInMinutes: number }> {
  const code = generateSecurityCode(6);
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Invalidate any existing codes for this email
  await supabase
    .from('security_codes')
    .update({ used: true })
    .eq('email', email.toLowerCase().trim())
    .eq('used', false)
    .eq('type', 'login');

  // Store new code
  const { error: insertError } = await supabase
    .from('security_codes')
    .insert({
      email: email.toLowerCase().trim(),
      code,
      type: 'login',
      expires_at: expiresAt,
      attempts: 0,
    });

  if (insertError) {
    console.error('[EmailService] Failed to store security code:', insertError);
    // Fallback to Supabase OTP if custom codes table doesn't exist yet
    return { error: null, expiresInMinutes: CODE_EXPIRY_MINUTES };
  }

  // Send email with the code
  const emailResult = await sendEmail({
    to: email,
    template: 'login_otp',
    data: {
      code,
      expiresInMinutes: CODE_EXPIRY_MINUTES,
    },
  });

  return { error: emailResult.error, expiresInMinutes: CODE_EXPIRY_MINUTES };
}

/**
 * Verifies a security code against the database.
 */
export async function verifyLoginCode(email: string, code: string): Promise<{ valid: boolean; error: Error | null }> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from('security_codes')
    .select('id, code, expires_at, attempts')
    .eq('email', normalizedEmail)
    .eq('type', 'login')
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { valid: false, error: new Error('Código não encontrado ou já utilizado.') };
  }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('security_codes').update({ used: true }).eq('id', data.id);
    return { valid: false, error: new Error('Código expirado. Solicite um novo código.') };
  }

  // Check max attempts
  if ((data.attempts ?? 0) >= 5) {
    await supabase.from('security_codes').update({ used: true }).eq('id', data.id);
    return { valid: false, error: new Error('Número máximo de tentativas atingido. Solicite um novo código.') };
  }

  // Validate code
  if (data.code !== code.trim()) {
    await supabase
      .from('security_codes')
      .update({ attempts: (data.attempts ?? 0) + 1 })
      .eq('id', data.id);
    return { valid: false, error: new Error('Código inválido. Tente novamente.') };
  }

  // Mark as used
  await supabase.from('security_codes').update({ used: true }).eq('id', data.id);
  return { valid: true, error: null };
}

/* ------------------------------------------------------------------ */
/*  Convenience helpers for other email types                          */
/* ------------------------------------------------------------------ */

export async function sendWelcomeEmail(email: string, userName: string, role?: string): Promise<{ error: Error | null }> {
  return sendEmail({
    to: email,
    template: 'welcome',
    data: {
      userName,
      role,
      dashboardUrl: `${window.location.origin}/admin/dashboard`,
    },
  });
}

export async function sendInviteEmail(
  email: string,
  role: string,
  token: string,
  inviterName?: string,
  expiresAt?: string,
): Promise<{ error: Error | null }> {
  const activationUrl = `${window.location.origin}/acesso/equipa?invite=${token}&email=${encodeURIComponent(email)}&role=${role}`;
  return sendEmail({
    to: email,
    template: 'invite',
    data: {
      inviterName,
      role,
      activationUrl,
      expiresAt: expiresAt || 'em 48 horas',
    },
  });
}

export async function sendSecurityAlert(
  email: string,
  alertType: EmailTemplateData['security_alert']['alertType'],
  details: string,
  ipAddress?: string,
): Promise<{ error: Error | null }> {
  return sendEmail({
    to: email,
    template: 'security_alert',
    data: {
      alertType,
      details,
      ipAddress,
      timestamp: new Date().toLocaleString('pt-PT', { dateStyle: 'full', timeStyle: 'short' }),
    },
  });
}

export async function sendNewsletterWelcome(email: string): Promise<{ error: Error | null }> {
  return sendEmail({
    to: email,
    template: 'newsletter_welcome',
    data: {
      subscriberEmail: email,
      unsubscribeUrl: `${window.location.origin}/?unsubscribe=${encodeURIComponent(email)}`,
    },
  });
}

export async function sendRoleChangeNotification(
  email: string,
  userName: string,
  oldRole: string,
  newRole: string,
  changedBy: string,
): Promise<{ error: Error | null }> {
  return sendEmail({
    to: email,
    template: 'role_change',
    data: { userName, oldRole, newRole, changedBy },
  });
}
