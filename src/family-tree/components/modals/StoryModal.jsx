/**
 * StoryModal Component — Modern Family Platform
 * Create and edit rich family stories, memoirs, and oral histories.
 */

import React, { useState } from 'react';
import { getAllPersons } from '../../data/familyDataService.js';
import FamilyDatePicker from '../ui/FamilyDatePicker.jsx';
import { LocationCombobox } from '../ui/FamilyCombobox.jsx';
import VoiceRecorder from '../VoiceRecorder.jsx';
import { useMediaUrl } from '../../hooks/useMediaUrl.js';
import { mediaStorageService, DOCUMENT_BUCKET } from '../../media/mediaStorageService.js';

// Local-mode recordings live in the browser with the rest of the tree.
const MAX_LOCAL_AUDIO_BYTES = 3 * 1024 * 1024;

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export default function StoryModal({
  isOpen,
  person,
  story = null,
  onClose,
  onSaveStory,
  isLocalMode = true,
  cloudFamilyId = null,
}) {
  const [title, setTitle] = useState(story?.title || '');
  const [content, setContent] = useState(story?.content || '');
  const [date, setDate] = useState(story?.date || '');
  const [location, setLocation] = useState(story?.location || '');
  const [narrator, setNarrator] = useState(story?.narrator || (person?.displayName || ''));
  const [relatedPersonIds, setRelatedPersonIds] = useState(story?.relatedPersonIds || []);
  const [errorMsg, setErrorMsg] = useState('');
  const [recording, setRecording] = useState(null); // new, unsaved recording
  const [saving, setSaving] = useState(false);
  const existingAudioUrl = useMediaUrl(story?.audioPath || '', story?.audioSrc || '', DOCUMENT_BUCKET);
  const hasSavedAudio = Boolean(story?.audioPath || story?.audioSrc);

  const familyId = person?.family_id || person?.familyId || null;

  const allPeople = getAllPersons();

  if (!isOpen || !person) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!content.trim() && !recording && !hasSavedAudio) {
      setErrorMsg('Write the story or record it.');
      return;
    }

    // Store a new recording: in the cloud for synced families, in the browser otherwise.
    let audio = {
      audioPath: story?.audioPath || null,
      audioSrc: story?.audioSrc || null,
      audioMimeType: story?.audioMimeType || null,
      audioDurationSec: story?.audioDurationSec || null,
      transcriptLanguage: story?.transcriptLanguage || null,
    };
    if (recording) {
      setSaving(true);
      try {
        if (!isLocalMode && cloudFamilyId) {
          const uploaded = await mediaStorageService.uploadAudio({
            familyId: cloudFamilyId,
            blob: recording.blob,
            mimeType: recording.mimeType,
          });
          audio = { ...audio, audioPath: uploaded.storagePath, audioSrc: null, audioMimeType: uploaded.mimeType };
        } else {
          if (recording.blob.size > MAX_LOCAL_AUDIO_BYTES) {
            throw new Error('This recording is too long to keep in the browser (about 10 minutes max). Record a shorter one.');
          }
          audio = { ...audio, audioPath: null, audioSrc: await blobToDataUrl(recording.blob), audioMimeType: recording.mimeType };
        }
        audio.audioDurationSec = recording.durationSec;
        audio.transcriptLanguage = recording.language;
      } catch (err) {
        setSaving(false);
        setErrorMsg(err.message || 'Could not save the recording.');
        return;
      }
      setSaving(false);
    }

    try {
      onSaveStory({
        ...audio,
        id: story?.id,
        personId: person.id,
        title: title.trim() || 'Family Memory',
        content: content.trim() || (recording || hasSavedAudio ? '(Voice recording)' : ''),
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
              <label>Voice recording</label>
              <VoiceRecorder
                existingUrl={existingAudioUrl}
                onChange={setRecording}
                onTranscript={(text) => setContent((prev) => (prev ? `${prev.trimEnd()} ${text}` : text))}
              />
            </div>

            <div className="ft-form-field">
              <label>Story &amp; Recollection</label>
              <textarea
                rows="5"
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
              disabled={saving}
            >
              {saving ? 'Saving recording…' : story ? 'Update Story' : 'Save Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
