/**
 * Human-readable descriptions of change-log entries, e.g.
 *   "Lakshmi edited Ravi Kumar" + ["Birth date: — → 10 Jul 1969", "Occupation: Farmer → Teacher"]
 */

const FIELD_LABELS = {
  firstName: 'First name',
  middleName: 'Middle name',
  lastName: 'Last name',
  displayName: 'Name',
  gender: 'Gender',
  livingStatus: 'Living status',
  dateOfBirth: 'Birth date',
  dateOfDeath: 'Death date',
  placeOfBirth: 'Birthplace',
  hometown: 'Hometown',
  currentLocation: 'Lives in',
  occupation: 'Occupation',
  photo: 'Photo',
  photoUrl: 'Photo',
  biography: 'Biography',
  notes: 'Notes',
  privacy: 'Privacy',
  startDate: 'Marriage date',
};

const HIDDEN_FIELDS = new Set(['photoUrl', 'displayName']);

function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (/date/i.test(field) && /^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (field === 'photo') return value ? 'photo' : '—';
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

const personName = (p) => p?.displayName || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'someone';

/**
 * @param {object} entry change-log entry
 * @param {(id: string) => string} nameOf name of a person by id (current tree)
 * @returns {{ summary: string, details: string[] }}
 */
export function describeChange(entry, nameOf = () => 'someone') {
  const who = entry.actor || 'Someone';

  if (entry.entityType === 'person') {
    const name = personName(entry.after || entry.before);
    if (entry.action === 'create') return { summary: `${who} added ${name}`, details: [] };
    if (entry.action === 'delete') {
      const n = entry.related?.length || 0;
      return {
        summary: `${who} deleted ${name}`,
        details: n ? [`and ${n} relationship${n === 1 ? '' : 's'} with them`] : [],
      };
    }
    const fields = (entry.fields || []).filter((f) => !HIDDEN_FIELDS.has(f) && f in FIELD_LABELS);
    return {
      summary: `${who} edited ${name}`,
      details: fields.map(
        (f) => `${FIELD_LABELS[f]}: ${formatValue(f, entry.before?.[f])} → ${formatValue(f, entry.after?.[f])}`
      ),
    };
  }

  if (entry.entityType === 'relationship') {
    const rel = entry.after || entry.before || {};
    let phrase;
    if (rel.type === 'parent-child') {
      phrase = `${nameOf(rel.parentId)} as parent of ${nameOf(rel.childId)}`;
    } else if (rel.type === 'spouse') {
      phrase = `the marriage of ${nameOf(rel.personAId)} and ${nameOf(rel.personBId)}`;
    } else {
      phrase = `${nameOf(rel.personAId)} and ${nameOf(rel.personBId)} as siblings`;
    }
    if (entry.action === 'create') return { summary: `${who} linked ${phrase}`, details: [] };
    if (entry.action === 'delete') return { summary: `${who} removed ${phrase}`, details: [] };
    return {
      summary: `${who} updated ${phrase}`,
      details: (entry.fields || ['startDate'])
        .filter((f) => f in FIELD_LABELS)
        .map((f) => `${FIELD_LABELS[f]}: ${formatValue(f, entry.before?.[f])} → ${formatValue(f, entry.after?.[f])}`),
    };
  }

  return { summary: `${who} made a change`, details: [] };
}

/** Label for the restore button of an entry. */
export function restoreLabel(entry) {
  if (entry.action === 'update') return 'Restore previous';
  if (entry.action === 'create') return 'Undo';
  return 'Restore';
}
