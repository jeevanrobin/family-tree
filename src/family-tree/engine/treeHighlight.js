/**
 * Tree highlight rules — which connectors and cards stand out when a person
 * is selected (or hovered), and which recede.
 *
 * Selected:
 *   strong — the person's own connectors: to parents, spouses, children, and
 *            the parents' lines to their siblings
 *   soft   — the rest of the family constellation: the direct line up and
 *            down, in-laws (tiers 'extended')
 *   dim    — everyone and everything else
 * Hovered (nothing selected): a lighter preview of the person's direct
 * connectors; everything else is 'faint'.
 */

const parentsOf = (line) => (line.allParentIds || line.parentIds || []).map(String);

/**
 * @param {Array} lines layout.lines
 * @param {Object} options
 * @param {string|null} options.selectedId
 * @param {Map} [options.constellationMap] personId -> { tier } for the selected person
 * @param {string|null} [options.hoveredId]
 * @returns {{ mode: 'selected'|'hover'|'none', lineState: Map<string,string>, cardState: Map<string,string> }}
 *   lineState values: 'strong' | 'soft' | 'dim' | 'faint'
 *   cardState values: 'focus' | 'strong' | 'soft' | 'dim' | 'faint' (absent = normal)
 */
export function computeTreeHighlight(lines, { selectedId = null, constellationMap = null, hoveredId = null } = {}) {
  const lineState = new Map();
  const cardState = new Map();

  if (selectedId) {
    const sel = String(selectedId);
    const tier = (id) => constellationMap?.get(String(id))?.tier || constellationMap?.get(id)?.tier || 'unrelated';
    const related = (id) => String(id) === sel || tier(id) !== 'unrelated';

    const selectedParents = new Set();
    lines.forEach((line) => {
      if (line.type === 'parent-child' && String(line.childId) === sel) {
        parentsOf(line).forEach((id) => selectedParents.add(id));
      }
    });

    lines.forEach((line) => {
      let state = 'dim';
      if (line.type === 'parent-child') {
        const parents = parentsOf(line);
        const child = String(line.childId);
        const isSiblingLine = tier(child) === 'sibling' && parents.some((p) => selectedParents.has(p));
        if (child === sel || parents.includes(sel) || isSiblingLine) state = 'strong';
        else if (related(child) && parents.some(related)) state = 'soft';
      } else {
        const a = String(line.personId1);
        const b = String(line.personId2);
        if (a === sel || b === sel) state = 'strong';
        else if (related(a) && related(b)) state = 'soft';
      }
      lineState.set(line.id, state);
    });

    constellationMap?.forEach((info, id) => {
      const key = String(id);
      if (key === sel) cardState.set(key, 'focus');
      else if (info.tier === 'immediate' || info.tier === 'sibling') cardState.set(key, 'strong');
      else if (info.tier === 'extended') cardState.set(key, 'soft');
      else cardState.set(key, 'dim');
    });
    cardState.set(sel, 'focus');
    return { mode: 'selected', lineState, cardState };
  }

  if (hoveredId) {
    const h = String(hoveredId);
    const connected = new Set([h]);
    lines.forEach((line) => {
      let touches = false;
      if (line.type === 'parent-child') {
        const parents = parentsOf(line);
        if (String(line.childId) === h) {
          touches = true;
          parents.forEach((p) => connected.add(p));
        } else if (parents.includes(h)) {
          touches = true;
          connected.add(String(line.childId));
        }
      } else if (String(line.personId1) === h || String(line.personId2) === h) {
        touches = true;
        connected.add(String(line.personId1));
        connected.add(String(line.personId2));
      }
      lineState.set(line.id, touches ? 'strong' : 'faint');
    });
    connected.forEach((id) => cardState.set(id, id === h ? 'focus' : 'strong'));
    return { mode: 'hover', lineState, cardState };
  }

  return { mode: 'none', lineState, cardState };
}
