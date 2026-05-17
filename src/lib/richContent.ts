import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Configure marked: GFM (tabelas, code fences, strikethrough) + quebras de linha suaves
marked.setOptions({ gfm: true, breaks: false });

function isMarkdown(content: string): boolean {
  // Detects markdown by presence of common markdown patterns
  return /^#{1,6}\s|^\s*[-*+]\s|\*\*|__|\[.+\]\(.+\)|^\|.+\|/m.test(content);
}

function markdownToHtml(content: string): string {
  const result = marked(content);
  return typeof result === 'string' ? result : content;
}

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote',
  'a', 'span',
  'img', 'figcaption', 'figure',
  'code', 'pre',
  'hr',
  'nav',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'details', 'summary',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'target', 'rel',
  'class', 'style', 'id',
  // Link graph: status de links internos pendentes
  'data-link-status',
];

const ALLOWED_TEXT_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);

// Domínio público do portal — links para este domínio são internos
const PORTAL_HOSTS = new Set([
  'vision7.pt',
  'www.vision7.pt',
  'portal.vision7.pt',
  'localhost',
  '127.0.0.1',
]);

function isInternalHref(href: string): boolean {
  if (href.startsWith('/')) return true;
  try {
    const url = new URL(href);
    return PORTAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function getSafeInlineStyle(styleValue: string) {
  const declarations = styleValue
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  const safeRules = declarations
    .map((declaration) => {
      const [property, rawValue] = declaration.split(':').map((part) => part?.trim() ?? '');
      if (property !== 'text-align') return null;

      const normalizedValue = rawValue.toLowerCase();
      if (!ALLOWED_TEXT_ALIGNMENTS.has(normalizedValue)) return null;

      return `text-align: ${normalizedValue}`;
    })
    .filter((value): value is string => Boolean(value));

  return safeRules.join('; ');
}

export function sanitizeRichContent(content: string) {
  const raw = content || '';
  // Auto-convert Markdown → HTML before sanitizing
  const html = isMarkdown(raw) ? markdownToHtml(raw) : raw;
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]*(?:[^a-z+.-:]|$))/i,
  });

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return sanitized;
  }

  const parsed = new DOMParser().parseFromString(`<div>${sanitized}</div>`, 'text/html');
  const root = parsed.body.firstElementChild;

  if (!root) {
    return sanitized;
  }

  // Sanitize inline styles (allow only text-align)
  root.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const safeStyle = getSafeInlineStyle(element.getAttribute('style') || '');
    if (!safeStyle) {
      element.removeAttribute('style');
      return;
    }
    element.setAttribute('style', safeStyle);
  });

  // Handle links:
  // - Links pendentes (artigo ainda não publicado): converter para <span> não clicável
  // - Links externos: abrir em nova tab com rel correcto
  // - Links internos válidos: manter como <a> sem _blank (navegação SPA via href)
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    const linkStatus = anchor.getAttribute('data-link-status');

    if (linkStatus === 'pending') {
      // Converter link pendente num <span> visual com tooltip — nunca navega
      const span = parsed.createElement('span');
      span.setAttribute('class', 'internal-link-pending');
      span.setAttribute('title', 'Artigo relacionado em preparação — disponível em breve');
      span.setAttribute('aria-label', 'Artigo em preparação');
      span.innerHTML = anchor.innerHTML;
      anchor.replaceWith(span);
      return;
    }

    if (isInternalHref(href)) {
      // Link interno válido: não abre nova tab, SPA router intercepta o click
      anchor.removeAttribute('target');
      anchor.setAttribute('rel', 'noopener');
    } else {
      // Link externo: nova tab + segurança
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });

  // Alt text padrão em imagens sem alt
  root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    if (!image.getAttribute('alt')) {
      image.setAttribute('alt', 'Imagem do artigo');
    }
  });

  return root.innerHTML;
}
