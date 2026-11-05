const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BR',
  'CODE',
  'DIV',
  'EM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'I',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'SPAN',
  'STRONG',
  'U',
  'UL',
]);

const ALLOWED_ATTRIBUTES = new Set(['href', 'target', 'rel']);

export function sanitizeHtml(input: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return input.replace(/<[^>]*>/g, '');
  }

  const document = new DOMParser().parseFromString(input, 'text/html');
  document.querySelectorAll('script, style, iframe, object, embed, link, meta, svg, math').forEach((node) => {
    node.remove();
  });

  document.body.querySelectorAll('*').forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const isSafeHref =
        (name === 'href' && /^(https?:|mailto:|#)/i.test(value)) ||
        (name === 'target' && value === '_blank') ||
        (name === 'rel' && value === 'noopener noreferrer');
      if (!ALLOWED_ATTRIBUTES.has(name) || (name === 'href' && !isSafeHref)) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === 'A' && element.getAttribute('target') === '_blank') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return document.body.innerHTML;
}
