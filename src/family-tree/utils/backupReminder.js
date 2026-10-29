/**
 * backupReminder — remembers on this device when a backup was last
 * downloaded, so the app can suggest one when it has been a while.
 */

const KEY = 'anvaya-last-backup-at';
const SNOOZE_KEY = 'anvaya-backup-reminder-snoozed-at';
export const BACKUP_INTERVAL_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

function read(key) {
  try {
    const v = localStorage.getItem(key);
    const t = v ? Date.parse(v) : NaN;
    return Number.isNaN(t) ? null : t;
  } catch {
    return null;
  }
}

function write(key, now) {
  try {
    localStorage.setItem(key, new Date(now).toISOString());
  } catch {
    // Storage unavailable (private window): the reminder just shows again.
  }
}

export function markBackupTaken(now = Date.now()) {
  write(KEY, now);
}

export function snoozeBackupReminder(now = Date.now()) {
  write(SNOOZE_KEY, now);
}

/** Days since the last backup on this device, or null if never. */
export function daysSinceBackup(now = Date.now()) {
  const last = read(KEY);
  return last === null ? null : Math.floor((now - last) / DAY);
}

/** Show the reminder: no backup for a week (or ever), and not snoozed in the last week. */
export function shouldRemindBackup(peopleCount, now = Date.now()) {
  if (!peopleCount || peopleCount < 5) return false;
  const snoozed = read(SNOOZE_KEY);
  if (snoozed !== null && now - snoozed < BACKUP_INTERVAL_DAYS * DAY) return false;
  const days = daysSinceBackup(now);
  return days === null || days >= BACKUP_INTERVAL_DAYS;
}
