import type { EmailTemplateType, EmailTemplateData } from './types';

const BRAND_NAME = 'Vision VII';
const BRAND_COLOR = '#2563EB';
const BRAND_SECONDARY = '#0891B2';
const BRAND_DARK = '#020817';
const BRAND_URL = typeof window !== 'undefined' ? window.location.origin : 'https://vision-portal.pt';

/* ------------------------------------------------------------------ */
/*  Shared layout wrapper                                              */
/* ------------------------------------------------------------------ */
function wrapInLayout(title: string, bodyHtml: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="pt" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a { color: ${BRAND_COLOR}; text-decoration: none; }
    .code-block { font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: ${BRAND_COLOR}; background: #F0F4FF; border-radius: 12px; padding: 16px 28px; display: inline-block; border: 2px dashed ${BRAND_COLOR}40; }
    .btn-primary { display: inline-block; background: linear-gradient(135deg, ${BRAND_COLOR}, ${BRAND_SECONDARY}); color: #ffffff !important; font-weight: 600; padding: 14px 32px; border-radius: 10px; font-size: 15px; text-decoration: none; }
    .btn-primary:hover { opacity: 0.9; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .code-block { font-size: 24px !important; letter-spacing: 6px !important; padding: 12px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" width="580" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_DARK},#071d49);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">${BRAND_NAME}</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Portal de Informação</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                &copy; ${new Date().getFullYear()} ${BRAND_NAME}. Todos os direitos reservados.<br/>
                <a href="${BRAND_URL}/politica-privacidade" style="color:#64748b;">Política de Privacidade</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Template builders                                                  */
/* ------------------------------------------------------------------ */

function loginOtpTemplate(data: EmailTemplateData['login_otp']): { subject: string; html: string } {
  const greeting = data.userName ? `Olá, ${data.userName}` : 'Olá';
  const securityInfo = data.ipAddress
    ? `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">IP: ${data.ipAddress}${data.userAgent ? ` • ${data.userAgent}` : ''}</p>`
    : '';

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">${greeting}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      O seu código de acesso seguro ao painel <strong>${BRAND_NAME}</strong> é:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <span class="code-block">${data.code}</span>
    </div>
    <p style="margin:0;font-size:14px;color:#64748b;text-align:center;">
      Este código expira em <strong>${data.expiresInMinutes} minutos</strong>.<br/>
      Se não solicitou este código, ignore este email.
    </p>
    ${securityInfo}
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;"/>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      🔒 Nunca partilhe este código com ninguém. A equipa ${BRAND_NAME} nunca pedirá o seu código.
    </p>
  `;

  return {
    subject: `🔐 ${data.code} — Código de Acesso ${BRAND_NAME}`,
    html: wrapInLayout('Código de Acesso Seguro', body, `O seu código de acesso é ${data.code}. Válido por ${data.expiresInMinutes} minutos.`),
  };
}

function securityAlertTemplate(data: EmailTemplateData['security_alert']): { subject: string; html: string } {
  const alertLabels: Record<string, string> = {
    new_login: '🔑 Novo login detetado',
    failed_attempts: '⚠️ Tentativas falhadas de login',
    role_changed: '👤 Permissões alteradas',
    password_changed: '🔒 Palavra-passe alterada',
  };

  const alertTitle = alertLabels[data.alertType] || 'Alerta de Segurança';
  const greeting = data.userName ? `Olá, ${data.userName}` : 'Olá';

  const body = `
    <div style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:8px;padding:16px;margin-bottom:24px;">
      <h2 style="margin:0;font-size:16px;color:#991B1B;">${alertTitle}</h2>
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;">${greeting},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      ${data.details}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f8fafc;border-radius:8px;">
      <tr><td style="padding:12px 16px;font-size:13px;color:#64748b;">
        <strong>Data/Hora:</strong> ${data.timestamp}<br/>
        ${data.ipAddress ? `<strong>Endereço IP:</strong> ${data.ipAddress}` : ''}
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
      Se não reconhece esta atividade, por favor contacte imediatamente a administração.
    </p>
  `;

  return {
    subject: `${alertTitle} — ${BRAND_NAME}`,
    html: wrapInLayout('Alerta de Segurança', body, `${alertTitle}: ${data.details}`),
  };
}

function welcomeTemplate(data: EmailTemplateData['welcome']): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Bem-vindo(a), ${data.userName}! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      A sua conta no <strong>${BRAND_NAME}</strong> foi ativada com sucesso.
      ${data.role ? `O seu perfil de acesso é: <strong>${data.role}</strong>.` : ''}
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.dashboardUrl}" class="btn-primary">Aceder ao Painel</a>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Se tiver alguma questão, entre em contacto com o administrador do portal.
    </p>
  `;

  return {
    subject: `Bem-vindo(a) ao ${BRAND_NAME}! 🎉`,
    html: wrapInLayout('Bem-vindo ao Vision VII', body, `A sua conta no ${BRAND_NAME} está ativa.`),
  };
}

function inviteTemplate(data: EmailTemplateData['invite']): { subject: string; html: string } {
  const inviterText = data.inviterName ? ` por ${data.inviterName}` : '';

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Convite para a equipa ${BRAND_NAME}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Foi convidado(a)${inviterText} para integrar a equipa do portal como <strong>${data.role}</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.activationUrl}" class="btn-primary">Ativar a Minha Conta</a>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;text-align:center;">
      Este convite expira em ${data.expiresAt}.<br/>
      Se não esperava este convite, pode ignorar este email.
    </p>
  `;

  return {
    subject: `Convite para a equipa ${BRAND_NAME}`,
    html: wrapInLayout('Convite de Equipa', body, `Foi convidado(a) para integrar a equipa ${BRAND_NAME} como ${data.role}.`),
  };
}

function newsletterWelcomeTemplate(data: EmailTemplateData['newsletter_welcome']): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Subscrição confirmada! 📰</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      O email <strong>${data.subscriberEmail}</strong> foi adicionado à nossa newsletter.<br/>
      Receberá as principais notícias e atualizações diretamente na sua caixa de entrada.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${BRAND_URL}" class="btn-primary">Visitar o Portal</a>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
      Pode cancelar a subscrição a qualquer momento.<br/>
      <a href="${data.unsubscribeUrl}" style="color:#64748b;">Cancelar subscrição</a>
    </p>
  `;

  return {
    subject: `Bem-vindo(a) à Newsletter ${BRAND_NAME}! 📰`,
    html: wrapInLayout('Newsletter Confirmada', body, `A sua subscrição na newsletter ${BRAND_NAME} foi confirmada.`),
  };
}

function newsletterDigestTemplate(data: EmailTemplateData['newsletter_digest']): { subject: string; html: string } {
  const postsHtml = data.posts
    .map(
      (post) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${post.imageUrl ? `<td width="80" valign="top" style="padding-right:12px;"><img src="${post.imageUrl}" alt="" width="80" height="60" style="border-radius:8px;object-fit:cover;"/></td>` : ''}
              <td valign="top">
                <a href="${post.url}" style="font-size:15px;font-weight:600;color:#1e293b;text-decoration:none;">${post.title}</a>
                <p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${post.excerpt}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    )
    .join('');

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Destaques da Semana 📬</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">As notícias mais relevantes do ${BRAND_NAME} desta semana:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${postsHtml}
    </table>
    <div style="text-align:center;margin:28px 0 16px;">
      <a href="${BRAND_URL}" class="btn-primary">Ver Todas as Notícias</a>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
      <a href="${data.unsubscribeUrl}" style="color:#64748b;">Cancelar subscrição</a>
    </p>
  `;

  return {
    subject: `📬 Destaques da Semana — ${BRAND_NAME}`,
    html: wrapInLayout('Digest Semanal', body, `As melhores notícias da semana no ${BRAND_NAME}.`),
  };
}

function passwordResetTemplate(data: EmailTemplateData['password_reset']): { subject: string; html: string } {
  const greeting = data.userName ? `Olá, ${data.userName}` : 'Olá';

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">${greeting}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Recebemos um pedido para redefinir a palavra-passe da sua conta no <strong>${BRAND_NAME}</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.resetUrl}" class="btn-primary">Redefinir Palavra-passe</a>
    </div>
    <p style="margin:0;font-size:14px;color:#64748b;text-align:center;">
      Este link expira em <strong>${data.expiresInMinutes} minutos</strong>.<br/>
      Se não solicitou a redefinição, ignore este email.
    </p>
  `;

  return {
    subject: `Redefinir Palavra-passe — ${BRAND_NAME}`,
    html: wrapInLayout('Redefinir Palavra-passe', body, `Pedido de redefinição de palavra-passe para ${BRAND_NAME}.`),
  };
}

function roleChangeTemplate(data: EmailTemplateData['role_change']): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Permissões atualizadas</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;">Olá, ${data.userName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      As suas permissões no portal <strong>${BRAND_NAME}</strong> foram atualizadas por <strong>${data.changedBy}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f8fafc;border-radius:8px;">
      <tr><td style="padding:16px;font-size:14px;color:#475569;">
        <strong>Perfil anterior:</strong> ${data.oldRole}<br/>
        <strong>Novo perfil:</strong> <span style="color:${BRAND_COLOR};font-weight:600;">${data.newRole}</span>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
      Se não reconhece esta alteração, contacte a administração.
    </p>
  `;

  return {
    subject: `Permissões atualizadas — ${BRAND_NAME}`,
    html: wrapInLayout('Alteração de Permissões', body, `As suas permissões no ${BRAND_NAME} foram atualizadas.`),
  };
}

function accountDeactivatedTemplate(data: EmailTemplateData['account_deactivated']): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Conta desativada</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;">Olá, ${data.userName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      A sua conta no portal <strong>${BRAND_NAME}</strong> foi desativada.
      ${data.reason ? `<br/><strong>Motivo:</strong> ${data.reason}` : ''}
    </p>
    <p style="margin:0;font-size:14px;color:#64748b;">
      Para mais informações, contacte: <a href="mailto:${data.contactEmail}">${data.contactEmail}</a>
    </p>
  `;

  return {
    subject: `Conta desativada — ${BRAND_NAME}`,
    html: wrapInLayout('Conta Desativada', body, `A sua conta no ${BRAND_NAME} foi desativada.`),
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

type TemplateResult = { subject: string; html: string };

const templateBuilders: Record<EmailTemplateType, (data: never) => TemplateResult> = {
  login_otp: loginOtpTemplate as (data: never) => TemplateResult,
  security_alert: securityAlertTemplate as (data: never) => TemplateResult,
  welcome: welcomeTemplate as (data: never) => TemplateResult,
  invite: inviteTemplate as (data: never) => TemplateResult,
  newsletter_welcome: newsletterWelcomeTemplate as (data: never) => TemplateResult,
  newsletter_digest: newsletterDigestTemplate as (data: never) => TemplateResult,
  password_reset: passwordResetTemplate as (data: never) => TemplateResult,
  role_change: roleChangeTemplate as (data: never) => TemplateResult,
  account_deactivated: accountDeactivatedTemplate as (data: never) => TemplateResult,
};

/**
 * Renders an email template by type and returns the subject and full HTML.
 */
export function renderEmailTemplate<T extends EmailTemplateType>(
  template: T,
  data: EmailTemplateData[T],
): { subject: string; html: string } {
  const builder = templateBuilders[template];
  if (!builder) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return builder(data as never);
}

/**
 * Returns a list of all available template types with descriptions.
 */
export function getAvailableTemplates(): Array<{ type: EmailTemplateType; label: string; description: string }> {
  return [
    { type: 'login_otp', label: 'Código de Login', description: 'Código OTP de acesso seguro ao painel administrativo' },
    { type: 'security_alert', label: 'Alerta de Segurança', description: 'Notificação de atividade suspeita ou alterações de segurança' },
    { type: 'welcome', label: 'Boas-vindas', description: 'Email de boas-vindas após ativação de conta' },
    { type: 'invite', label: 'Convite', description: 'Convite para integrar a equipa do portal' },
    { type: 'newsletter_welcome', label: 'Newsletter - Confirmação', description: 'Confirmação de subscrição na newsletter' },
    { type: 'newsletter_digest', label: 'Newsletter - Digest', description: 'Resumo semanal das notícias mais relevantes' },
    { type: 'password_reset', label: 'Redefinir Palavra-passe', description: 'Link para redefinição de palavra-passe' },
    { type: 'role_change', label: 'Alteração de Perfil', description: 'Notificação de alteração de permissões' },
    { type: 'account_deactivated', label: 'Conta Desativada', description: 'Notificação de desativação de conta' },
  ];
}
