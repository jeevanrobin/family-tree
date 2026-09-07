/**
 * AddPersonModal Component — Modern Family Platform
 * Streamlined Quick-Add experience for family building.
 *
 * UX Principles:
 * - Tree building = Fast (10-15 seconds)
 * - Profile enrichment = Gradual (collapsed under More Details)
 * - Empty family = Zero relationship controls (Name only)
 * - Dossier relative add = Prepopulated connection target
 * - Add & Continue = Rapid sequential member additions
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { getAllPersons } from '../../data/familyDataService.js';

import { humanizeRelationshipError } from '../../utils/relationshipErrors.js';

export default function AddPersonModal({
  isOpen,
  onClose,
  onAddPerson,
  onAddRelationship,
  initialRelativeId = null,
  initialRelType = null,
  existingPersons = null,
}) {
  // Modal flow mode: 'form' | 'success'
  const [modalMode, setModalMode] = useState('form');
  const [lastAddedMember, setLastAddedMember] = useState(null);

  // Core Quick-Add fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);

  // Relationship state
  // relOption can be: 'child' | 'spouse' | 'father' | 'mother' | 'parent' | 'sibling' | 'other'
  const [relOption, setRelOption] = useState('child');
  const [connectRelativeId, setConnectRelativeId] = useState(initialRelativeId || '');

  // Secondary details (collapsed by default)
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState('unspecified');
  const [livingStatus, setLivingStatus] = useState('alive');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [biography, setBiography] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const firstNameInputRef = useRef(null);

  // Derive people list
  const peopleList = useMemo(() => {
    if (Array.isArray(existingPersons) && existingPersons.length > 0) {
      return existingPersons;
    }
    const fromService = getAllPersons();
    if (Array.isArray(fromService) && fromService.length > 0) {
      return fromService;
    }
    return familyStore.getAllPersons();
  }, [existingPersons]);

  const isFamilyEmpty = peopleList.length === 0;

  // Reset or initialize state when opening or when initial props change
  useEffect(() => {
    if (isOpen) {
      setModalMode('form');
      setErrorMsg('');
      setFirstName('');
      setLastName('');
      setMiddleName('');
      setPhotoUrl('');
      setShowPhotoInput(false);
      setShowMoreDetails(false);
      setLivingStatus('alive');
      setDateOfBirth('');
      setDateOfDeath('');
      setPlaceOfBirth('');
      setCurrentLocation('');
      setOccupation('');
      setBiography('');

      // Setup connection relative
      const targetId = initialRelativeId || (peopleList.length > 0 ? peopleList[0].id : '');
      setConnectRelativeId(targetId);

      // Setup relationship option
      if (initialRelType === 'spouse') {
        setRelOption('spouse');
        setGender('unspecified');
      } else if (initialRelType === 'parent') {
        setRelOption('father');
        setGender('male');
      } else if (initialRelType === 'child') {
        setRelOption('child');
        setGender('unspecified');
      } else {
        setRelOption('child');
        setGender('unspecified');
      }

      // Auto-focus first name
      setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen, initialRelativeId, initialRelType]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle relationship option changes
  const handleSelectRelOption = (option) => {
    setRelOption(option);
    if (option === 'father') {
      setGender('male');
    } else if (option === 'mother') {
      setGender('female');
    }
  };

  const handleResetForNextMember = () => {
    setModalMode('form');
    setErrorMsg('');
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setPhotoUrl('');
    setShowPhotoInput(false);
    setShowMoreDetails(false);
    setLivingStatus('alive');
    setDateOfBirth('');
    setDateOfDeath('');
    setPlaceOfBirth('');
    setCurrentLocation('');
    setOccupation('');
    setBiography('');
    setGender('unspecified');

    // Default connection to the newly added member if available
    if (lastAddedMember?.id) {
      setConnectRelativeId(lastAddedMember.id);
    }

    setTimeout(() => {
      firstNameInputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim()) {
      setErrorMsg('First name is required.');
      firstNameInputRef.current?.focus();
      return;
    }

    if (dateOfBirth && dateOfDeath && new Date(dateOfBirth) > new Date(dateOfDeath)) {
      setErrorMsg('Date of birth cannot be after date of death.');
      return;
    }

    try {
      // 1. Create Person
      const newPerson = onAddPerson({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        gender: gender || 'unspecified',
        livingStatus: livingStatus || 'alive',
        dateOfBirth: dateOfBirth || null,
        dateOfDeath: dateOfDeath || null,
        placeOfBirth: placeOfBirth.trim(),
        currentLocation: currentLocation.trim(),
        occupation: occupation.trim(),
        photoUrl: photoUrl.trim(),
        photo: photoUrl.trim(),
        biography: biography.trim(),
      });

      // 2. Connect Relationship (when family is not empty and a relative is selected)
      if (!isFamilyEmpty && connectRelativeId && newPerson?.id) {
        if (relOption === 'child') {
          // newPerson is Child of connectRelativeId
          onAddRelationship({
            type: 'parent-child',
            parentId: connectRelativeId,
            childId: newPerson.id,
          });
        } else if (relOption === 'father' || relOption === 'mother' || relOption === 'parent') {
          // newPerson is Parent of connectRelativeId
          onAddRelationship({
            type: 'parent-child',
            parentId: newPerson.id,
            childId: connectRelativeId,
          });
        } else if (relOption === 'spouse') {
          // newPerson is Spouse of connectRelativeId
          onAddRelationship({
            type: 'spouse',
            personAId: connectRelativeId,
            personBId: newPerson.id,
          });
        } else if (relOption === 'sibling') {
          // Connect to the parents of connectRelativeId
          const targetParents = familyStore.getParents(connectRelativeId);
          if (targetParents && targetParents.length > 0) {
            targetParents.forEach((p) => {
              try {
                onAddRelationship({
                  type: 'parent-child',
                  parentId: p.id,
                  childId: newPerson.id,
                });
              } catch (relErr) {
                console.warn('Could not link to parent:', p.id, relErr);
              }
            });
          }
        }
      }

      // 3. Show lightweight success state
      setLastAddedMember(newPerson);
      setModalMode('success');
    } catch (err) {
      setErrorMsg(humanizeRelationshipError(err));
    }
  };

  const selectedRelative = peopleList.find((p) => p.id === connectRelativeId);
  const targetRelativeName = selectedRelative ? selectedRelative.displayName : 'Family Member';

  // Compute friendly dynamic label for "Connect To"
  let connectToLabel = 'Connect to';
  if (relOption === 'father') connectToLabel = `Father of`;
  else if (relOption === 'mother') connectToLabel = `Mother of`;
  else if (relOption === 'parent') connectToLabel = `Parent of`;
  else if (relOption === 'child') connectToLabel = `Child of`;
  else if (relOption === 'spouse') connectToLabel = `Spouse of`;
  else if (relOption === 'sibling') connectToLabel = `Sibling of`;
  else if (relOption === 'other') connectToLabel = `Connected with`;

  // Compute submit button label
  let submitButtonLabel = 'Add Member';
  if (initialRelativeId) {
    if (relOption === 'father') submitButtonLabel = 'Add Father';
    else if (relOption === 'mother') submitButtonLabel = 'Add Mother';
    else if (relOption === 'spouse') submitButtonLabel = 'Add Spouse';
    else if (relOption === 'child') submitButtonLabel = 'Add Child';
    else if (relOption === 'sibling') submitButtonLabel = 'Add Sibling';
    else submitButtonLabel = 'Add Relative';
  }

  return (
    <div className="ft-view-modal ft-quickadd-backdrop" role="dialog" aria-modal="true" aria-label="Add Family Member">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-quickadd-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="ft-quickadd-header">
          <div>
            <span className="ft-quickadd-eyebrow">
              {isFamilyEmpty ? 'BEGIN LINEAGE' : initialRelativeId ? 'ADD RELATIVE' : 'FAMILY TREE'}
            </span>
            <h2 className="ft-quickadd-title">
              {modalMode === 'success'
                ? 'Member Added'
                : isFamilyEmpty
                ? 'Add your first family member'
                : initialRelativeId
                ? `Add relative to ${targetRelativeName}`
                : 'Add someone to your family tree'}
            </h2>
            <p className="ft-quickadd-subtitle">
              {modalMode === 'success'
                ? 'Successfully recorded in your family lineage.'
                : isFamilyEmpty
                ? 'Start with yourself, a parent, grandparent, or anyone in your family.'
                : 'Add a person to your tree. Rich details can be expanded now or added later.'}
            </p>
          </div>
          <button
            type="button"
            className="ft-view-modal__close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Error Banner */}
        {errorMsg && (
          <div className="ft-quickadd-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success View (Add & Continue) */}
        {modalMode === 'success' ? (
          <div className="ft-quickadd-success">
            <div className="ft-quickadd-success__icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h3 className="ft-quickadd-success__name">
              ✓ {lastAddedMember?.displayName || 'Family member'} added
            </h3>
            <p className="ft-quickadd-success__desc">
              Your family tree, search, and chronicles have been updated in real-time.
            </p>

            <div className="ft-quickadd-success__actions">
              <button
                type="button"
                className="ft-form-btn ft-form-btn--primary ft-quickadd-success__btn-continue"
                onClick={handleResetForNextMember}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                + Add another family member
              </button>
              <button
                type="button"
                className="ft-form-btn ft-form-btn--secondary ft-quickadd-success__btn-done"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Normal Single-Screen Quick Add Form */
          <form onSubmit={handleSubmit} className="ft-quickadd-form">
            {/* NAME SECTION */}
            <div className="ft-quickadd-section">
              <div className="ft-quickadd-section-label">NAME</div>
              <div className="ft-form-row ft-form-row--2">
                <div className="ft-form-field">
                  <label htmlFor="qa-first-name">First name *</label>
                  <input
                    id="qa-first-name"
                    ref={firstNameInputRef}
                    type="text"
                    required
                    placeholder="e.g. Rajesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="ft-form-field">
                  <label htmlFor="qa-last-name">Last name</label>
                  <input
                    id="qa-last-name"
                    type="text"
                    placeholder="e.g. Medida"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {/* RELATIONSHIP SECTION — OMITTED ON EMPTY FAMILY */}
            {!isFamilyEmpty && (
              <div className="ft-quickadd-section">
                <div className="ft-quickadd-section-label">RELATIONSHIP</div>
                <div className="ft-quickadd-hint">
                  {initialRelativeId ? 'Who are you adding?' : 'How are they related?'}
                </div>

                {/* Friendly Pills */}
                <div className="ft-quickadd-pills" role="group" aria-label="Relationship type">
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'father' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('father')}
                  >
                    Father
                  </button>
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'mother' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('mother')}
                  >
                    Mother
                  </button>
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'spouse' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('spouse')}
                  >
                    Spouse
                  </button>
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'child' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('child')}
                  >
                    Child
                  </button>
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'sibling' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('sibling')}
                  >
                    Sibling
                  </button>
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'other' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('other')}
                  >
                    Other
                  </button>
                </div>

                {/* Sibling notice if target relative has no parents yet */}
                {relOption === 'sibling' && connectRelativeId && familyStore.getParents(connectRelativeId).length === 0 && (
                  <div className="ft-quickadd-inline-note">
                    ℹ️ <em>{targetRelativeName}</em> has no parents recorded yet. Adding this sibling will place them in the family tree; you can link parents anytime.
                  </div>
                )}

                {/* CONNECT TO SECTION */}
                <div className="ft-quickadd-connect-box">
                  <label htmlFor="qa-connect-to" className="ft-quickadd-connect-label">
                    {connectToLabel.toUpperCase()}
                  </label>

                  {initialRelativeId ? (
                    <div className="ft-quickadd-locked-target">
                      <div className="ft-quickadd-locked-avatar">
                        {selectedRelative?.photo ? (
                          <img src={selectedRelative.photo} alt={targetRelativeName} />
                        ) : (
                          <span>{targetRelativeName.charAt(0)}</span>
                        )}
                      </div>
                      <span className="ft-quickadd-locked-name">{targetRelativeName}</span>
                      <span className="ft-quickadd-locked-badge">Preselected</span>
                    </div>
                  ) : (
                    <select
                      id="qa-connect-to"
                      value={connectRelativeId}
                      onChange={(e) => setConnectRelativeId(e.target.value)}
                      className="ft-quickadd-select"
                    >
                      <option value="">-- Select family member --</option>
                      {peopleList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName} {p.occupation ? `(${p.occupation})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* LIGHTWEIGHT PHOTO SECTION */}
            <div className="ft-quickadd-photo-section">
              <div className="ft-quickadd-photo-trigger">
                <button
                  type="button"
                  className="ft-quickadd-photo-btn"
                  onClick={() => setShowPhotoInput(!showPhotoInput)}
                  aria-expanded={showPhotoInput}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="ft-quickadd-photo-thumb" />
                  ) : (
                    <span className="ft-quickadd-photo-placeholder">📷</span>
                  )}
                  <span>{photoUrl ? 'Portrait attached' : 'Add portrait (optional)'}</span>
                  <span className="ft-quickadd-plus">{showPhotoInput ? '▲' : '+'}</span>
                </button>
              </div>

              {showPhotoInput && (
                <div className="ft-quickadd-photo-input-drawer">
                  <input
                    type="url"
                    placeholder="Paste photo or portrait URL (https://...)"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* MORE DETAILS TOGGLE (COLLAPSED BY DEFAULT) */}
            <div className="ft-quickadd-details-toggle">
              <button
                type="button"
                className="ft-quickadd-accordion-header"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                aria-expanded={showMoreDetails}
              >
                <span>More details</span>
                <span className={`ft-quickadd-chevron ${showMoreDetails ? 'ft-quickadd-chevron--open' : ''}`}>
                  ▾
                </span>
              </button>

              {showMoreDetails && (
                <div className="ft-quickadd-details-body">
                  <div className="ft-form-row ft-form-row--3">
                    <div className="ft-form-field">
                      <label>Middle Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Kumar"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                      />
                    </div>
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
                      <label>Date of Death (if deceased)</label>
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

                  <div className="ft-form-row ft-form-row--2">
                    <div className="ft-form-field">
                      <label>Birthplace</label>
                      <input
                        type="text"
                        placeholder="e.g. Hyderabad, India"
                        value={placeOfBirth}
                        onChange={(e) => setPlaceOfBirth(e.target.value)}
                      />
                    </div>
                    <div className="ft-form-field">
                      <label>Current Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Bangalore, India"
                        value={currentLocation}
                        onChange={(e) => setCurrentLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="ft-form-field">
                    <label>Occupation</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Architect, Educator, Doctor"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                    />
                  </div>

                  <div className="ft-form-field">
                    <label>Biography</label>
                    <textarea
                      rows="2"
                      placeholder="Personal recollections, achievements, background..."
                      value={biography}
                      onChange={(e) => setBiography(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="ft-quickadd-footer">
              <button
                type="button"
                className="ft-form-btn ft-form-btn--secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ft-form-btn ft-form-btn--primary ft-quickadd-submit-btn"
              >
                {submitButtonLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
