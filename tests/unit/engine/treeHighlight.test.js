import { describe, it, expect } from 'vitest';
import { computeTreeHighlight } from '../../../src/family-tree/engine/treeHighlight.js';

// gp ═ gm → (dad ═ mom → me, sis), (uncle → cousin); me ═ wife → kid; stranger
const lines = [
  { id: 's-gp', type: 'spouse', personId1: 'gp', personId2: 'gm' },
  { id: 'l-dad', type: 'parent-child', allParentIds: ['gp', 'gm'], parentIds: ['gp', 'gm'], childId: 'dad' },
  { id: 'l-uncle', type: 'parent-child', allParentIds: ['gp', 'gm'], parentIds: ['gp', 'gm'], childId: 'uncle' },
  { id: 's-dad', type: 'spouse', personId1: 'dad', personId2: 'mom' },
  { id: 'l-me', type: 'parent-child', allParentIds: ['dad', 'mom'], parentIds: ['dad', 'mom'], childId: 'me' },
  { id: 'l-sis', type: 'parent-child', allParentIds: ['dad', 'mom'], parentIds: ['dad', 'mom'], childId: 'sis' },
  { id: 'l-cousin', type: 'parent-child', allParentIds: ['uncle'], parentIds: ['uncle'], childId: 'cousin' },
  { id: 's-me', type: 'spouse', personId1: 'me', personId2: 'wife' },
  { id: 'l-kid', type: 'parent-child', allParentIds: ['me', 'wife'], parentIds: ['me', 'wife'], childId: 'kid' },
];

const constellation = new Map([
  ['me', { tier: 'selected' }],
  ['dad', { tier: 'immediate' }],
  ['mom', { tier: 'immediate' }],
  ['wife', { tier: 'immediate' }],
  ['kid', { tier: 'immediate' }],
  ['sis', { tier: 'sibling' }],
  ['gp', { tier: 'extended' }],
  ['gm', { tier: 'extended' }],
  ['uncle', { tier: 'unrelated' }],
  ['cousin', { tier: 'unrelated' }],
  ['stranger', { tier: 'unrelated' }],
]);

describe('computeTreeHighlight', () => {
  it('does nothing without a selection or hover', () => {
    const h = computeTreeHighlight(lines, {});
    expect(h.mode).toBe('none');
    expect(h.lineState.size).toBe(0);
  });

  it("makes the selected person's own connections strong", () => {
    const h = computeTreeHighlight(lines, { selectedId: 'me', constellationMap: constellation });
    for (const id of ['l-me', 's-me', 'l-kid', 'l-sis']) expect(h.lineState.get(id)).toBe('strong');
  });

  it('keeps the rest of the direct line soft and dims unrelated branches', () => {
    const h = computeTreeHighlight(lines, { selectedId: 'me', constellationMap: constellation });
    expect(h.lineState.get('l-dad')).toBe('soft');
    expect(h.lineState.get('s-gp')).toBe('soft');
    expect(h.lineState.get('s-dad')).toBe('soft');
    expect(h.lineState.get('l-uncle')).toBe('dim');
    expect(h.lineState.get('l-cousin')).toBe('dim');
  });

  it('assigns card emphasis by relationship tier', () => {
    const h = computeTreeHighlight(lines, { selectedId: 'me', constellationMap: constellation });
    expect(h.cardState.get('me')).toBe('focus');
    expect(h.cardState.get('sis')).toBe('strong');
    expect(h.cardState.get('gp')).toBe('soft');
    expect(h.cardState.get('uncle')).toBe('dim');
  });

  it('previews direct connections on hover', () => {
    const h = computeTreeHighlight(lines, { hoveredId: 'dad' });
    expect(h.mode).toBe('hover');
    expect(h.lineState.get('l-dad')).toBe('strong');
    expect(h.lineState.get('l-me')).toBe('strong');
    expect(h.lineState.get('s-dad')).toBe('strong');
    expect(h.lineState.get('l-cousin')).toBe('faint');
    expect([...h.cardState.keys()].sort()).toEqual(['dad', 'gm', 'gp', 'me', 'mom', 'sis']);
  });

  it('selection wins over hover', () => {
    const h = computeTreeHighlight(lines, { selectedId: 'me', constellationMap: constellation, hoveredId: 'uncle' });
    expect(h.mode).toBe('selected');
  });
});
