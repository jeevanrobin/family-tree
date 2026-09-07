/**
 * EditPersonModal Component — Modern Family Platform
 * Edit person profiles with immediate reactivity.
 */

import React, { useState } from 'react';

export default function EditPersonModal({
  isOpen,
  person,
  onClose,
  onUpdatePerson,
}) {
  const [firstName, setFirstName] = useState(person?.firstName || '');
  const [middleName, setMiddleName] = useState(person?.middleName || '');
  const [lastName, setLastName] = useState(person?.lastName || '');
  const [gender, setGender] = useState(person?.gender || 'unspecified');
  const [livingStatus, setLivingStatus] = useState(person?.livingStatus || 'alive');
  const [dateOfBirth, setDateOfBirth] = useState(person?.dateOfBirth || '');
  const [dateOfDeath, setDateOfDeath] = useState(person?.dateOfDeath || '');
  const [placeOfBirth, setPlaceOfBirth] = useState(person?.placeOfBirth || '');
  const [hometown, setHometown] = useState(person?.hometown || '');
  const [currentLocation, setCurrentLocation] = useState(person?.currentLocation || '');
  const [occupation, setOccupation] = useState(person?.occupation || '');
  const [photoUrl, setPhotoUrl] = useState(person?.photo || person?.photoUrl || '');
  const [biography, setBiography] = useState(person?.biography || '');
  const [notes, setNotes] = useState(person?.notes || '');

  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !person) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim()) {
      setErrorMsg('First name is required.');
      return;
    }

    if (dateOfBirth && dateOfDeath && new Date(dateOfBirth) > new Date(dateOfDeath)) {
      setErrorMsg('Date of birth cannot be after date of death.');
      return;
    }

    try {
      onUpdatePerson(person.id, {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        gender,
        livingStatus,
        dateOfBirth: dateOfBirth || null,
        dateOfDeath: dateOfDeath || null,
        placeOfBirth: placeOfBirth.trim(),
        hometown: hometown.trim(),
        currentLocation: currentLocation.trim(),
        occupation: occupation.trim(),
        photoUrl: photoUrl.trim(),
        photo: photoUrl.trim(),
        biography: biography.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update person.');
    }
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Edit Profile">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-modal-form-container">
        {/* Header */}
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">PROFILE DOSSIER</span>
            <h2 className="ft-view-modal__title">Edit {person.displayName}</h2>
            <p className="ft-view-modal__subtitle">Update bio, vitals, location, and records</p>
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
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ft-modal-form-body">
          <div className="ft-form-grid">
            {/* Identity */}
            <div className="ft-form-section-title">Identity</div>
            <div className="ft-form-row">
              <div className="ft-form-field">
                <label>First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="ft-form-field">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div className="ft-form-field">
                <label>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="ft-form-row ft-form-row--2">
              <div className="ft-form-field">
                <label>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unspecified">Other / Unspecified</option>
                </select>
              </div>
              <div className="ft-form-field">
                <label>Living Status</label>
                <select value={livingStatus} onChange={(e) => setLivingStatus(e.target.value)}>
                  <option value="alive">Living</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>
            </div>

            {/* Life & Dates */}
            <div className="ft-form-section-title">Life Dates</div>
            <div className="ft-form-row ft-form-row--2">
              <div className="ft-form-field">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="ft-form-field">
                <label>Date of Death</label>
                <input
                  type="date"
                  value={dateOfDeath}
                  onChange={(e) => {
                    setDateOfDeath(e.target.value);
                    if (e.target.value) setLivingStatus('deceased');
                  }}
                />
              </div>
            </div>

            {/* Places & Profession */}
            <div className="ft-form-section-title">Places &amp; Career</div>
            <div className="ft-form-row ft-form-row--3">
              <div className="ft-form-field">
                <label>Birthplace</label>
                <input
                  type="text"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                />
              </div>
              <div className="ft-form-field">
                <label>Current Location</label>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                />
              </div>
              <div className="ft-form-field">
                <label>Occupation</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
            </div>

            {/* Photo & Story */}
            <div className="ft-form-section-title">Portrait &amp; Story</div>
            <div className="ft-form-field">
              <label>Photo URL</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>

            <div className="ft-form-field">
              <label>Biography</label>
              <textarea
                rows="3"
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
              />
            </div>

            <div className="ft-form-field">
              <label>Notes</label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
