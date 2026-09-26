/**
 * ChangeHistoryModal — who changed what, and when, with one-click restore.
 * Synced families show the cloud log (every member's edits); local trees
 * show this device's log.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { describeChange, restoreLabel } from '../../history/describeChange.js';

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ChangeHistoryModal({ isOpen, onClose, canRestore = true, onSelectPerson }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await familyStore.loadChangeHistory());
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset only when the dialog opens (onClose changes identity on every parent render).
  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    refresh();
  }, [isOpen, refresh]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const nameOf = useCallback((id) => familyStore.getPersonById(id)?.displayName || 'a removed person', []);

  const described = useMemo(
    () =>
      entries
        .map((entry) => ({ entry, ...describeChange(entry, nameOf) }))
        .filter(({ summary, details }) => !query || `${summary} ${details.join(' ')}`.toLowerCase().includes(query.toLowerCase())),
    [entries, nameOf, query]
  );

  if (!isOpen) return null;

  const restore = async (entry) => {
    setMessage(null);
    try {
      familyStore.restoreChange(entry);
      setMessage({ type: 'success', text: 'Restored. The restore is also recorded in the history.' });
      setTimeout(refresh, entry.source === 'cloud' ? 1500 : 0);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not restore this change.' });
    }
  };

  let lastDay = '';
  return (
    <div className="ft-view-modal" role="dialog" aria-label="Change history">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container" style={{ maxWidth: '640px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">Who changed what</span>
            <h2 className="ft-view-modal__title">Change history</h2>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ft-modal-form-body">
          <div className="ft-form-field">
            <input
              type="search"
              placeholder="Filter by name or change…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter history"
            />
          </div>

          {message && (
            <p className={`ft-history__msg ft-history__msg--${message.type}`} role="status">
              {message.text}
            </p>
          )}

          {loading && entries.length === 0 && <p className="ft-kin-hint">Loading history…</p>}
          {!loading && described.length === 0 && (
            <p className="ft-kin-hint">No changes recorded yet. Edits to people and relationships will appear here.</p>
          )}

          <ol className="ft-history">
            {described.map(({ entry, summary, details }) => {
              const day = dayLabel(entry.at);
              const showDay = day !== lastDay;
              lastDay = day;
              const personId = entry.entityType === 'person' ? entry.entityId : null;
              return (
                <React.Fragment key={entry.id}>
                  {showDay && <li className="ft-history__day">{day}</li>}
                  <li className="ft-history__item">
                    <div className="ft-history__text">
                      <span className="ft-history__summary">
                        {personId && familyStore.getPersonById(personId) ? (
                          <button type="button" className="ft-history__link" onClick={() => onSelectPerson?.(personId)}>
                            {summary}
                          </button>
                        ) : (
                          summary
                        )}
                      </span>
                      {details.map((d) => (
                        <span key={d} className="ft-history__detail">
                          {d}
                        </span>
                      ))}
                      <span className="ft-history__time">
                        {new Date(entry.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    {canRestore && (
                      <button type="button" className="ft-form-btn ft-form-btn--secondary ft-history__restore" onClick={() => restore(entry)}>
                        {restoreLabel(entry)}
                      </button>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
