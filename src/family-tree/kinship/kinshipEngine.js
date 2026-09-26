/**
 * Kinship Engine — "How are we related?"
 *
 * Finds the shortest connection between two people and names it in English
 * and in Telugu. Telugu kinship terms depend on details English ignores:
 * the father's vs the mother's side (Mamayya vs Chinnanna), elder vs younger
 * (Pedananna vs Chinnanna, Akka vs Chelli), and parallel vs cross cousins
 * (a father's brother's son is Anna/Thammudu, a mother's brother's son is
 * Bava/Bavamaridi). When a gender or birth date needed to decide is missing,
 * every possible term is returned together with what is missing.
 *
 * Direction: describeRelationship(..., fromId, toId) answers
 * "<to> is <from>'s ___".
 */

// Telugu terms: script + common romanization.
export const TELUGU = Object.freeze({
  nanna: { script: 'నాన్న', roman: 'Nanna' },
  amma: { script: 'అమ్మ', roman: 'Amma' },
  koduku: { script: 'కొడుకు', roman: 'Koduku' },
  kuthuru: { script: 'కూతురు', roman: 'Kuthuru' },
  bharta: { script: 'భర్త', roman: 'Bharta' },
  bharya: { script: 'భార్య', roman: 'Bharya' },
  annayya: { script: 'అన్నయ్య', roman: 'Annayya' },
  thammudu: { script: 'తమ్ముడు', roman: 'Thammudu' },
  akka: { script: 'అక్క', roman: 'Akka' },
  chelli: { script: 'చెల్లి', roman: 'Chelli' },
  thatha: { script: 'తాత', roman: 'Thatha' },
  nanamma: { script: 'నానమ్మ', roman: 'Nanamma' },
  ammamma: { script: 'అమ్మమ్మ', roman: 'Ammamma' },
  mutthatha: { script: 'ముత్తాత', roman: 'Mutthatha' },
  mutthavva: { script: 'ముత్తవ్వ', roman: 'Mutthavva' },
  manavadu: { script: 'మనవడు', roman: 'Manavadu' },
  manavaralu: { script: 'మనవరాలు', roman: 'Manavaralu' },
  munimanavadu: { script: 'మునిమనవడు', roman: 'Munimanavadu' },
  munimanavaralu: { script: 'మునిమనవరాలు', roman: 'Munimanavaralu' },
  pedananna: { script: 'పెదనాన్న', roman: 'Pedananna' },
  chinnanna: { script: 'చిన్నాన్న / బాబాయి', roman: 'Chinnanna / Babai' },
  peddamma: { script: 'పెద్దమ్మ', roman: 'Peddamma' },
  pinni: { script: 'పిన్ని', roman: 'Pinni' },
  atta: { script: 'అత్త', roman: 'Atta' },
  mamayya: { script: 'మామయ్య', roman: 'Mamayya' },
  bava: { script: 'బావ', roman: 'Bava' },
  bavamaridi: { script: 'బావమరిది', roman: 'Bavamaridi' },
  maridi: { script: 'మరిది', roman: 'Maridi' },
  vadina: { script: 'వదిన', roman: 'Vadina' },
  maradalu: { script: 'మరదలు', roman: 'Maradalu' },
  adapaduchu: { script: 'ఆడపడుచు', roman: 'Adapaduchu' },
  menalludu: { script: 'మేనల్లుడు', roman: 'Menalludu' },
  menakodalu: { script: 'మేనకోడలు', roman: 'Menakodalu' },
  kodalu: { script: 'కోడలు', roman: 'Kodalu' },
  alludu: { script: 'అల్లుడు', roman: 'Alludu' },
  mamagaru: { script: 'మామగారు', roman: 'Mamagaru' },
  attagaru: { script: 'అత్తగారు', roman: 'Attagaru' },
});

const STEP_WEIGHT = { P: 1, C: 1, S: 1.5 }; // prefer blood connections over marriages

function buildGraph(persons, relationships) {
  const people = new Map(persons.map((p) => [String(p.id), p]));
  const edges = new Map();
  const add = (from, to, type) => {
    if (!people.has(from) || !people.has(to) || from === to) return;
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from).push({ to, type });
  };
  relationships.forEach((r) => {
    if (r.type === 'parent-child' || r.type === 'parent') {
      const parent = String(r.parentId ?? r.personId1);
      const child = String(r.childId ?? r.personId2);
      add(child, parent, 'P');
      add(parent, child, 'C');
    } else if (r.type === 'spouse') {
      const a = String(r.personAId ?? r.personId1);
      const b = String(r.personBId ?? r.personId2);
      add(a, b, 'S');
      add(b, a, 'S');
    }
  });
  return { people, edges };
}

/**
 * Shortest connection from one person to another.
 * @returns {Array<{type: 'P'|'C'|'S', id: string}>|null} steps (each step's id is the person reached)
 */
/** Shortest connections from one person to everyone (Dijkstra). */
function shortestPathTree(edges, from) {
  const dist = new Map([[from, 0]]);
  const prev = new Map();
  const queue = [[0, from]];
  const done = new Set();
  while (queue.length > 0) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, node] = queue.shift();
    if (done.has(node)) continue;
    done.add(node);
    for (const { to: next, type } of edges.get(node) || []) {
      const nd = d + STEP_WEIGHT[type];
      if (nd < (dist.get(next) ?? Infinity)) {
        dist.set(next, nd);
        prev.set(next, { node, type });
        queue.push([nd, next]);
      }
    }
  }
  return prev;
}

function stepsTo(prev, from, to) {
  if (from === to) return [];
  if (!prev.has(to)) return null;
  const steps = [];
  for (let node = to; node !== from; node = prev.get(node).node) {
    steps.unshift({ type: prev.get(node).type, id: node });
  }
  return steps;
}

export function findRelationshipPath(persons, relationships, fromId, toId) {
  const { people, edges } = buildGraph(persons, relationships);
  const from = String(fromId);
  const to = String(toId);
  if (!people.has(from) || !people.has(to)) return null;
  return stepsTo(shortestPathTree(edges, from), from, to);
}

/** Collapse "up to a parent, down to another child" into a sibling step B. */
export function compressSteps(steps, fromId) {
  const out = [];
  let previous = String(fromId);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const next = steps[i + 1];
    if (step.type === 'P' && next && next.type === 'C' && next.id !== previous) {
      out.push({ type: 'B', id: next.id, via: step.id, from: previous });
      previous = next.id;
      i++;
      continue;
    }
    out.push({ ...step, from: previous });
    previous = step.id;
  }
  return out;
}

const genderOf = (person) => (person?.gender === 'male' || person?.gender === 'female' ? person.gender : null);
const pick = (gender, male, female, neutral) => (gender === 'male' ? male : gender === 'female' ? female : neutral);

function birthTime(person) {
  const d = person?.dateOfBirth;
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * true when a is older than b, false when younger, null when unknown.
 * Birth dates decide when both are recorded; otherwise the optional
 * `siblingOrder(aId, bId)` (card order in the tree: left = elder) is used.
 */
function isElder(a, b, siblingOrder = null) {
  const ta = birthTime(a);
  const tb = birthTime(b);
  if (ta !== null && tb !== null && ta !== tb) return ta < tb;
  if (siblingOrder && a && b) return siblingOrder(String(a.id), String(b.id)) ?? null;
  return null;
}

/**
 * Sibling order from the tree layout: within a family's row of children,
 * a card further left is treated as elder. Follows Arrange Family moves.
 * @returns {(aId: string, bId: string) => boolean|null}
 */
export function siblingOrderFromLayout(layout, relationships = []) {
  const position = new Map();
  (layout?.allNodes || layout?.nodes || new Map()).forEach((node, id) => {
    if (node.cohortKey && String(node.bloodChildId) === String(id)) {
      position.set(String(id), { cohort: node.cohortKey, index: node.siblingIndex });
    }
  });

  // Fallback for siblings shown in different rows (e.g. a daughter placed
  // with her husband's family): the order the children were added.
  const addedOrder = new Map(); // parentId -> [childId...]
  relationships.forEach((r) => {
    if (r.type !== 'parent-child' && r.type !== 'parent') return;
    const parent = String(r.parentId ?? r.personId1);
    if (!addedOrder.has(parent)) addedOrder.set(parent, []);
    addedOrder.get(parent).push(String(r.childId ?? r.personId2));
  });

  return (aId, bId) => {
    const a = position.get(String(aId));
    const b = position.get(String(bId));
    if (a && b && a.cohort === b.cohort && a.index !== b.index) return a.index < b.index;
    for (const children of addedOrder.values()) {
      const ia = children.indexOf(String(aId));
      const ib = children.indexOf(String(bId));
      if (ia !== -1 && ib !== -1 && ia !== ib) return ia < ib;
    }
    return null;
  };
}

const ENGLISH_STEP = {
  P: ['father', 'mother', 'parent'],
  C: ['son', 'daughter', 'child'],
  S: ['husband', 'wife', 'spouse'],
  B: ['brother', 'sister', 'sibling'],
};

const ordinal = (n) => ['', 'first', 'second', 'third', 'fourth', 'fifth'][n] || `${n}th`;
const greats = (n) => (n <= 0 ? '' : n === 1 ? 'great-' : `${n}× great-`);

/** Standard English relationship name, from the shape of the path. */
function englishTerm(signature, target) {
  const g = genderOf(target);
  const table = {
    '': 'Self',
    P: pick(g, 'Father', 'Mother', 'Parent'),
    C: pick(g, 'Son', 'Daughter', 'Child'),
    S: pick(g, 'Husband', 'Wife', 'Spouse'),
    B: pick(g, 'Brother', 'Sister', 'Sibling'),
    PS: pick(g, 'Stepfather', 'Stepmother', 'Step-parent'),
    SC: pick(g, 'Stepson', 'Stepdaughter', 'Stepchild'),
    PBS: pick(g, 'Uncle (by marriage)', 'Aunt (by marriage)', 'Aunt/Uncle (by marriage)'),
    BS: pick(g, 'Brother-in-law', 'Sister-in-law', 'Sibling-in-law'),
    SB: pick(g, 'Brother-in-law', 'Sister-in-law', 'Sibling-in-law'),
    SP: pick(g, 'Father-in-law', 'Mother-in-law', 'Parent-in-law'),
    CS: pick(g, 'Son-in-law', 'Daughter-in-law', 'Child-in-law'),
  };
  if (signature in table) return table[signature];

  // Blood relations of any depth, from generations up (u) and down (d).
  if (!/^[PCB]+$/.test(signature)) return null;
  const letters = signature.split('');
  const up = letters.filter((l) => l === 'P' || l === 'B').length;
  const down = letters.filter((l) => l === 'C' || l === 'B').length;
  // Only a single climb followed by a single descent is a blood line.
  if (!/^P*B?C*$/.test(signature)) return null;
  if (down === 0) {
    return `${greats(up - 2)}${up >= 2 ? 'grand' : ''}${pick(g, 'father', 'mother', 'parent')}`.replace(/^./, (c) => c.toUpperCase());
  }
  if (up === 0) {
    return `${greats(down - 2)}${down >= 2 ? 'grand' : ''}${pick(g, 'son', 'daughter', 'child')}`.replace(/^./, (c) => c.toUpperCase());
  }
  if (down === 1) {
    return `${greats(up - 3)}${up >= 3 ? 'grand-' : ''}${pick(g, 'uncle', 'aunt', 'aunt/uncle')}`.replace(/^./, (c) => c.toUpperCase());
  }
  if (up === 1) {
    return `${greats(down - 3)}${down >= 3 ? 'grand-' : ''}${pick(g, 'nephew', 'niece', 'nephew/niece')}`.replace(/^./, (c) => c.toUpperCase());
  }
  const degree = Math.min(up, down) - 1;
  const removed = Math.abs(up - down);
  const base = `${ordinal(degree).replace(/^./, (c) => c.toUpperCase())} cousin`;
  return removed ? `${base}, ${removed === 1 ? 'once' : removed === 2 ? 'twice' : `${removed} times`} removed` : base;
}

/**
 * Telugu term(s) for the common relationships.
 * @returns {{ options: Array<{term, when?}>, missing: string[] } | null}
 */
function teluguTerms(signature, steps, ego, people, siblingOrder = null) {
  const person = (id) => people.get(String(id));
  const target = person(steps[steps.length - 1]?.id);
  const tg = genderOf(target);
  const egoG = genderOf(ego);
  const missing = new Set();
  const needGender = (p) => {
    if (!genderOf(p)) missing.add(`gender of ${p?.displayName || 'a person'}`);
  };
  const needAge = (a, b) => missing.add(`birth dates of ${a?.displayName} and ${b?.displayName}`);

  // Choose between male/female terms; unknown gender lists both.
  const byGender = (p, male, female) => {
    const g = genderOf(p);
    if (g === 'male') return [{ term: male }];
    if (g === 'female') return [{ term: female }];
    needGender(p);
    return [{ term: male, when: 'if male' }, { term: female, when: 'if female' }];
  };
  // Choose between elder/younger terms; unknown ages list both.
  const byAge = (a, b, elder, younger) => {
    const e = isElder(a, b, siblingOrder);
    if (e === true) return [{ term: elder }];
    if (e === false) return [{ term: younger }];
    needAge(a, b);
    return [{ term: elder, when: 'if elder' }, { term: younger, when: 'if younger' }];
  };
  const T = TELUGU;
  let options = null;

  switch (signature) {
    case 'P':
      options = byGender(target, T.nanna, T.amma);
      break;
    case 'C':
      options = byGender(target, T.koduku, T.kuthuru);
      break;
    case 'S':
      options = byGender(target, T.bharta, T.bharya);
      break;
    case 'B': {
      if (tg === 'male') options = byAge(target, ego, T.annayya, T.thammudu);
      else if (tg === 'female') options = byAge(target, ego, T.akka, T.chelli);
      else {
        needGender(target);
        options = [T.annayya, T.thammudu, T.akka, T.chelli].map((term) => ({ term }));
      }
      break;
    }
    case 'PP': {
      if (tg === 'male') options = [{ term: T.thatha }];
      else {
        const parent = person(steps[0].id);
        const paternal = byGender(parent, T.nanamma, T.ammamma);
        options = tg === 'female' ? paternal : [{ term: T.thatha, when: 'if male' }, ...paternal];
        if (!tg) needGender(target);
      }
      break;
    }
    case 'PPP':
      options = byGender(target, T.mutthatha, T.mutthavva);
      break;
    case 'CC':
      options = byGender(target, T.manavadu, T.manavaralu);
      break;
    case 'CCC':
      options = byGender(target, T.munimanavadu, T.munimanavaralu);
      break;
    case 'PB': {
      // Parent's sibling: side of the family and sibling's age vs the parent.
      const parent = person(steps[0].id);
      const pg = genderOf(parent);
      if (!pg) needGender(parent);
      if (!tg) needGender(target);
      const fathersBrother = byAge(target, parent, T.pedananna, T.chinnanna);
      const mothersSister = byAge(target, parent, T.peddamma, T.pinni);
      if (pg === 'male' && tg === 'male') options = fathersBrother;
      else if (pg === 'male' && tg === 'female') options = [{ term: T.atta }];
      else if (pg === 'female' && tg === 'male') options = [{ term: T.mamayya }];
      else if (pg === 'female' && tg === 'female') options = mothersSister;
      else options = [...fathersBrother, { term: T.atta }, { term: T.mamayya }, ...mothersSister];
      break;
    }
    case 'PBS': {
      // Parent's sibling's spouse.
      const parent = person(steps[0].id);
      const sibling = person(steps[1].id);
      const pg = genderOf(parent);
      const sg = genderOf(sibling);
      if (pg === 'male' && sg === 'male') options = byAge(sibling, parent, T.peddamma, T.pinni);
      else if (pg === 'male' && sg === 'female') options = [{ term: T.mamayya }];
      else if (pg === 'female' && sg === 'male') options = [{ term: T.atta }];
      else if (pg === 'female' && sg === 'female') options = byAge(sibling, parent, T.pedananna, T.chinnanna);
      else {
        needGender(pg ? sibling : parent);
        options = null;
      }
      break;
    }
    case 'PBC': {
      // Cousins: parallel cousins are called brother/sister; cross cousins
      // (father's sister's or mother's brother's children) are Bava/Vadina/...
      const parent = person(steps[0].id);
      const sibling = person(steps[1].id);
      const pg = genderOf(parent);
      const sg = genderOf(sibling);
      if (!pg || !sg) {
        needGender(pg ? sibling : parent);
        options = null;
        break;
      }
      const parallel = pg === sg;
      if (parallel) {
        options = tg === 'male'
          ? byAge(target, ego, T.annayya, T.thammudu)
          : tg === 'female'
            ? byAge(target, ego, T.akka, T.chelli)
            : (needGender(target), [T.annayya, T.thammudu, T.akka, T.chelli].map((term) => ({ term })));
      } else if (tg === 'male') {
        options = byAge(target, ego, T.bava, egoG === 'female' ? T.maridi : T.bavamaridi);
      } else if (tg === 'female') {
        options = byAge(target, ego, T.vadina, T.maradalu);
      } else {
        needGender(target);
        options = [T.bava, T.bavamaridi, T.vadina, T.maradalu].map((term) => ({ term }));
      }
      break;
    }
    case 'BC': {
      // Sibling's child: a cross-sex sibling's children are Menalludu/Menakodalu;
      // a same-sex sibling's children are called son/daughter.
      const sibling = person(steps[0].id);
      const sg = genderOf(sibling);
      if (!sg || !egoG) {
        if (!egoG) needGender(ego);
        if (!sg) needGender(sibling);
        options = byGender(target, T.menalludu, T.menakodalu);
        break;
      }
      options = sg !== egoG
        ? byGender(target, T.menalludu, T.menakodalu)
        : byGender(target, T.koduku, T.kuthuru);
      break;
    }
    case 'BS': {
      // Sibling's spouse, by the sibling's age vs me.
      const sibling = person(steps[0].id);
      const sg = genderOf(sibling);
      if (sg === 'male') options = byAge(sibling, ego, T.vadina, T.maradalu);
      else if (sg === 'female') options = byAge(sibling, ego, T.bava, egoG === 'female' ? T.maridi : T.bavamaridi);
      else {
        needGender(sibling);
        options = null;
      }
      break;
    }
    case 'SP':
      options = byGender(target, T.mamagaru, T.attagaru);
      break;
    case 'SB': {
      // Spouse's sibling, by age vs the spouse.
      const spouse = person(steps[0].id);
      const spg = genderOf(spouse);
      if (spg === 'female' && tg === 'male') options = byAge(target, spouse, T.bava, T.bavamaridi);
      else if (spg === 'female' && tg === 'female') options = byAge(target, spouse, T.vadina, T.maradalu);
      else if (spg === 'male' && tg === 'male') options = byAge(target, spouse, T.bava, T.maridi);
      else if (spg === 'male' && tg === 'female') options = [{ term: T.adapaduchu }];
      else {
        needGender(spg ? target : spouse);
        options = null;
      }
      break;
    }
    case 'CS':
      options = byGender(target, T.alludu, T.kodalu);
      break;
    default:
      options = null;
  }

  if (!options) return missing.size ? { options: [], missing: [...missing] } : null;
  return { options, missing: [...missing] };
}

/**
 * Describe how `toId` is related to `fromId`.
 * @returns {{
 *   found: boolean,
 *   path: Array<{id, name, step}>,
 *   english: string|null,      standard English name ("First cousin", "Uncle (by marriage)")
 *   description: string,       literal chain ("father's elder brother's son")
 *   telugu: Array<{term: {script, roman}, when?: string}>,
 *   missing: string[],          details that would make the answer exact
 * }}
 */
export function describeRelationship(persons, relationships, fromId, toId, { siblingOrder = null } = {}) {
  const people = new Map(persons.map((p) => [String(p.id), p]));
  const ego = people.get(String(fromId));
  const steps = findRelationshipPath(persons, relationships, fromId, toId);
  return describeSteps(steps, ego, people, fromId, toId, siblingOrder);
}

/**
 * How everyone is related to one person, from a single search: for each
 * other connected person, what `fromId` calls them.
 * @returns {Map<string, ReturnType<typeof describeRelationship>>}
 */
export function describeRelationshipsFrom(persons, relationships, fromId, { siblingOrder = null } = {}) {
  const { people, edges } = buildGraph(persons, relationships);
  const from = String(fromId);
  const out = new Map();
  const ego = people.get(from);
  if (!ego) return out;
  const prev = shortestPathTree(edges, from);
  prev.forEach((_, id) => {
    out.set(id, describeSteps(stepsTo(prev, from, id), ego, people, from, id, siblingOrder));
  });
  return out;
}

function describeSteps(steps, ego, people, fromId, toId, siblingOrder = null) {
  if (!ego || steps === null) {
    return { found: false, path: [], english: null, description: '', telugu: [], missing: [] };
  }

  const compressed = compressSteps(steps, fromId);
  const signature = compressed.map((s) => s.type).join('');
  const target = people.get(String(toId));

  const description = compressed
    .map((step) => {
      const p = people.get(step.id);
      const [male, female, neutral] = ENGLISH_STEP[step.type];
      let word = pick(genderOf(p), male, female, neutral);
      if (step.type === 'B') {
        const elder = isElder(p, people.get(step.from), siblingOrder);
        if (elder !== null) word = `${elder ? 'elder' : 'younger'} ${word}`;
      }
      return word;
    })
    .join("'s ");

  const telugu = teluguTerms(signature, compressed, ego, people, siblingOrder);

  return {
    found: true,
    path: [
      { id: String(fromId), name: ego.displayName, step: null },
      ...compressed.map((s) => ({ id: s.id, name: people.get(s.id)?.displayName, step: s.type })),
    ],
    english: signature === '' ? 'Self' : englishTerm(signature, target),
    description,
    telugu: telugu?.options || [],
    missing: telugu?.missing || [],
  };
}
