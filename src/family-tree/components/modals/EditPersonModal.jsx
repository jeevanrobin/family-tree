/**
 * EditPersonModal Component — Modern Family Platform
 * Edit person profiles with immediate reactivity and M3D device photo upload.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getPersonInitialState, preparePersonUpdates } from '../../utils/personFormHelpers.js';
import { mediaStorageService } from '../../media/mediaStorageService.js';
import familyStore from '../../store/FamilyStore.js';
import { useFamily } from '../../auth/FamilyContext.jsx';
import { canEditPerson, canUploadMedia } from '../../auth/roles.js';
import ProfilePhotoUpload from './ProfilePhotoUpload.jsx';
import FamilyDatePicker from '../ui/FamilyDatePicker.jsx';
import { LocationCombobox, OccupationCombobox } from '../ui/FamilyCombobox.jsx';

export default function EditPersonModal({
  isOpen,
  person,
  onClose,
  onUpdatePerson,
}) {
  const initial = useMemo(() => getPersonInitialState(person), [person]);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [middleName, setMiddleName] = useState(initial.middleName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [gender, setGender] = useState(initial.gender);
  const [livingStatus, setLivingStatus] = useState(initial.livingStatus);
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth);
  const [dateOfDeath, setDateOfDeath] = useState(initial.dateOfDeath);
  const [placeOfBirth, setPlaceOfBirth] = useState(initial.placeOfBirth);
  const [hometown, setHometown] = useState(initial.hometown);
  const [currentLocation, setCurrentLocation] = useState(initial.currentLocation);
  const [occupation, setOccupation] = useState(initial.occupation);
  const [biography, setBiography] = useState(initial.biography);
  const [notes, setNotes] = useState(initial.notes);

  // Profile Photo Upload State
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState({ state: 'idle', percent: 0 });

  const [errorMsg, setErrorMsg] = useState('');

  // Determine active family & role permissions
  let currentRole = 'owner';
  let familyId = 'local-family';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const familyCtx = useFamily();
    if (familyCtx?.currentRole) currentRole = familyCtx.currentRole;
    if (familyCtx?.activeFamily?.id) familyId = familyCtx.activeFamily.id;
  } catch {
    currentRole = 'owner';
    familyId = 'local-family';
  }
  const canEdit = canEditPerson(currentRole);
  const canUpload = canUploadMedia(currentRole);

  // Re-synchronize form state whenever person changes or modal opens
  const [lastPersonId, setLastPersonId] = useState(person?.id);
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);

  if (person?.id !== lastPersonId || isOpen !== lastIsOpen) {
    setLastPersonId(person?.id);
    setLastIsOpen(isOpen);
    if (isOpen && person) {
      const state = getPersonInitialState(person);
      setFirstName(state.firstName);
      setMiddleName(state.middleName);
      setLastName(state.lastName);
      setGender(state.gender);
      setLivingStatus(state.livingStatus);
      setDateOfBirth(state.dateOfBirth);
      setDateOfDeath(state.dateOfDeath);
      setPlaceOfBirth(state.placeOfBirth);
      setHometown(state.hometown);
      setCurrentLocation(state.currentLocation);
      setOccupation(state.occupation);
      setBiography(state.biography);
      setNotes(state.notes);

      // Clean up previous preview URL if any
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(null);
      setIsPhotoRemoved(false);
      setIsUploadingPhoto(false);
      setPhotoUploadProgress({ state: 'idle', percent: 0 });
      setErrorMsg('');
    }
  }

  const handlePhotoChange = useCallback(({ file, previewUrl, isRemoved: removed }) => {
    setSelectedPhotoFile(file || null);
    setPhotoPreviewUrl(previewUrl || null);
    setIsPhotoRemoved(Boolean(removed));
  }, []);

  const handleCancel = () => {
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setIsPhotoRemoved(false);
    setIsUploadingPhoto(false);

    // Discard unsaved changes and reset to current record
    const state = getPersonInitialState(person);
    setFirstName(state.firstName);
    setMiddleName(state.middleName);
    setLastName(state.lastName);
    setGender(state.gender);
    setLivingStatus(state.livingStatus);
    setDateOfBirth(state.dateOfBirth);
    setDateOfDeath(state.dateOfDeath);
    setPlaceOfBirth(state.placeOfBirth);
    setHometown(state.hometown);
    setCurrentLocation(state.currentLocation);
    setOccupation(state.occupation);
    setBiography(state.biography);
    setNotes(state.notes);
    setErrorMsg('');
    onClose?.();
  };

  // Handle escape key to cancel
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen || !person) return null;

  const personDisplayName =
    person.displayName ||
    [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') ||
    'Person';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    let finalPhotoRef = person.photo || person.photoUrl || '';

    try {
      // 1. If a new photo file was chosen, upload via M3D media infrastructure
      if (selectedPhotoFile) {
        setIsUploadingPhoto(true);
        setPhotoUploadProgress({ state: 'uploading', percent: 25 });

        const uploadResult = await mediaStorageService.uploadPhoto({
          familyId,
          personId: person.id,
          file: selectedPhotoFile,
          title: `${personDisplayName} — Portrait`,
          caption: 'Primary portrait',
          isPrimary: true,
          onProgress: (p) => setPhotoUploadProgress(p),
        });

        const photoRef = uploadResult.storagePath || uploadResult.metadata.src;

        familyStore.addPhoto({
          ...uploadResult.metadata,
          src: uploadResult.metadata.src || photoRef,
          personId: person.id,
          isPrimary: true,
          relatedPersonIds: [person.id],
        });

        finalPhotoRef = photoRef;

        // Clean up previous storage path if old photo was an M3D private file
        const oldStoragePath = person.photo || person.photoUrl;
        if (oldStoragePath && oldStoragePath.startsWith('family/') && oldStoragePath !== finalPhotoRef) {
          mediaStorageService.deletePhoto({ storagePath: oldStoragePath }).catch(() => {});
        }
      } else if (isPhotoRemoved) {
        finalPhotoRef = '';

        // Clean up previous storage path if old photo was an M3D private file
        const oldStoragePath = person.photo || person.photoUrl;
        if (oldStoragePath && oldStoragePath.startsWith('family/')) {
          mediaStorageService.deletePhoto({ storagePath: oldStoragePath }).catch(() => {});
        }

        // Clean up primary photo entity in store
        const personPhotos = familyStore.getPhotosForPerson(person.id);
        personPhotos.forEach((ph) => {
          if (ph.isPrimary) {
            familyStore.deletePhoto(ph.id);
          }
        });
      }

      // 2. Prepare person updates (preserving unchanged fields)
      const updates = preparePersonUpdates(
        {
          firstName,
          middleName,
          lastName,
          gender,
          livingStatus,
          dateOfBirth,
          dateOfDeath,
          placeOfBirth,
          hometown,
          currentLocation,
          occupation,
          photoUrl: finalPhotoRef,
          isPhotoRemoved,
          biography,
          notes,
        },
        person
      );

      onUpdatePerson(person.id, updates);
      onClose();
    } catch (err) {
      console.error('Error updating person profile:', err);
      setErrorMsg(err.message || 'Failed to update person.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label={`Edit ${personDisplayName}`}>
      <div className="ft-view-modal__backdrop" onClick={!isUploadingPhoto ? handleCancel : undefined} />
      <div className="ft-view-modal__container ft-modal-form-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">PROFILE DOSSIER</span>
            <h2 className="ft-view-modal__title">Edit {personDisplayName}</h2>
            <p className="ft-view-modal__subtitle">Update bio, vitals, location, and records</p>
          </div>
          <button
            type="button"
            className="ft-view-modal__close-btn"
            onClick={handleCancel}
            aria-label="Close dialog"
            disabled={isUploadingPhoto}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {errorMsg && (
          <div className="ft-form-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ft-modal-form">
          <div className="ft-modal-form-body">
            {/* Identity & Names */}
            <div className="ft-form-section-title">Identity</div>
            <div className="ft-form-row ft-form-row--3">
              <div className="ft-form-field">
                <label>First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Ramaiah"
                  disabled={isUploadingPhoto}
                />
              </div>
              <div className="ft-form-field">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="e.g. Rao"
                  disabled={isUploadingPhoto}
                />
              </div>
              <div className="ft-form-field">
                <label>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Medida"
                  disabled={isUploadingPhoto}
                />
              </div>
            </div>

            {/* Vitals & Status */}
            <div className="ft-form-section-title">Vitals &amp; Dates</div>
            <div className="ft-form-row ft-form-row--3">
              <div className="ft-form-field">
                <label>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={isUploadingPhoto}
                >
                  <option value="unspecified">Unspecified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="ft-form-field">
                <label>Status</label>
                <select
                  value={livingStatus}
                  onChange={(e) => setLivingStatus(e.target.value)}
                  disabled={isUploadingPhoto}
                >
                  <option value="alive">Living</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>
              <div className="ft-form-field">
                <label>Birth Date</label>
                <FamilyDatePicker
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  disabled={isUploadingPhoto}
                  placeholder="YYYY-MM-DD or Year"
                  ariaLabel="Birth date"
                />
              </div>
            </div>

            <div className="ft-form-row ft-form-row--2">
              <div className="ft-form-field">
                <label>Hometown / Ancestral Origin</label>
                <LocationCombobox
                  value={hometown}
                  onChange={setHometown}
                  placeholder="e.g. Muthagudem, Edulapuram"
                  ariaLabel="Hometown or ancestral origin"
                  disabled={isUploadingPhoto}
                  activeFamilyId={familyId}
                />
              </div>
              <div className="ft-form-field">
                <label>Date of Death (if deceased)</label>
                <FamilyDatePicker
                  value={dateOfDeath}
                  onChange={(val) => {
                    setDateOfDeath(val);
                    if (val) setLivingStatus('deceased');
                  }}
                  disabled={isUploadingPhoto}
                  placeholder="YYYY-MM-DD or Year"
                  ariaLabel="Date of death"
                />
              </div>
            </div>

            {/* Places & Profession */}
            <div className="ft-form-section-title">Places &amp; Career</div>
            <div className="ft-form-row ft-form-row--3">
              <div className="ft-form-field">
                <label>Birthplace</label>
                <LocationCombobox
                  value={placeOfBirth}
                  onChange={setPlaceOfBirth}
                  placeholder="e.g. Hyderabad, Khammam"
                  ariaLabel="Birthplace"
                  disabled={isUploadingPhoto}
                  activeFamilyId={familyId}
                />
              </div>
              <div className="ft-form-field">
                <label>Current Location</label>
                <LocationCombobox
                  value={currentLocation}
                  onChange={setCurrentLocation}
                  placeholder="e.g. Hyderabad, Suryapet"
                  ariaLabel="Current location"
                  disabled={isUploadingPhoto}
                  activeFamilyId={familyId}
                />
              </div>
              <div className="ft-form-field">
                <label>Occupation</label>
                <OccupationCombobox
                  value={occupation}
                  onChange={setOccupation}
                  placeholder="e.g. Farmer, Software Engineer"
                  ariaLabel="Occupation"
                  disabled={isUploadingPhoto}
                  activeFamilyId={familyId}
                />
              </div>
            </div>

            {/* Portrait Upload Section */}
            <div className="ft-form-section-title">Portrait &amp; Biography</div>
            <ProfilePhotoUpload
              currentPhotoSrc={initial.photoUrl}
              personName={personDisplayName}
              selectedFile={selectedPhotoFile}
              previewUrl={photoPreviewUrl}
              isRemoved={isPhotoRemoved}
              onChange={handlePhotoChange}
              disabled={!canEdit || !canUpload || isUploadingPhoto}
              isUploading={isUploadingPhoto}
              uploadProgress={photoUploadProgress}
              label="PROFILE PORTRAIT"
            />

            <div className="ft-form-field">
              <label>Biography</label>
              <textarea
                rows="3"
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                disabled={isUploadingPhoto}
              />
            </div>

            <div className="ft-form-field">
              <label>Notes</label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isUploadingPhoto}
              />
            </div>
          </div>

          <div className="ft-modal-footer">
            <button
              type="button"
              className="ft-form-btn ft-form-btn--secondary"
              onClick={handleCancel}
              disabled={isUploadingPhoto}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ft-form-btn ft-form-btn--primary"
              disabled={isUploadingPhoto || !canEdit}
            >
              {isUploadingPhoto ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
