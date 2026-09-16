/**
 * EventModal Component — Modern Family Platform
 * Add and edit structured life milestones & timeline events.
 */

import React, { useState } from 'react';
import { getAllPersons } from '../../data/familyDataService.js';
import FamilyDatePicker from '../ui/FamilyDatePicker.jsx';
import { LocationCombobox } from '../ui/FamilyCombobox.jsx';

const EVENT_TYPES = [
  'Birth',
  'Marriage',
  'Education',
  'Career',
  'Relocation',
  'Achievement',
  'Family',
  'Travel',
  'Other',
];

export default function EventModal({
  isOpen,
  person,
  event = null,
  onClose,
  onSaveEvent,
}) {
  const [type, setType] = useState(event?.type || 'Milestone');
  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(event?.date || '');
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [relatedPersonIds, setRelatedPersonIds] = useState(event?.relatedPersonIds || []);
  const [errorMsg, setErrorMsg] = useState('');

  const familyId = person?.family_id || person?.familyId || null;

  const allPeople = getAllPersons();

  if (!isOpen || !person) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Event title is required.');
      return;
    }

    try {
      onSaveEvent({
        id: event?.id,
        personId: person.id,
        type,
        title: title.trim(),
        date: date || null,
        location: location.trim(),
        description: description.trim(),
        relatedPersonIds,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save event.');
    }
  };

  const toggleRelatedPerson = (id) => {
    setRelatedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Life Event Dialog">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-modal-form-container">
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">CHRONOLOGICAL TIMELINE</span>
            <h2 className="ft-view-modal__title">{event ? 'Edit Life Event' : 'Add Life Event'}</h2>
            <p className="ft-view-modal__subtitle">Document a milestone in {person.displayName}&apos;s life journey</p>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {errorMsg && (
          <div className="ft-form-error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ft-modal-form">
          <div className="ft-modal-form-body">
            <div className="ft-form-grid">
            <div className="ft-form-row ft-form-row--2">
              <div className="ft-form-field">
                <label>Event Category</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ft-form-field">
                <label>Date (Optional or Year)</label>
                <FamilyDatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="YYYY-MM-DD or Year"
                  ariaLabel="Event date"
                />
              </div>
            </div>

            <div className="ft-form-field">
              <label>Event Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Graduated from Osmania University"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="ft-form-field">
              <label>Location</label>
              <LocationCombobox
                value={location}
                onChange={setLocation}
                placeholder="e.g. Muthagudem, Hyderabad"
                ariaLabel="Event location"
                activeFamilyId={familyId}
              />
            </div>

            <div className="ft-form-field">
              <label>Description &amp; Context</label>
              <textarea
                rows="3"
                placeholder="Details of the event, significance, achievements or recollections..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Related Family Members Selector */}
            <div className="ft-form-field">
              <label>Related Family Members Present</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {allPeople.filter((p) => p.id !== person.id).map((p) => {
                  const isSelected = relatedPersonIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleRelatedPerson(p.id)}
                      className={`ft-details__rel-chip ${isSelected ? 'ft-details__rel-chip--active' : ''}`}
                      style={{
                        background: isSelected ? 'var(--ft-emerald-soft)' : 'var(--ft-surface-soft)',
                        borderColor: isSelected ? 'var(--ft-emerald)' : 'var(--ft-border)',
                        color: isSelected ? 'var(--ft-emerald)' : 'var(--ft-text-primary)',
                      }}
                    >
                      <span>{p.displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="ft-modal-footer">
            <button
              type="button"
              className="ft-form-btn ft-form-btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ft-form-btn ft-form-btn--primary"
            >
              {event ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
