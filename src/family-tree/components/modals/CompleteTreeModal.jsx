/**
 * CompleteTreeModal — steps through people with missing details one at a
 * time: gender first (it decides relationship names), then places. Only
 * asks what is missing; everything is optional and can be skipped.
 */

import React, { useEffect, useState } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { findTreeGaps, knownPlaces } from '../../completeness/treeGaps.js';

export default function CompleteTreeModal({ isOpen, onClose, onSelectPerson }) {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState(0);
  const [gender, setGender] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [error, setError] = useState('');

  // Take the list once per opening so saving doesn't reshuffle it.
  useEffect(() => {
    if (!isOpen) return;
    const snap = familyStore.getSnapshot();
    setQueue(findTreeGaps(snap.people, snap.relationships));
    setIndex(0);
    setSaved(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const current = queue[index];

  if (!isOpen) return null;

  // Recomputed each step so places typed for one person are suggested next.
  const places = knownPlaces(familyStore.getSnapshot().people);
  const done = index >= queue.length;
  const next = () => {
    setGender('');
    setPlaceOfBirth('');
    setCurrentLocation('');
    setError('');
    setIndex((i) => i + 1);
  };

  const save = () => {
    const updates = {};
    if (gender) updates.gender = gender;
    if (placeOfBirth.trim()) updates.placeOfBirth = placeOfBirth.trim();
    if (currentLocation.trim()) updates.currentLocation = currentLocation.trim();
    if (Object.keys(updates).length === 0) return next();
    try {
      familyStore.updatePerson(current.person.id, updates);
      setSaved((n) => n + 1);
      next();
    } catch (err) {
      setError(err.message || 'Could not save.');
    }
  };

  const asks = current?.missing || [];
  const name = current?.person.displayName || current?.person.firstName;

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Complete the tree">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-complete" style={{ maxWidth: '560px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">
              {done ? 'Finished' : `${index + 1} of ${queue.length}`}
            </span>
            <h2 className="ft-view-modal__title">Complete the tree</h2>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ft-complete__progress" aria-hidden="true">
          <span style={{ width: `${queue.length ? (Math.min(index, queue.length) / queue.length) * 100 : 100}%` }} />
        </div>

        <div className="ft-modal-form-body">
          {done ? (
            <div className="ft-complete__done">
              <p className="ft-complete__done-title">
                {queue.length === 0 ? 'Everyone’s details are filled in.' : `Updated ${saved} ${saved === 1 ? 'person' : 'people'}.`}
              </p>
              {queue.length > 0 && saved < queue.length && (
                <p className="ft-kin-hint">Skipped people will be asked again next time.</p>
              )}
              <div className="ft-complete__actions">
                <button type="button" className="ft-form-btn ft-form-btn--primary" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <div className="ft-complete__person">
                <button
                  type="button"
                  className="ft-history__link ft-complete__name"
                  onClick={() => onSelectPerson?.(current.person.id)}
                  title="Show on the tree"
                >
                  {name}
                </button>
                {current.context && <p className="ft-complete__context">{current.context}</p>}
              </div>

              {asks.includes('gender') && (
                <fieldset className="ft-complete__field">
                  <legend>Is {name} male or female?</legend>
                  <p className="ft-kin-hint">Needed for relationship names like Annayya / Akka.</p>
                  <div className="ft-complete__choices">
                    {[
                      ['male', 'Male'],
                      ['female', 'Female'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`ft-complete__choice ${gender === value ? 'ft-complete__choice--on' : ''}`}
                        aria-pressed={gender === value}
                        onClick={() => setGender(gender === value ? '' : value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {asks.includes('placeOfBirth') && (
                <div className="ft-form-field">
                  <label htmlFor="ft-complete-birthplace">Where was {name} born? (village or town)</label>
                  <input
                    id="ft-complete-birthplace"
                    type="text"
                    list="ft-complete-places"
                    value={placeOfBirth}
                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                    placeholder="Leave empty if not known"
                  />
                </div>
              )}

              {asks.includes('currentLocation') && (
                <div className="ft-form-field">
                  <label htmlFor="ft-complete-lives">Where does {name} live now?</label>
                  <input
                    id="ft-complete-lives"
                    type="text"
                    list="ft-complete-places"
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                    placeholder="Leave empty if not known"
                  />
                </div>
              )}

              <datalist id="ft-complete-places">
                {places.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>

              {error && <p className="ft-voice__error">{error}</p>}

              <div className="ft-complete__actions">
                <button type="button" className="ft-form-btn" onClick={next}>
                  Skip
                </button>
                <button type="submit" className="ft-form-btn ft-form-btn--primary">
                  Save &amp; next
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
