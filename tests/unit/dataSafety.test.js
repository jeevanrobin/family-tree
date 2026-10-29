import { describe, it, expect, beforeEach } from 'vitest';
import { previewImport, importLosesData } from '../../src/family-tree/utils/importPreview.js';
import {
  markBackupTaken,
  snoozeBackupReminder,
  shouldRemindBackup,
  daysSinceBackup,
} from '../../src/family-tree/utils/backupReminder.js';

const P = (id, extra = {}) => ({ id, firstName: id.toUpperCase(), ...extra });
const pc = (parentId, childId) => ({ id: `${parentId}-${childId}`, type: 'parent-child', parentId, childId });

describe('previewImport', () => {
  const current = [P('a'), P('b', { hometown: 'New' }), P('c')];
  const rels = [pc('a', 'b'), pc('a', 'c')];

  it('lists people removed, changed and added, and link counts', () => {
    const backup = { family: { people: [P('a'), P('b', { hometown: 'Old' }), P('d')], relationships: [pc('a', 'b'), pc('a', 'd')] } };
    const preview = previewImport(backup, current, rels);
    expect(preview).toEqual({ added: ['D'], removed: ['C'], changed: ['B'], linksAdded: 1, linksRemoved: 1 });
    expect(importLosesData(preview)).toBe(true);
  });

  it('an identical or purely additive backup loses nothing', () => {
    const backup = { family: { people: [...current, P('e')], relationships: [...rels, pc('a', 'e')] } };
    expect(importLosesData(previewImport(backup, current, rels))).toBe(false);
  });
});

describe('backup reminder', () => {
  const DAY = 86400000;
  beforeEach(() => {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      clear: () => store.clear(),
    };
  });

  it('reminds when no backup was ever taken, but not for tiny trees', () => {
    expect(shouldRemindBackup(50)).toBe(true);
    expect(shouldRemindBackup(2)).toBe(false);
  });

  it('stays quiet for a week after a backup, then reminds again', () => {
    const t = Date.UTC(2026, 9, 1);
    markBackupTaken(t);
    expect(shouldRemindBackup(50, t + 3 * DAY)).toBe(false);
    expect(daysSinceBackup(t + 8 * DAY)).toBe(8);
    expect(shouldRemindBackup(50, t + 8 * DAY)).toBe(true);
  });

  it('Later hides it for a week', () => {
    const t = Date.UTC(2026, 9, 1);
    snoozeBackupReminder(t);
    expect(shouldRemindBackup(50, t + DAY)).toBe(false);
    expect(shouldRemindBackup(50, t + 8 * DAY)).toBe(true);
  });
});
