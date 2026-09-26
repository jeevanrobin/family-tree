/**
 * RelationshipFinderModal — "How are we related?"
 * Pick two people; shows the Telugu kinship term (script + romanized), the
 * English relationship, the literal chain and the path through the family.
 */

import React, { useEffect, useMemo, useState } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { describeRelationship, siblingOrderFromLayout } from '../../kinship/kinshipEngine.js';
import { computeTreeLayout } from '../../engine/treeLayout.js';
import { getInitials, getAvatarGradient } from '../../utils/familyHelpers.js';

const STEP_LABEL = { P: 'parent', C: 'child', S: 'spouse', B: 'sibling' };

function PersonPicker({ label, value, onChange, people, excludeId, hintOf }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = people.find((p) => p.id === value) || null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => p.id !== excludeId)
      .filter((p) => !q || (p.displayName || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [people, query, excludeId]);

  return (
    <div className="ft-form-field ft-kin-picker">
      <label>{label}</label>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-label={label}
        placeholder="Search family members…"
        value={open ? query : selected?.displayName || ''}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && matches.length > 0 && (
        <ul className="ft-kin-picker__list" role="listbox">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
              >
                <span className="ft-kin-avatar" style={{ background: getAvatarGradient(p) }}>
                  {getInitials(p)}
                </span>
                <span className="ft-kin-picker__name">
                  {p.displayName}
                  {hintOf(p.id) && <small>{hintOf(p.id)}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RelationshipFinderModal({ isOpen, fromPersonId, onClose, onSelectPerson }) {
  const [fromId, setFromId] = useState(fromPersonId || null);
  const [toId, setToId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFromId(fromPersonId || null);
      setToId(null);
    }
  }, [isOpen, fromPersonId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const snapshot = isOpen ? familyStore.getSnapshot() : null;
  const people = useMemo(
    () => (snapshot ? [...snapshot.people].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen]
  );

  const result = useMemo(() => {
    if (!snapshot || !fromId || !toId) return null;
    // Elder/younger: birth dates, else sibling card order (left = elder).
    const layout = computeTreeLayout(snapshot.people, snapshot.relationships, {
      customSiblingOrders: snapshot.siblingOrder || {},
    });
    return describeRelationship(snapshot.people, snapshot.relationships, fromId, toId, {
      siblingOrder: siblingOrderFromLayout(layout, snapshot.relationships),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, toId, isOpen]);

  if (!isOpen) return null;

  const nameOf = (id) => people.find((p) => p.id === id)?.displayName || '';
  // Parents' names tell apart people who share a name (e.g. a grandson named after his grandfather).
  const hintOf = (id) => {
    const parents = (snapshot?.relationships || [])
      .filter((r) => r.type === 'parent-child' && String(r.childId) === String(id))
      .map((r) => nameOf(String(r.parentId)))
      .filter(Boolean);
    return parents.length ? `child of ${parents.join(' & ')}` : '';
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="How are we related?">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-kin-modal" style={{ maxWidth: '560px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">బంధుత్వం · Relationship</span>
            <h2 className="ft-view-modal__title">How are we related?</h2>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ft-modal-form-body">
          <div className="ft-kin-pickers">
            <PersonPicker label="From" value={fromId} onChange={setFromId} people={people} excludeId={toId} hintOf={hintOf} />
            <button
              type="button"
              className="ft-kin-swap"
              onClick={() => {
                setFromId(toId);
                setToId(fromId);
              }}
              disabled={!fromId || !toId}
              aria-label="Swap people"
              title="Swap"
            >
              ⇄
            </button>
            <PersonPicker label="To" value={toId} onChange={setToId} people={people} excludeId={fromId} hintOf={hintOf} />
          </div>

          {!result && <p className="ft-kin-hint">Choose two people to see what they call each other.</p>}

          {result && !result.found && (
            <p className="ft-kin-hint">
              {nameOf(fromId)} and {nameOf(toId)} are not connected in this tree yet.
            </p>
          )}

          {result?.found && (
            <div className="ft-kin-result" aria-live="polite">
              <p className="ft-kin-sentence">
                <strong>{nameOf(toId)}</strong> is <strong>{nameOf(fromId)}</strong>’s
              </p>

              {result.telugu.length > 0 && (
                <div className="ft-kin-terms">
                  {result.telugu.map(({ term, when }) => (
                    <div key={term.roman + (when || '')} className="ft-kin-term">
                      <span className="ft-kin-term__script" lang="te">{term.script}</span>
                      <span className="ft-kin-term__roman">{term.roman}</span>
                      {when && <span className="ft-kin-term__when">{when}</span>}
                    </div>
                  ))}
                </div>
              )}

              <p className="ft-kin-english">
                {result.english && <span className="ft-kin-english__term">{result.english}</span>}
                {result.description && <span className="ft-kin-english__chain">{result.description}</span>}
              </p>

              {result.missing.length > 0 && (
                <p className="ft-kin-missing">
                  To be exact, add the {result.missing.join(', and the ')}.
                </p>
              )}

              <ol className="ft-kin-path" aria-label="Connection path">
                {result.path.map((step, i) => (
                  <li key={step.id + i}>
                    {step.step && <span className="ft-kin-path__via">{STEP_LABEL[step.step]}</span>}
                    <button type="button" onClick={() => onSelectPerson?.(step.id)} className="ft-kin-path__name">
                      {step.name}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
