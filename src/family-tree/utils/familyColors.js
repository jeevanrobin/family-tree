/**
 * Family (surname) colours for tree cards: each surname gets a colour, the
 * most common family first, so a branch and the families daughters marry
 * into can be told apart at a glance.
 */

export const FAMILY_PALETTE = [
  '#E56515', // orange (brand)
  '#2563EB', // blue
  '#059669', // green
  '#7C3AED', // purple
  '#DB2777', // rose
  '#0891B2', // teal
  '#B45309', // amber
  '#4F46E5', // indigo
  '#65A30D', // lime
  '#DC2626', // red
];

/** Normalised surname used to group a family ('' when unknown). */
export function familyKey(person) {
  const last = String(person?.lastName || '').trim();
  if (last) return last.toLowerCase();
  const words = String(person?.displayName || '').trim().split(/\s+/);
  return words.length > 1 ? words[words.length - 1].toLowerCase() : '';
}

/**
 * @param {object[]} persons
 * @param {{ primaryKey?: string }} [options] family that gets the first colour
 *   (the tree's own family, e.g. the eldest ancestor's surname)
 * @returns {{ colorOf: (person) => string|null, families: { key, name, color, count }[] }}
 */
export function buildFamilyColors(persons, { primaryKey = '' } = {}) {
  const counts = new Map(); // key -> { name, count }
  (persons || []).forEach((p) => {
    const key = familyKey(p);
    if (!key) return;
    const entry = counts.get(key) || { name: String(p.lastName || '').trim() || key, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  });
  const families = [...counts]
    .sort(
      (a, b) =>
        Number(b[0] === primaryKey) - Number(a[0] === primaryKey) ||
        b[1].count - a[1].count ||
        a[0].localeCompare(b[0])
    )
    .map(([key, { name, count }], i) => ({
      key,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
      color: FAMILY_PALETTE[i % FAMILY_PALETTE.length],
    }));
  const byKey = new Map(families.map((f) => [f.key, f.color]));
  return { colorOf: (person) => byKey.get(familyKey(person)) || null, families };
}
