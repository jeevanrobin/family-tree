/**
 * StoryModal Component — Modern Family Platform
 * Create and edit rich family stories, memoirs, and oral histories.
 */

import React, { useState } from 'react';
import { getAllPersons } from '../../data/familyDataService.js';
import FamilyDatePicker from '../ui/FamilyDatePicker.jsx';
import { LocationCombobox } from '../ui/FamilyCombobox.jsx';

export default function StoryModal({
  isOpen,
  person,
  story = null,
  onClose,
  onSaveStory,
}) {
  const [title, setTitle] = useState(story?.title || '');
  const [content, setContent] = useState(story?.content || '');
  const [date, setDate] = useState(story?.date || '');
  const [location, setLocation] = useState(story?.location || '');
  const [narrator, setNarrator] = useState(story?.narrator || (person?.displayName || ''));
  const [relatedPersonIds, setRelatedPersonIds] = useState(story?.relatedPersonIds || []);
  const [errorMsg, setErrorMsg] = useState('');

  const familyId = person?.family_id || person?.familyId || null;

  const allPeople = getAllPersons();

  if (!isOpen || !person) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!content.trim()) {
      setErrorMsg('Story content is required.');
      return;
    }

    try {
      onSaveStory({
        id: story?.id,
        personId: person.id,
        title: title.trim() || 'Family Memory',
        content: content.trim(),
        date: date || null,
        location: location.trim(),
        narrator: narrator.trim(),
        relatedPersonIds,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save story.');
    }
  };

  const toggleRelatedPerson = (id) => {
    setRelatedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Family Story & Memory">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-modal-form-container">
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">FAMILY MEMORIES</span>
            <h2 className="ft-view-modal__title">{story ? 'Edit Memory' : 'Record Memory'}</h2>
            <p className="ft-view-modal__subtitle">Document an oral history or personal story for {person.displayName}</p>
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
            <div className="ft-form-field">
              <label>Story Title</label>
              <input
                type="text"
                placeholder="e.g. The House by the Lake"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="ft-form-row ft-form-row--3">
              <div className="ft-form-field">
                <label>Date / Year</label>
                <FamilyDatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="e.g. 1978 or YYYY-MM-DD"
                  allowPartial={true}
                  ariaLabel="Story date or year"
                />
              </div>
              <div className="ft-form-field">
                <label>Location</label>
                <LocationCombobox
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. Muthagudem, Hyderabad"
                  ariaLabel="Story location"
                  activeFamilyId={familyId}
                />
              </div>
              <div className="ft-form-field">
                <label>Narrator / Storyteller</label>
                <input
                  type="text"
                  placeholder="e.g. Padma Medida"
                  value={narrator}
                  onChange={(e) => setNarrator(e.target.value)}
                />
              </div>
            </div>

            <div className="ft-form-field">
              <label>Story &amp; Recollection *</label>
              <textarea
                rows="5"
                required
                placeholder="Every summer, the entire family would convene at the lakeside home in Hyderabad..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* Related Family Members Selector */}
            <div className="ft-form-field">
              <label>Related Family Members Mentioned</label>
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
              {story ? 'Update Story' : 'Save Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
