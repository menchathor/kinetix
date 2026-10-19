// Utilidades de seguridad para plantillas HTML.
// Todos los datos que provienen del usuario, de un backup o de la nube
// deben pasar por escapeHtml/escapeAttr antes de interpolarse en un template.

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

// Para atributos usamos el mismo conjunto: cubre comillas simples y dobles.
export const escapeAttr = escapeHtml;

// Sólo permite URLs http(s), relativas o data:image. Evita javascript: y
// otros esquemas peligrosos en atributos src/href.
export function safeUrl(value, fallback = '') {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const url = value.trim();

  // Bloquea protocol-relative y cualquier esquema que no sea http(s) o data:image.
  if (url.startsWith('//')) return fallback;
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme) {
    const protocol = scheme[1].toLowerCase();
    if (protocol !== 'http' && protocol !== 'https' && protocol !== 'data') return fallback;
    if (protocol === 'data' && !/^data:image\//i.test(url)) return fallback;
  }

  return escapeAttr(url);
}

export function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}
