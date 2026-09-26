/**
 * Tree Poster — a self-contained SVG of the whole family tree for printing
 * (wedding and reunion posters) and sharing (PNG for WhatsApp).
 *
 * Uses the same layout engine as the canvas, always fully expanded, and draws
 * simple, print-friendly cards: name, years, and a gender-toned avatar.
 */

import { computeTreeLayout, NODE_WIDTH, NODE_HEIGHT } from '../engine/treeLayout.js';

const THEMES = {
  light: {
    background: '#FBF8F3',
    card: '#FFFFFF',
    cardBorder: '#D8D2C8',
    name: '#1F2430',
    meta: '#6B6F78',
    line: '#9A9486',
    title: '#1F2430',
    accent: '#E56515',
    male: '#7C858E',
    female: '#C98467',
    other: '#8A9099',
  },
  dark: {
    background: '#0B1018',
    card: '#1B2633',
    cardBorder: '#35404E',
    name: '#F5F7FA',
    meta: '#AAB5C0',
    line: '#5A6573',
    title: '#F5F7FA',
    accent: '#FBA45C',
    male: '#6D747C',
    female: '#B4472F',
    other: '#737B84',
  },
};

export const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Split a name into at most two lines of roughly `max` characters. */
export function wrapName(name, max = 20) {
  const words = String(name || '').split(/\s+/).filter(Boolean);
  const lines = [''];
  words.forEach((word) => {
    const current = lines[lines.length - 1];
    if (!current) lines[lines.length - 1] = word;
    else if ((current + ' ' + word).length <= max) lines[lines.length - 1] = `${current} ${word}`;
    else lines.push(word);
  });
  if (lines.length > 2) {
    const rest = lines.slice(1).join(' ');
    return [lines[0], rest.length > max ? `${rest.slice(0, max - 1)}…` : rest];
  }
  return lines;
}

const initials = (p) =>
  [p.firstName, p.lastName]
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || (p.displayName || '?').slice(0, 2).toUpperCase();

function years(p) {
  const by = p.dateOfBirth ? String(p.dateOfBirth).slice(0, 4) : '';
  const dy = p.dateOfDeath ? String(p.dateOfDeath).slice(0, 4) : '';
  if (by && dy) return `${by} – ${dy}`;
  if (by) return p.livingStatus === 'deceased' ? `${by} – ` : `b. ${by}`;
  if (dy) return `d. ${dy}`;
  // Common Indian-English honorific for someone who has passed away.
  return p.livingStatus === 'deceased' ? 'Late' : '';
}

/**
 * @param {{ people: Array, relationships: Array, siblingOrder?: Object }} family
 * @param {{ title?: string, subtitle?: string, theme?: 'light'|'dark', showYears?: boolean, showPlaces?: boolean }} [options]
 * @returns {{ svg: string, width: number, height: number, count: number }}
 */
export function buildTreePosterSvg(family, options = {}) {
  const { title = 'Our Family Tree', subtitle = '', theme = 'light', showYears = true, showPlaces = false } = options;
  const t = THEMES[theme] || THEMES.light;
  const layout = computeTreeLayout(family.people || [], family.relationships || [], {
    customSiblingOrders: family.siblingOrder || {},
  });

  const margin = 80;
  const header = subtitle ? 180 : 140;
  const footer = 50;
  const { minX, minY, width: treeWidth, height: treeHeight } = layout.bounds;
  const width = Math.round(Math.max(treeWidth, 900) + margin * 2);
  const height = Math.round(treeHeight + header + footer + margin);
  const offsetX = margin - minX + (Math.max(treeWidth, 900) - treeWidth) / 2;
  const offsetY = header - minY;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Georgia, 'Times New Roman', serif">`
  );
  parts.push(`<rect width="100%" height="100%" fill="${t.background}"/>`);
  parts.push(
    `<text x="${width / 2}" y="${margin * 0.9}" text-anchor="middle" font-size="44" font-weight="700" fill="${t.title}">${escapeXml(title)}</text>`
  );
  if (subtitle) {
    parts.push(
      `<text x="${width / 2}" y="${margin * 0.9 + 40}" text-anchor="middle" font-size="20" fill="${t.meta}" font-family="Helvetica, Arial, sans-serif">${escapeXml(subtitle)}</text>`
    );
  }
  const accentY = subtitle ? margin * 0.9 + 64 : margin * 0.9 + 26;
  parts.push(`<rect x="${width / 2 - 40}" y="${accentY}" width="80" height="3" rx="1.5" fill="${t.accent}"/>`);

  parts.push(`<g transform="translate(${offsetX} ${offsetY})" fill="none" stroke="${t.line}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">`);
  layout.lines.forEach((line) => {
    const dash = line.crossFamily || line.type === 'sibling' ? ' stroke-dasharray="8 6"' : '';
    parts.push(`<path d="${line.path}"${dash}/>`);
    if (line.type === 'spouse') {
      parts.push(`<circle cx="${line.midX}" cy="${line.midY}" r="5" fill="${t.background}" stroke="${t.accent}" stroke-width="2"/>`);
    }
  });
  parts.push('</g>');

  parts.push(`<g transform="translate(${offsetX} ${offsetY})" font-family="Helvetica, Arial, sans-serif">`);
  layout.nodes.forEach((node) => {
    const p = node.person;
    const cx = node.x + NODE_WIDTH / 2;
    const avatarColor = p.gender === 'male' ? t.male : p.gender === 'female' ? t.female : t.other;
    const nameLines = wrapName(p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' '));
    const meta = [showYears ? years(p) : '', showPlaces ? p.placeOfBirth || p.hometown || '' : ''].filter(Boolean);

    parts.push(`<g>`);
    parts.push(
      `<rect x="${node.x}" y="${node.y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="14" fill="${t.card}" stroke="${t.cardBorder}" stroke-width="1.5"/>`
    );
    parts.push(`<circle cx="${cx}" cy="${node.y + 38}" r="24" fill="${avatarColor}"/>`);
    parts.push(
      `<text x="${cx}" y="${node.y + 45}" text-anchor="middle" font-size="17" font-weight="700" fill="#FFFFFF">${escapeXml(initials(p))}</text>`
    );
    nameLines.forEach((line, i) => {
      parts.push(
        `<text x="${cx}" y="${node.y + 88 + i * 21}" text-anchor="middle" font-size="17" font-weight="700" font-family="Georgia, 'Times New Roman', serif" fill="${t.name}">${escapeXml(line)}</text>`
      );
    });
    meta.forEach((line, i) => {
      parts.push(
        `<text x="${cx}" y="${node.y + 88 + nameLines.length * 21 + 4 + i * 17}" text-anchor="middle" font-size="13" fill="${t.meta}">${escapeXml(line)}</text>`
      );
    });
    parts.push(`</g>`);
  });
  parts.push('</g>');

  parts.push(
    `<text x="${width - margin / 2}" y="${height - 20}" text-anchor="end" font-size="13" fill="${t.meta}" font-family="Helvetica, Arial, sans-serif">${escapeXml(
      `${layout.nodes.size} family members · Anvaya FamilyTree`
    )}</text>`
  );
  parts.push('</svg>');

  return { svg: parts.join('\n'), width, height, count: layout.nodes.size };
}

/** Render the poster SVG to a PNG Blob (browser only). */
export async function posterSvgToPng(svg, width, height, scale = 2) {
  const maxSide = 16000; // browser canvas limits
  const s = Math.min(scale, maxSide / Math.max(width, height));
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not render the poster image.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * s);
    canvas.height = Math.round(height * s);
    const ctx = canvas.getContext('2d');
    ctx.scale(s, s);
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed.'))), 'image/png')
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
