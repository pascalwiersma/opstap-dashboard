import sanitizeHtml from 'sanitize-html'

const TOEGESTANE_TAGS = [
  'p', 'br',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'a',
  'strong', 'em', 'b', 'i',
]

export function sanitizeOmschrijving(html: string | null | undefined): string | null {
  if (!html) return null
  const schoon = sanitizeHtml(html, {
    allowedTags: TOEGESTANE_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          href: attribs.href ?? '',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  }).trim()
  const tekst = schoon.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  return tekst ? schoon : null
}
