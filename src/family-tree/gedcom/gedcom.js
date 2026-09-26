/**
 * GEDCOM 5.5.1 import / export
 *
 * GEDCOM is the standard exchange format for family trees (Ancestry,
 * MyHeritage, FamilySearch, Gramps all read and write it).
 *
 * Export: people become INDI records; each couple (and each single parent
 * recorded without a partner) becomes a FAM record linking spouses and
 * children. Import: the reverse, producing a backup-shaped object that the
 * regular backup import can load.
 *
 * Dates: exact ISO dates (YYYY-MM-DD) map to "10 JUL 1969". Partial or
 * approximate GEDCOM dates ("ABT 1969", "JUL 1969") cannot be stored as an
 * exact date, so they are kept in the person's notes rather than invented.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function isoToGedcomDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Exact "D MON YYYY" → ISO; anything else → null. */
export function gedcomDateToIso(value) {
  const m = /^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/i.exec((value || '').trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toUpperCase());
  if (month === -1) return null;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// GEDCOM lines are limited in length; long text is split with CONC/CONT.
function textLines(level, tag, text) {
  const out = [];
  String(text)
    .split(/\r?\n/)
    .forEach((line, i) => {
      const chunks = line.match(/.{1,200}/g) || [''];
      chunks.forEach((chunk, j) => {
        if (i === 0 && j === 0) out.push(`${level} ${tag} ${chunk}`.trimEnd());
        else if (j === 0) out.push(`${level + 1} CONT ${chunk}`.trimEnd());
        else out.push(`${level + 1} CONC ${chunk}`);
      });
    });
  return out;
}

/**
 * @param {{people: Array, relationships: Array}} family
 * @param {{ sourceName?: string, now?: Date }} [options]
 * @returns {string} GEDCOM text
 */
export function exportGedcom(family, { sourceName = 'ANVAYA', now = new Date() } = {}) {
  const people = family.people || [];
  const relationships = family.relationships || [];
  const xref = new Map(people.map((p, i) => [String(p.id), `@I${i + 1}@`]));
  const byId = new Map(people.map((p) => [String(p.id), p]));

  // Families: one per couple, plus one per single recorded parent.
  const families = [];
  const familyKey = new Map();
  const getFamily = (parentIds) => {
    const key = [...parentIds].sort().join('+');
    if (!familyKey.has(key)) {
      const fam = { xref: `@F${families.length + 1}@`, parents: [...parentIds], children: [], marriage: null };
      families.push(fam);
      familyKey.set(key, fam);
    }
    return familyKey.get(key);
  };

  relationships
    .filter((r) => r.type === 'spouse')
    .forEach((r) => {
      const a = String(r.personAId ?? r.personId1);
      const b = String(r.personBId ?? r.personId2);
      if (!xref.has(a) || !xref.has(b)) return;
      getFamily([a, b]).marriage = r.startDate || null;
    });

  const parentsOf = new Map();
  relationships
    .filter((r) => r.type === 'parent-child' || r.type === 'parent')
    .forEach((r) => {
      const parent = String(r.parentId ?? r.personId1);
      const child = String(r.childId ?? r.personId2);
      if (!xref.has(parent) || !xref.has(child)) return;
      if (!parentsOf.has(child)) parentsOf.set(child, []);
      parentsOf.get(child).push(parent);
    });
  parentsOf.forEach((parents, child) => {
    getFamily(parents.slice(0, 2)).children.push(child);
  });

  const lines = [
    '0 HEAD',
    `1 SOUR ${sourceName}`,
    '2 NAME Anvaya FamilyTree',
    `1 DATE ${isoToGedcomDate(now.toISOString().slice(0, 10))}`,
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
  ];

  people.forEach((p) => {
    const id = String(p.id);
    const given = [p.firstName, p.middleName].filter(Boolean).join(' ').trim();
    const surname = (p.lastName || '').trim();
    lines.push(`0 ${xref.get(id)} INDI`);
    lines.push(`1 NAME ${given || p.displayName || 'Unknown'} /${surname}/`);
    if (given) lines.push(`2 GIVN ${given}`);
    if (surname) lines.push(`2 SURN ${surname}`);
    lines.push(`1 SEX ${p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'U'}`);

    const birthDate = isoToGedcomDate(p.dateOfBirth);
    if (birthDate || p.placeOfBirth) {
      lines.push('1 BIRT');
      if (birthDate) lines.push(`2 DATE ${birthDate}`);
      if (p.placeOfBirth) lines.push(`2 PLAC ${p.placeOfBirth}`);
    }
    const deathDate = isoToGedcomDate(p.dateOfDeath);
    if (deathDate) {
      lines.push('1 DEAT');
      lines.push(`2 DATE ${deathDate}`);
    } else if (p.livingStatus === 'deceased') {
      lines.push('1 DEAT Y');
    }
    if (p.occupation) lines.push(`1 OCCU ${p.occupation}`);
    if (p.currentLocation) {
      lines.push('1 RESI');
      lines.push(`2 PLAC ${p.currentLocation}`);
    }
    if (p.biography) lines.push(...textLines(1, 'NOTE', p.biography));
    if (p.notes) lines.push(...textLines(1, 'NOTE', p.notes));

    families.forEach((fam) => {
      if (fam.parents.includes(id)) lines.push(`1 FAMS ${fam.xref}`);
      if (fam.children.includes(id)) lines.push(`1 FAMC ${fam.xref}`);
    });
  });

  families.forEach((fam) => {
    lines.push(`0 ${fam.xref} FAM`);
    // Husband/wife roles by gender; unknown genders fill the free slot.
    const parents = fam.parents.map((id) => byId.get(id));
    let husb = parents.find((p) => p.gender === 'male');
    let wife = parents.find((p) => p.gender === 'female' && p !== husb);
    parents.forEach((p) => {
      if (p === husb || p === wife) return;
      if (!husb) husb = p;
      else if (!wife) wife = p;
    });
    if (husb) lines.push(`1 HUSB ${xref.get(String(husb.id))}`);
    if (wife) lines.push(`1 WIFE ${xref.get(String(wife.id))}`);
    fam.children.forEach((c) => lines.push(`1 CHIL ${xref.get(c)}`));
    const marriage = isoToGedcomDate(fam.marriage);
    if (marriage) {
      lines.push('1 MARR');
      lines.push(`2 DATE ${marriage}`);
    }
  });

  lines.push('0 TRLR');
  return `${lines.join('\n')}\n`;
}

/** Parse GEDCOM text into a tree of { tag, xref, value, children }. */
function parseRecords(text) {
  const root = { children: [] };
  const stack = [root];
  String(text)
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .forEach((raw) => {
      const line = raw.trimStart();
      if (!line) return;
      const m = /^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/.exec(line);
      if (!m) return;
      const level = Number(m[1]);
      const node = { tag: m[3].toUpperCase(), xref: m[2] || null, value: m[4] ?? '', children: [] };
      if (node.tag === 'CONC' || node.tag === 'CONT') {
        const parent = stack[level];
        if (parent) parent.value += (node.tag === 'CONT' ? '\n' : '') + node.value;
        return;
      }
      while (stack.length > level + 1) stack.pop();
      (stack[stack.length - 1] || root).children.push(node);
      stack.push(node);
    });
  return root.children;
}

const child = (node, tag) => node.children.find((c) => c.tag === tag);
const childValue = (node, ...tags) => {
  let n = node;
  for (const tag of tags) {
    n = n && child(n, tag);
  }
  return n ? n.value.trim() : '';
};

/**
 * @param {string} text GEDCOM file contents
 * @returns {{ family: { people: Array, relationships: Array, stories: [], lifeEvents: [], photos: [], documents: [], siblingOrder: {} }, warnings: string[] }}
 */
export function importGedcom(text) {
  const records = parseRecords(text);
  if (!records.some((r) => r.tag === 'HEAD')) {
    throw new Error('This does not look like a GEDCOM file (missing HEAD record).');
  }
  const warnings = [];
  const idOf = (xref) => `person-ged-${xref.replace(/@/g, '').replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const now = new Date().toISOString();

  const people = records
    .filter((r) => r.tag === 'INDI' && r.xref)
    .map((indi) => {
      const nameNode = child(indi, 'NAME');
      const rawName = nameNode?.value || '';
      const surnameMatch = /\/([^/]*)\//.exec(rawName);
      const lastName = (childValue(indi, 'NAME', 'SURN') || surnameMatch?.[1] || '').trim();
      const given = (childValue(indi, 'NAME', 'GIVN') || rawName.replace(/\/[^/]*\//, '')).replace(/\s+/g, ' ').trim();
      const [firstName, ...middle] = given ? given.split(' ') : ['Unknown'];
      const sex = childValue(indi, 'SEX').toUpperCase();

      const notes = [];
      const birthRaw = childValue(indi, 'BIRT', 'DATE');
      const deathRaw = childValue(indi, 'DEAT', 'DATE');
      const dateOfBirth = gedcomDateToIso(birthRaw);
      const dateOfDeath = gedcomDateToIso(deathRaw);
      if (birthRaw && !dateOfBirth) notes.push(`Birth date (from GEDCOM): ${birthRaw}`);
      if (deathRaw && !dateOfDeath) notes.push(`Death date (from GEDCOM): ${deathRaw}`);
      indi.children.filter((c) => c.tag === 'NOTE' && !c.value.startsWith('@')).forEach((c) => notes.push(c.value));

      const deceased = Boolean(child(indi, 'DEAT'));
      const displayName = [firstName, ...middle, lastName].filter(Boolean).join(' ');
      return {
        id: idOf(indi.xref),
        firstName: firstName || 'Unknown',
        middleName: middle.join(' '),
        lastName,
        displayName: displayName || 'Unknown',
        gender: sex === 'M' ? 'male' : sex === 'F' ? 'female' : 'unspecified',
        livingStatus: deceased ? 'deceased' : 'alive',
        dateOfBirth,
        dateOfDeath,
        placeOfBirth: childValue(indi, 'BIRT', 'PLAC'),
        hometown: '',
        currentLocation: childValue(indi, 'RESI', 'PLAC'),
        occupation: childValue(indi, 'OCCU'),
        photo: '',
        photoUrl: '',
        biography: '',
        notes: notes.join('\n'),
        privacy: 'family',
        createdAt: now,
        updatedAt: now,
      };
    });

  const known = new Set(people.map((p) => p.id));
  const relationships = [];
  const seenRel = new Set();
  let relCounter = 0;
  const addRel = (rel, key) => {
    if (seenRel.has(key)) return;
    seenRel.add(key);
    relCounter += 1;
    relationships.push({ id: `rel-ged-${relCounter}`, ...rel });
  };

  records
    .filter((r) => r.tag === 'FAM')
    .forEach((fam) => {
      const refs = (tag) =>
        fam.children.filter((c) => c.tag === tag).map((c) => idOf(c.value.trim())).filter((id) => {
          if (known.has(id)) return true;
          warnings.push(`Family ${fam.xref} refers to a missing person (${id}); skipped.`);
          return false;
        });
      const parents = [...refs('HUSB'), ...refs('WIFE')];
      if (parents.length === 2) {
        const startDate = gedcomDateToIso(childValue(fam, 'MARR', 'DATE'));
        addRel(
          { type: 'spouse', personAId: parents[0], personBId: parents[1], personId1: parents[0], personId2: parents[1], startDate },
          `S:${[...parents].sort().join('+')}`
        );
      }
      refs('CHIL').forEach((childId) => {
        parents.forEach((parentId) => {
          if (parentId === childId) return;
          addRel(
            { type: 'parent-child', parentId, childId, personId1: parentId, personId2: childId },
            `P:${parentId}>${childId}`
          );
        });
      });
    });

  // The app allows at most two recorded parents per person.
  const parentCount = new Map();
  const kept = relationships.filter((r) => {
    if (r.type !== 'parent-child') return true;
    const n = (parentCount.get(r.childId) || 0) + 1;
    parentCount.set(r.childId, n);
    if (n > 2) {
      warnings.push(`${r.childId} has more than two parents in the file; extra parent links were skipped.`);
      return false;
    }
    return true;
  });

  if (people.length === 0) throw new Error('No people (INDI records) found in the GEDCOM file.');

  return {
    family: {
      people,
      relationships: kept,
      stories: [],
      lifeEvents: [],
      photos: [],
      documents: [],
      siblingOrder: {},
    },
    warnings,
  };
}
