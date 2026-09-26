/**
 * Reminders Engine — upcoming family occasions.
 *
 *   birthday            living people with a date of birth
 *   anniversary         couples (both living) with a marriage date
 *   death-anniversary   people with a date of death (vardhanti), Gregorian date
 *
 * Dates are compared as local calendar days. A 29 February date is observed
 * on 28 February in non-leap years.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

function occurrenceIn(year, { month, day }) {
  const d = month === 1 && day === 29 && !isLeap(year) ? 28 : day;
  return new Date(year, month, d);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Next occurrence (today or later) of a recurring date. */
function nextOccurrence(parts, today) {
  const base = startOfDay(today);
  let when = occurrenceIn(base.getFullYear(), parts);
  if (when < base) when = occurrenceIn(base.getFullYear() + 1, parts);
  return when;
}

const toIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isLiving = (p) => p && p.livingStatus !== 'deceased' && !p.dateOfDeath;

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/**
 * @param {{people: Array, relationships: Array}} family
 * @param {{ today?: Date, days?: number }} [options] window of days to look ahead (inclusive of today)
 * @returns {Array<{ id, type, date, daysAway, years, personIds, title }>} sorted by date
 */
export function getUpcomingOccasions({ people = [], relationships = [] }, { today = new Date(), days = 30 } = {}) {
  const base = startOfDay(today);
  const byId = new Map(people.map((p) => [String(p.id), p]));
  const occasions = [];

  const add = (type, parts, personIds, makeTitle) => {
    if (!parts) return;
    const when = nextOccurrence(parts, base);
    const daysAway = Math.round((when - base) / DAY_MS);
    if (daysAway > days) return;
    const years = when.getFullYear() - parts.year;
    if (years < 0) return;
    occasions.push({
      id: `${type}:${personIds.join('+')}`,
      type,
      date: toIso(when),
      daysAway,
      years,
      personIds,
      title: makeTitle(years),
    });
  };

  people.forEach((p) => {
    const name = p.displayName || p.firstName || 'Someone';
    if (isLiving(p)) {
      add('birthday', parseIso(p.dateOfBirth), [String(p.id)], (y) =>
        y > 0 ? `${name} turns ${y}` : `${name}'s birthday`
      );
    }
    if (p.dateOfDeath) {
      add('death-anniversary', parseIso(p.dateOfDeath), [String(p.id)], (y) =>
        y > 0 ? `${ordinal(y)} death anniversary of ${name}` : `Death anniversary of ${name}`
      );
    }
  });

  relationships
    .filter((r) => r.type === 'spouse' && r.startDate)
    .forEach((r) => {
      const a = byId.get(String(r.personAId ?? r.personId1));
      const b = byId.get(String(r.personBId ?? r.personId2));
      if (!isLiving(a) || !isLiving(b)) return;
      add('anniversary', parseIso(r.startDate), [String(a.id), String(b.id)], (y) =>
        `${a.firstName || a.displayName} & ${b.firstName || b.displayName}: ${y > 0 ? `${ordinal(y)} wedding anniversary` : 'wedding anniversary'}`
      );
    });

  const order = { birthday: 0, anniversary: 1, 'death-anniversary': 2 };
  return occasions.sort((x, y) => x.daysAway - y.daysAway || order[x.type] - order[y.type] || x.title.localeCompare(y.title));
}

/** "Today", "Tomorrow", "In 5 days". */
export function describeWhen(daysAway) {
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  return `In ${daysAway} days`;
}
