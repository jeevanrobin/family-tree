/**
 * FamilyListView — a simple, phone-friendly view of one person's close
 * family: parents above, spouse and siblings beside, children below. Tap
 * anyone to move to them; open their full details from the centre card.
 */

import React, { useMemo, useState } from 'react';
import familyStore from '../store/FamilyStore.js';

const nameOf = (p) => p?.displayName || [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Unnamed';
const initials = (p) =>
  nameOf(p)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

function Avatar({ person, big = false }) {
  const [failed, setFailed] = useState(false);
  const src = person.photo || person.photoUrl;
  const cls = `ft-list-view__avatar ${big ? 'ft-list-view__avatar--big' : ''}`;
  if (src && !failed) return <img className={cls} src={src} alt="" onError={() => setFailed(true)} />;
  return (
    <span className={cls} aria-hidden="true">
      {initials(person)}
    </span>
  );
}

function PersonChip({ person, onPick, isMe }) {
  const late = person.livingStatus === 'deceased';
  return (
    <button type="button" className="ft-list-view__chip" onClick={() => onPick(person.id)}>
      <Avatar person={person} />
      <span className="ft-list-view__chip-name">
        {late && <span className="ft-list-view__late">🪔 Late </span>}
        {nameOf(person)}
        {isMe && <span className="ft-list-view__me"> (me)</span>}
      </span>
    </button>
  );
}

function Group({ title, people, onPick, meId }) {
  if (!people.length) return null;
  return (
    <section className="ft-list-view__group">
      <h3 className="ft-list-view__heading">
        {title} <span>{people.length}</span>
      </h3>
      <div className="ft-list-view__chips">
        {people.map((p) => (
          <PersonChip key={p.id} person={p} onPick={onPick} isMe={String(p.id) === String(meId)} />
        ))}
      </div>
    </section>
  );
}

export default function FamilyListView({ personId, meId, relationships, onPick, onOpenDetails, onClose }) {
  const family = useMemo(() => {
    const person = familyStore.getPersonById(personId);
    if (!person) return null;
    return {
      person,
      parents: familyStore.getParents(personId),
      spouses: familyStore.getSpouses(personId),
      siblings: familyStore.getSiblings(personId),
      children: familyStore.getChildren(personId),
    };
    // relationships changes identity on every store update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, relationships]);

  return (
    <div className="ft-list-view" role="region" aria-label="Family list">
      <div className="ft-list-view__bar">
        <strong>Family list</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          {meId && String(meId) !== String(personId) && (
            <button type="button" className="ft-form-btn ft-form-btn--secondary" onClick={() => onPick(meId)}>
              Me
            </button>
          )}
          <button type="button" className="ft-form-btn ft-form-btn--primary" onClick={onClose}>
            Tree view
          </button>
        </div>
      </div>

      {!family ? (
        <p className="ft-list-view__empty">Tap a person on the tree, or search, to see their family here.</p>
      ) : (
        <div className="ft-list-view__body">
          <Group title="Parents" people={family.parents} onPick={onPick} meId={meId} />
          <button type="button" className="ft-list-view__centre" onClick={() => onOpenDetails(family.person.id)}>
            <Avatar person={family.person} big />
            <span>
              <span className="ft-list-view__centre-name">
                {nameOf(family.person)}
                {String(family.person.id) === String(meId) && <span className="ft-list-view__me"> (me)</span>}
              </span>
              <span className="ft-list-view__centre-hint">Tap for full details</span>
            </span>
          </button>
          <Group title={family.spouses.length > 1 ? 'Spouses' : 'Spouse'} people={family.spouses} onPick={onPick} meId={meId} />
          <Group title="Brothers & sisters" people={family.siblings} onPick={onPick} meId={meId} />
          <Group title="Children" people={family.children} onPick={onPick} meId={meId} />
        </div>
      )}
    </div>
  );
}
