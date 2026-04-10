import fs from 'node:fs';
import { getAvailableTemplates, renderEmailTemplate } from '../src/lib/email/index.ts';
import type { EmailTemplateData, EmailTemplateType } from '../src/lib/email/types.ts';

const SEND_INTERVAL_MS = 60_000;
const recipients = ['visionvidevgrid@proton.me', 'hvvctor@gmail.com'];
const origin = 'https://www.vision7.pt';

function loadEnv() {
  return Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key, rest.join('=').replace(/^"|"$/g, '')];
      }),
  );
}

function buildTemplateData(template: EmailTemplateType): EmailTemplateData[EmailTemplateType] {
  const now = new Date();

  switch (template) {
    case 'login_otp':
      return {
        code: `${Math.floor(100000 + Math.random() * 900000)}`,
        userName: 'Equipe Vision',
        expiresInMinutes: 10,
        ipAddress: '127.0.0.1',
        userAgent: 'Vision7 Template Audit',
      };
    case 'security_alert':
      return {
        alertType: 'new_login',
        userName: 'Equipe Vision',
        details: 'Validacao visual do template de alerta de seguranca do portal.',
        ipAddress: '127.0.0.1',
        timestamp: now.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }),
      };
    case 'welcome':
      return {
        userName: 'Equipe Vision',
        role: 'Administrador',
        dashboardUrl: `${origin}/admin/dashboard`,
      };
    case 'invite':
      return {
        inviterName: 'Vision VII',
        role: 'Editor',
        activationUrl: `${origin}/acesso/equipa?invite=template-audit`,
        expiresAt: now.toLocaleDateString('pt-PT'),
      };
    case 'newsletter_welcome':
      return {
        subscriberEmail: 'visionvidevgrid@proton.me',
        unsubscribeUrl: `${origin}/?unsubscribe=visionvidevgrid%40proton.me`,
      };
    case 'newsletter_digest':
      return {
        posts: [
          {
            title: 'Panorama da operacao editorial',
            excerpt: 'Resumo das automacoes, publicacoes e oportunidades de melhoria visual.',
            url: `${origin}/mundo`,
          },
          {
            title: 'Diretrizes de UX do portal',
            excerpt: 'Referencia para padrao visual e experiencia de leitura.',
            url: `${origin}/tecnologia`,
          },
        ],
        unsubscribeUrl: `${origin}/?unsubscribe=visionvidevgrid%40proton.me`,
      };
    case 'password_reset':
      return {
        resetUrl: `${origin}/acesso/redefinir?token=template-audit`,
        expiresInMinutes: 30,
        userName: 'Equipe Vision',
      };
    case 'role_change':
      return {
        userName: 'Equipe Vision',
        oldRole: 'Editor',
        newRole: 'Administrador',
        changedBy: 'Gestao Vision VII',
      };
    case 'account_deactivated':
      return {
        userName: 'Equipe Vision',
        reason: 'Auditoria visual de template em ambiente de desenvolvimento.',
        contactEmail: 'visionvidevgrid@proton.me',
      };
    case 'automation_post_ready':
      return {
        postTitle: 'Auditoria visual de templates do portal',
        postExcerpt: 'Conteudo de teste para validar apresentacao do email gerado pela automacao.',
        editorialScore: 91,
        reviewUrl: `${origin}/admin/dashboard?tab=automacoes`,
      };
  }
}

async function sendOne(url: string, anonKey: string, to: string, template: EmailTemplateType, subject: string, html: string) {
  const response = await fetch(`${url}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, html, template }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${text}`);
  }

  return text;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes no .env');
  }

  const templates = getAvailableTemplates();
  console.log(`[${new Date().toISOString()}] Iniciando auditoria de ${templates.length} templates para ${recipients.join(', ')}`);

  for (let index = 0; index < templates.length; index += 1) {
    const template = templates[index];
    const rendered = renderEmailTemplate(template.type, buildTemplateData(template.type));
    console.log(`\n[${new Date().toISOString()}] Template ${index + 1}/${templates.length}: ${template.type} | assunto: ${rendered.subject}`);

    for (const recipient of recipients) {
      try {
        const result = await sendOne(supabaseUrl, anonKey, recipient, template.type, rendered.subject, rendered.html);
        console.log(`[${new Date().toISOString()}] OK -> ${recipient} | ${result}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ERRO -> ${recipient} | ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (index < templates.length - 1) {
      console.log(`[${new Date().toISOString()}] Aguardando 60s para o proximo template...`);
      await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS));
    }
  }

  console.log(`\n[${new Date().toISOString()}] Auditoria concluida.`);
}

main().catch((error) => {
  console.error(`[${new Date().toISOString()}] Falha fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
