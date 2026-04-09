import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'figcaption',
  'figure',
  'code',
  'pre',
  'hr',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'style'];
const ALLOWED_TEXT_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);

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
  const sanitized = DOMPurify.sanitize(content || '', {
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

  root.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    const safeStyle = getSafeInlineStyle(element.getAttribute('style') || '');
    if (!safeStyle) {
      element.removeAttribute('style');
      return;
    }

    element.setAttribute('style', safeStyle);
  });

  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer nofollow');
  });

  root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    if (!image.getAttribute('alt')) {
      image.setAttribute('alt', 'Imagem do artigo');
    }
  });

  return root.innerHTML;
}