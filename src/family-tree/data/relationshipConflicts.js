/**
 * Finds relationships that contradict each other, e.g. two people saved as
 * both husband/wife and parent/child, or someone recorded as their own
 * ancestor. The tree still draws (the layout skips the loop), but these
 * records should be corrected.
 */

function parentChildPair(r) {
  return [String(r.parentId ?? r.personId1), String(r.childId ?? r.personId2)];
}

function spousePair(r) {
  return [String(r.personAId ?? r.personId1 ?? r.person1Id), String(r.personBId ?? r.personId2 ?? r.person2Id)];
}

export function findRelationshipConflicts(persons, relationships) {
  const nameOf = new Map((persons || []).map((p) => [String(p.id), p.displayName || p.firstName || String(p.id)]));
  const conflicts = [];
  const children = new Map();
  const parentPairs = new Set();

  (relationships || []).forEach((r) => {
    if (r.type !== 'parent-child') return;
    const [parent, child] = parentChildPair(r);
    if (parent === child) {
      conflicts.push({ kind: 'own-parent', ids: [parent], message: `${nameOf.get(parent)} is recorded as their own parent` });
      return;
    }
    parentPairs.add(`${parent}|${child}`);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(child);
  });

  (relationships || []).forEach((r) => {
    if (r.type !== 'spouse') return;
    const [a, b] = spousePair(r);
    if (parentPairs.has(`${a}|${b}`) || parentPairs.has(`${b}|${a}`)) {
      conflicts.push({
        kind: 'spouse-and-parent',
        ids: [a, b],
        message: `${nameOf.get(a)} and ${nameOf.get(b)} are recorded as both spouses and parent/child`,
      });
    }
  });

  // Ancestor loops: someone reachable from themselves by going down.
  const state = new Map(); // id -> 1 visiting, 2 done
  const reported = new Set();
  const visit = (start) => {
    const stack = [[start, 0]];
    const path = [];
    while (stack.length) {
      const [id, i] = stack[stack.length - 1];
      if (i === 0) {
        state.set(id, 1);
        path.push(id);
      }
      const kids = children.get(id) || [];
      if (i < kids.length) {
        stack[stack.length - 1][1] = i + 1;
        const next = kids[i];
        if (state.get(next) === 1) {
          const loop = path.slice(path.indexOf(next));
          const key = [...loop].sort().join('|');
          if (!reported.has(key)) {
            reported.add(key);
            conflicts.push({
              kind: 'ancestor-loop',
              ids: loop,
              message: `${loop.map((x) => nameOf.get(x)).join(' → ')} → ${nameOf.get(next)} forms a loop (someone is their own ancestor)`,
            });
          }
        } else if (!state.has(next)) {
          stack.push([next, 0]);
        }
      } else {
        state.set(id, 2);
        path.pop();
        stack.pop();
      }
    }
  };
  children.forEach((_, id) => {
    if (!state.has(id)) visit(id);
  });

  return conflicts;
}
