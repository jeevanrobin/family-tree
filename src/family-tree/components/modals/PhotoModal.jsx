/**
 * PhotoModal Component — Modern Family Platform (Milestone 3D)
 * Add photographs to a person's album via secure cloud storage or image URL.
 * Supports file validation, upload progress, offline binary queueing, and primary portrait selection.
 */

import React, { useState, useRef } from 'react';
import { mediaStorageService } from '../../media/mediaStorageService.js';
import { useFamily } from '../../auth/FamilyContext.jsx';
import FamilyDatePicker from '../ui/FamilyDatePicker.jsx';
import { LocationCombobox } from '../ui/FamilyCombobox.jsx';

export default function PhotoModal({
  isOpen,
  person,
  onClose,
  onSavePhoto,
}) {
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ state: 'idle', percent: 0 });
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  // Safe family context consumption
  let familyId = 'local-family';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const familyCtx = useFamily();
    if (familyCtx?.activeFamily?.id) {
      familyId = familyCtx.activeFamily.id;
    }
  } catch {
    familyId = 'local-family';
  }

  if (!isOpen || !person) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    // Validate file
    const validation = mediaStorageService.validateFile(file, 'photo');
    if (!validation.valid) {
      setErrorMsg(validation.error);
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type,
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        setSrc(dataUrl);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!src.trim() && !selectedFile) {
      setErrorMsg('Please choose a local image file or provide an image URL.');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ state: 'uploading', percent: 20 });

    try {
      if (selectedFile) {
        // Upload via media storage service
        const uploadResult = await mediaStorageService.uploadPhoto({
          familyId,
          personId: person.id,
          file: selectedFile,
          title: title.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''),
          caption: caption.trim(),
          date: date.trim(),
          location: location.trim(),
          isPrimary,
          onProgress: (p) => setUploadProgress(p),
        });

        onSavePhoto({
          ...uploadResult.metadata,
          personId: person.id,
          relatedPersonIds: [person.id],
        });
      } else {
        // Standard URL input
        onSavePhoto({
          personId: person.id,
          src: src.trim(),
          title: title.trim() || `${person.displayName} — Photograph`,
          caption: caption.trim(),
          date: date.trim(),
          location: location.trim(),
          isPrimary,
          relatedPersonIds: [person.id],
        });
      }

      onClose();
    } catch (err) {
      console.error('Error saving photo:', err);
      setErrorMsg(err.message || 'Failed to upload photograph.');
      setUploadProgress({ state: 'failed', percent: 0 });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Add Photograph">
      <div className="ft-view-modal__backdrop" onClick={!isUploading ? onClose : undefined} />
      <div className="ft-view-modal__container ft-modal-form-container">
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">PHOTOGRAPHY ARCHIVE</span>
            <h2 className="ft-view-modal__title">Add Photograph</h2>
            <p className="ft-view-modal__subtitle">Add a photo to {person.displayName}&apos;s album gallery</p>
          </div>
          <button
            className="ft-view-modal__close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isUploading}
          >
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

        {isUploading && (
          <div style={{
            margin: '0 24px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(249, 115, 22, 0.1)',
            border: '1px solid rgba(249, 115, 22, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#f97316', marginBottom: '6px' }}>
              <span>Uploading to secure cloud storage...</span>
              <span>{uploadProgress.percent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${uploadProgress.percent}%`,
                height: '100%',
                background: '#f97316',
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ft-modal-form">
          <div className="ft-modal-form-body">
            <div className="ft-form-grid">
            {/* Image Preview & Upload options */}
            <div className="ft-form-field">
              <label>Choose Photo (JPEG, PNG, WEBP — up to 15MB)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste URL or choose file from computer..."
                  value={src}
                  onChange={(e) => {
                    setSrc(e.target.value);
                    setSelectedFile(null);
                    setFileDetails(null);
                  }}
                  disabled={isUploading}
                  style={{ flex: 1 }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload from computer"
                  disabled={isUploading}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Choose File</span>
                </button>
              </div>

              {fileDetails && (
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px', display: 'flex', gap: '12px' }}>
                  <span>File: {fileDetails.name}</span>
                  <span>Size: {fileDetails.size}</span>
                </div>
              )}
            </div>

            {src && (
              <div style={{
                borderRadius: '12px',
                overflow: 'hidden',
                maxHeight: '180px',
                background: 'var(--ft-surface-soft)',
                border: '1px solid var(--ft-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={src}
                  alt="Preview"
                  style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }}
                  onError={() => setErrorMsg('Unable to preview image.')}
                />
              </div>
            )}

            <div className="ft-form-field">
              <label>Photo Title</label>
              <input
                type="text"
                placeholder="e.g. Summer Gathering in Jubilee Hills"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="ft-form-row ft-form-row--2">
              <div className="ft-form-field">
                <label>Date / Year</label>
                <FamilyDatePicker
                  value={date}
                  onChange={setDate}
                  disabled={isUploading}
                  placeholder="e.g. 1985 or YYYY-MM-DD"
                  allowPartial={true}
                  ariaLabel="Photograph date or year"
                />
              </div>
              <div className="ft-form-field">
                <label>Location</label>
                <LocationCombobox
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. Muthagudem, Hyderabad"
                  ariaLabel="Photograph location"
                  disabled={isUploading}
                  activeFamilyId={familyId}
                />
              </div>
            </div>

            <div className="ft-form-field">
              <label>Caption &amp; Memory</label>
              <textarea
                rows="2"
                placeholder="Context, people pictured, or recollection..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="ft-form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="isPrimaryPhoto"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
                disabled={isUploading}
              />
              <label htmlFor="isPrimaryPhoto" style={{ cursor: 'pointer', margin: 0, fontWeight: '700', color: 'var(--ft-emerald)' }}>
                Set as Primary Profile Portrait
              </label>
            </div>
          </div>
        </div>

        <div className="ft-modal-footer">
            <button
              type="button"
              className="ft-form-btn ft-form-btn--secondary"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ft-form-btn ft-form-btn--primary"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Save to Album'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
