// Escape the five HTML-significant characters so user-supplied strings can be
// interpolated into HTML (e.g. email templates) without becoming markup.
const REPLACEMENTS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export default function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => REPLACEMENTS[ch])
}
