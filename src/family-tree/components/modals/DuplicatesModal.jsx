/**
 * DuplicatesModal — review people who were probably entered twice and merge
 * them. Pairs marked "Not the same person" are remembered per family.
 */

import React, { useEffect, useMemo, useState } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { findDuplicateCandidates, pairKey } from '../../duplicates/duplicateFinder.js';

const dismissedKey = () => `family-tree-not-duplicates-${familyStore.repository?.familyId || 'local'}`;

function loadDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(dismissedKey()) || '[]'));
  } catch {
    return new Set();
  }
}

function saveDismissed(set) {
  try {
    localStorage.setItem(dismissedKey(), JSON.stringify([...set]));
  } catch {
    /* storage unavailable */
  }
}

const ROWS = [
  ['Born', (p) => p.dateOfBirth || ''],
  ['Died', (p) => p.dateOfDeath || ''],
  ['Gender', (p) => (p.gender === 'unspecified' ? '' : p.gender || '')],
  ['Birthplace', (p) => p.placeOfBirth || ''],
  ['Lives in', (p) => p.currentLocation || ''],
  ['Occupation', (p) => p.occupation || ''],
  ['Parents', (p) => familyStore.getParents(p.id).map((x) => x.displayName).join(', ')],
  ['Spouse', (p) => familyStore.getSpouses(p.id).map((x) => x.displayName).join(', ')],
  ['Children', (p) => String(familyStore.getChildren(p.id).length || '')],
];

export default function DuplicatesModal({ isOpen, onClose, canMerge = true, onSelectPerson }) {
  const [version, setVersion] = useState(0);
  const [dismissed, setDismissed] = useState(() => loadDismissed());
  const [keepChoice, setKeepChoice] = useState({});
  const [message, setMessage] = useState(null);

  // Reset only when the dialog opens (onClose changes identity on every parent render).
  useEffect(() => {
    if (!isOpen) return;
    setDismissed(loadDismissed());
    setMessage(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const candidates = useMemo(() => {
    if (!isOpen) return [];
    const snap = familyStore.getSnapshot();
    return findDuplicateCandidates(snap.people, snap.relationships, { dismissed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dismissed, version]);

  if (!isOpen) return null;

  const notDuplicates = (a, b) => {
    const next = new Set(dismissed);
    next.add(pairKey(a.id, b.id));
    saveDismissed(next);
    setDismissed(next);
  };

  const merge = (a, b) => {
    const keepId = keepChoice[pairKey(a.id, b.id)] || a.id;
    const removeId = keepId === a.id ? b.id : a.id;
    try {
      const kept = familyStore.mergePeople(keepId, removeId);
      setMessage({ type: 'success', text: `Merged into ${kept.displayName}. You can undo it from Change history.` });
      setVersion((v) => v + 1);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Merge failed.' });
    }
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Find duplicates">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container" style={{ maxWidth: '760px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">Tidy the tree</span>
            <h2 className="ft-view-modal__title">Possible duplicates</h2>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ft-modal-form-body">
          {message && (
            <p className={`ft-history__msg ft-history__msg--${message.type}`} role="status">
              {message.text}
            </p>
          )}

          {candidates.length === 0 ? (
            <p className="ft-kin-hint">
              No likely duplicates found. People with similar names, matching details and no conflicting information
              show up here.
            </p>
          ) : (
            <ol className="ft-dups">
              {candidates.map(({ a, b, reasons }) => {
                const key = pairKey(a.id, b.id);
                const keepId = keepChoice[key] || a.id;
                return (
                  <li key={key} className="ft-dups__pair">
                    <p className="ft-dups__reasons">{reasons.join(' · ')}</p>
                    <table className="ft-dups__table">
                      <thead>
                        <tr>
                          <th scope="col">Keep</th>
                          {[a, b].map((p) => (
                            <th key={p.id} scope="col">
                              <label className="ft-dups__keep">
                                <input
                                  type="radio"
                                  name={`keep-${key}`}
                                  checked={keepId === p.id}
                                  onChange={() => setKeepChoice((c) => ({ ...c, [key]: p.id }))}
                                  disabled={!canMerge}
                                />
                                <button type="button" className="ft-history__link" onClick={() => onSelectPerson?.(p.id)}>
                                  {p.displayName}
                                </button>
                              </label>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ROWS.map(([label, get]) => {
                          const va = get(a);
                          const vb = get(b);
                          if (!va && !vb) return null;
                          return (
                            <tr key={label} className={va && vb && va !== vb ? 'ft-dups__row--differs' : ''}>
                              <th scope="row">{label}</th>
                              <td>{va || '—'}</td>
                              <td>{vb || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="ft-dups__actions">
                      <button type="button" className="ft-form-btn ft-form-btn--secondary" onClick={() => notDuplicates(a, b)}>
                        Not the same person
                      </button>
                      {canMerge && (
                        <button type="button" className="ft-form-btn ft-form-btn--primary" onClick={() => merge(a, b)}>
                          Merge into {(keepId === a.id ? a : b).displayName}
                        </button>
                      )}
                    </div>
                    <p className="ft-dups__note">
                      Missing details are filled from the other record; relationships, stories, photos and documents
                      move to the kept person.
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
