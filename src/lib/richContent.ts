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

  // Handle links
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    const linkStatus = anchor.getAttribute('data-link-status');

    // Newsletter links → intercept with popup
    if (/\/newsletter|#newsletter|#subscribe/i.test(href) || /assine|subscreva|newsletter/i.test(anchor.textContent ?? '')) {
      anchor.setAttribute('href', '#newsletter');
      anchor.setAttribute('class', (anchor.getAttribute('class') ?? '') + ' newsletter-trigger');
      anchor.removeAttribute('target');
      return;
    }

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

  // Wrap tables in a scrollable container for mobile
  root.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList.contains('table-scroll')) return;
    const wrapper = parsed.createElement('div');
    wrapper.setAttribute('class', 'table-scroll');
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  return root.innerHTML;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);
}

export function processArticleToc(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return html;

  // Find <h2>Neste Artigo</h2>
  let tocH2: Element | null = null;
  for (const h2 of root.querySelectorAll('h2')) {
    if (/^neste artigo$/i.test(h2.textContent?.trim() ?? '')) {
      tocH2 = h2;
      break;
    }
  }
  if (!tocH2) return html;

  // Collect ToC items from following <p> elements (until <hr> or non-<p>)
  const tocItems: string[] = [];
  const nodesToRemove: Element[] = [tocH2];
  let sibling = tocH2.nextElementSibling;

  while (sibling && sibling.tagName === 'P') {
    const text = sibling.textContent ?? '';
    if (text.includes('→')) {
      // Single <p> with newline-separated items OR each on its own <p>
      text.split(/\n/).forEach((line) => {
        const clean = line.replace(/^→\s*/, '').trim();
        if (clean) tocItems.push(clean);
      });
    } else if (text.trim()) {
      tocItems.push(text.trim()); // subtitle line without arrow
    }
    nodesToRemove.push(sibling);
    sibling = sibling.nextElementSibling;
  }

  if (tocItems.length === 0) return html;

  // Add id to all body <h2> except the ToC header itself
  root.querySelectorAll('h2').forEach((h2) => {
    if (/^neste artigo$/i.test(h2.textContent?.trim() ?? '')) return;
    const id = slugify(h2.textContent?.trim() ?? '');
    if (id) h2.setAttribute('id', id);
  });

  // Build <nav>
  const nav = doc.createElement('nav');
  nav.setAttribute('class', 'toc-block not-prose mb-6 rounded-2xl border border-border/40 bg-muted/30 px-5 py-4');

  const titleEl = doc.createElement('p');
  titleEl.setAttribute('class', 'mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground');
  titleEl.textContent = 'Neste Artigo';
  nav.appendChild(titleEl);

  const ul = doc.createElement('ul');
  ul.setAttribute('class', 'space-y-2');

  tocItems.forEach((item) => {
    const slug = slugify(item);
    const li = doc.createElement('li');
    const a = doc.createElement('a');
    a.setAttribute('href', `#${slug}`);
    a.setAttribute('class', 'toc-link group flex items-start gap-2 text-sm text-foreground/75 no-underline transition-colors hover:text-primary');
    a.innerHTML = `<span class="mt-0.5 shrink-0 text-primary/50 transition-colors group-hover:text-primary">→</span><span>${item}</span>`;
    li.appendChild(a);
    ul.appendChild(li);
  });

  nav.appendChild(ul);

  // Insert nav before the old ToC block, then remove old elements
  nodesToRemove[0].parentNode?.insertBefore(nav, nodesToRemove[0]);
  nodesToRemove.forEach((n) => n.remove());

  return root.innerHTML;
}
