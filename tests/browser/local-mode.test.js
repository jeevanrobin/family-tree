/**
 * Browser tests that need no account: the app in Local Mode with the sample
 * family, covering the flows most likely to lose or hide family data.
 * Run: npm run test:browser:local  (starts the dev server if needed)
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { samplePersons, sampleRelationships } from '../../src/family-tree/data/sampleData.js';

const people = samplePersons.map((p) =>
  p.firstName === 'Ramaiah' ? { ...p, livingStatus: 'deceased', dateOfDeath: '2025-10-02' } : p
);
const family = {
  people,
  relationships: sampleRelationships,
  stories: [],
  lifeEvents: [],
  photos: [],
  documents: [],
  siblingOrder: {},
};

// Seed the sample family once per page; a later reload keeps the app's own saves.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => {
    try {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('family-tree-data-v2', JSON.stringify({ schemaVersion: '2.0.0', ...data }));
        localStorage.setItem('medida_theme', 'light');
        localStorage.setItem('anvaya-backup-reminder-snoozed-at', new Date().toISOString());
        sessionStorage.setItem('seeded', '1');
      }
    } catch {
      // storage unavailable
    }
  }, family);
  await page.goto('/app');
  await expect(page.locator('.ft-person-card').first()).toBeVisible();
});

const cardCount = (page) => page.locator('.ft-person-card').count();

function writeBackup(name, data) {
  const dir = mkdtempSync(join(tmpdir(), 'anvaya-'));
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify({ schemaVersion: '2.0.0', family: data }));
  return file;
}

async function openBackupDialog(page) {
  await page.locator('.ft-header__profile-badge').first().click();
  await page.getByText('Back up & restore data').click();
}

test('the whole sample family loads', async ({ page }) => {
  expect(await cardCount(page)).toBe(people.length);
});

test('Import asks before replacing the tree, and Cancel keeps everyone', async ({ page }) => {
  const smaller = { ...family, people: people.slice(0, people.length - 3) };
  const ids = new Set(smaller.people.map((p) => String(p.id)));
  smaller.relationships = sampleRelationships.filter((r) =>
    [r.parentId ?? r.personAId ?? r.personId1, r.childId ?? r.personBId ?? r.personId2].every((id) => ids.has(String(id)))
  );
  const file = writeBackup('older.json', smaller);

  await openBackupDialog(page);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: /Choose File/ }).click()]);
  await chooser.setFiles(file);

  const confirm = page.locator('.ft-import-confirm');
  await expect(confirm).toContainText('3 people removed');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toHaveCount(0);
  expect(await cardCount(page)).toBe(people.length);
});

test('Restore Missing Links adds back a lost parent link and nothing else', async ({ page }) => {
  // Remove one parent link in the app, then restore it from the original backup.
  const src = sampleRelationships.find((r) => r.type === 'parent' || r.type === 'parent-child');
  const rel = { id: src.id, parentId: src.parentId ?? src.personId1, childId: src.childId ?? src.personId2 };
  await page.evaluate(async (id) => {
    const { default: store } = await import('/src/family-tree/store/FamilyStore.js');
    store.removeRelationship(id);
  }, rel.id);
  const file = writeBackup('original.json', family);

  await openBackupDialog(page);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choose Backup' }).click()]);
  await chooser.setFiles(file);
  await expect(page.locator('.ft-restore-links__found')).toContainText('1 link is in the backup but missing now');
  await page.getByRole('button', { name: 'Add 1 link' }).click();
  await expect(page.getByText('Restored 1 link.')).toBeVisible();

  const restored = await page.evaluate(async (r) => {
    const { default: store } = await import('/src/family-tree/store/FamilyStore.js');
    return store.getSnapshot().relationships.some(
      (x) => x.type === 'parent-child' && String(x.parentId) === String(r.parentId) && String(x.childId) === String(r.childId)
    );
  }, rel);
  expect(restored).toBe(true);
  expect(await cardCount(page)).toBe(people.length);
});

test('This is me, the Me button and the Family list', async ({ page }) => {
  await page.locator('.ft-person-card', { hasText: 'Rajesh Venkat' }).first().dispatchEvent('click');
  await page.getByRole('button', { name: /This is me/ }).click();
  await expect(page.getByRole('button', { name: '★ This is me' })).toBeVisible();

  await page.getByRole('button', { name: 'Family list' }).dispatchEvent('click');
  const list = page.locator('.ft-list-view');
  await expect(list.locator('.ft-list-view__centre')).toContainText('Rajesh Venkat Medida (me)');
  await list.locator('.ft-list-view__chip', { hasText: 'Venkat Ramaiah' }).click();
  await expect(list.locator('.ft-list-view__centre')).toContainText('Venkat Ramaiah Medida');
  await list.getByRole('button', { name: 'Me', exact: true }).click();
  await expect(list.locator('.ft-list-view__centre')).toContainText('Rajesh Venkat Medida');
  await list.getByRole('button', { name: 'Tree view' }).click();
  await expect(page.getByRole('button', { name: 'Jump to me' })).toBeVisible();
});

test('a late person shows their thithi', async ({ page }) => {
  await page.locator('.ft-person-card', { hasText: 'Ramaiah Medida' }).first().dispatchEvent('click');
  await expect(page.locator('.ft-details__item', { hasText: 'Thithi' })).toContainText('Ashvayuja Shukla Dashami');
});

test('the poster can show one branch', async ({ page }) => {
  await page.locator('.ft-header__profile-badge').first().click();
  await page.getByText('Print or share tree poster').click();
  const all = await page.locator('.ft-poster-meta').innerText();
  expect(all).toContain(`${people.length} people`);
  const label = (await page.locator('#poster-branch option').allInnerTexts()).find((o) => o.startsWith('Rajesh Venkat'));
  await page.selectOption('#poster-branch', { label });
  await expect(page.locator('.ft-poster-meta')).toContainText('4 people');
});

