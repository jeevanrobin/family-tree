/**
 * AddPersonModal Component — Modern Family Platform
 * Streamlined Quick-Add & Link-Existing experience for family building.
 *
 * Capabilities:
 * - Create New Person (Rapid name + photo + lineage)
 * - Link Existing Person (Search + select without duplicating person records)
 * - Supported Relationships: Parent, Child, Spouse, Sibling
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { suggestSurname } from '../../utils/suggestSurname.js';
import { getAllPersons } from '../../data/familyDataService.js';
import { mediaStorageService } from '../../media/mediaStorageService.js';
import { useFamily } from '../../auth/FamilyContext.jsx';
import ProfilePhotoUpload from './ProfilePhotoUpload.jsx';
import FamilyDatePicker from '../ui/FamilyDatePicker.jsx';
import { LocationCombobox, OccupationCombobox } from '../ui/FamilyCombobox.jsx';

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

  // Creation mode: 'create' | 'link'
  const [creationMode, setCreationMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExistingPersonId, setSelectedExistingPersonId] = useState('');

  // Core Quick-Add fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Relationship state: 'parent' | 'child' | 'spouse' | 'sibling' | 'father' | 'mother' | 'other'
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
  const [hometown, setHometown] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [biography, setBiography] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const firstNameInputRef = useRef(null);
  // Once the user types a surname, stop pre-filling it.
  const lastNameEditedRef = useRef(false);

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

  const handlePhotoChange = useCallback(({ file, previewUrl, isRemoved: removed }) => {
    setSelectedPhotoFile(file || null);
    setPhotoPreviewUrl(previewUrl || null);
    setIsPhotoRemoved(Boolean(removed));
  }, []);

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
      setCreationMode('create');
      setSearchQuery('');
      setSelectedExistingPersonId('');
      setErrorMsg('');
      setFirstName('');
      setLastName('');
      lastNameEditedRef.current = false;
      setMiddleName('');
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(null);
      setIsPhotoRemoved(false);
      setIsSubmitting(false);
      setShowMoreDetails(false);
      setLivingStatus('alive');
      setDateOfBirth('');
      setDateOfDeath('');
      setPlaceOfBirth('');
      setHometown('');
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
        setRelOption('parent');
        setGender('unspecified');
      } else if (initialRelType === 'child') {
        setRelOption('child');
        setGender('unspecified');
      } else if (initialRelType === 'sibling') {
        setRelOption('sibling');
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
  }, [isOpen, initialRelativeId, initialRelType, peopleList]);

  // Pre-fill the surname from the father (for a child) or husband (for a wife).
  const surnameSuggestion = useMemo(() => {
    if (!isOpen || creationMode !== 'create' || !connectRelativeId) return null;
    return suggestSurname(relOption, familyStore.getPersonById(connectRelativeId), familyStore, gender);
  }, [isOpen, creationMode, connectRelativeId, relOption, gender]);

  useEffect(() => {
    if (!isOpen || lastNameEditedRef.current) return;
    setLastName(surnameSuggestion?.surname || '');
  }, [isOpen, surnameSuggestion]);

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

  // Helper for friendly relationship context in link selector
  const getPersonContext = useCallback((person) => {
    if (!person?.id) return '';
    const parents = familyStore.getParents(person.id);
    if (parents.length > 0) {
      return `Child of ${parents.map((p) => p.displayName).join(' & ')}`;
    }
    const spouse = familyStore.getSpouse(person.id);
    if (spouse) {
      return `Spouse of ${spouse.displayName}`;
    }
    const children = familyStore.getChildren(person.id);
    if (children.length > 0) {
      return `Parent of ${children.map((c) => c.displayName).join(', ')}`;
    }
    const siblings = familyStore.getSiblings(person.id);
    if (siblings.length > 0) {
      return `Sibling of ${siblings.map((s) => s.displayName).join(', ')}`;
    }
    if (person.occupation) {
      return person.occupation;
    }
    if (person.placeOfBirth || person.currentLocation) {
      return person.currentLocation || person.placeOfBirth;
    }
    return 'Family Member';
  }, []);

  // Filter candidates for Link Existing mode
  const candidateMembers = useMemo(() => {
    return peopleList.filter((p) => {
      if (p.id === connectRelativeId) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const fullName = (p.displayName || `${p.firstName} ${p.lastName}`).toLowerCase();
        const occ = (p.occupation || '').toLowerCase();
        const loc = (p.currentLocation || p.placeOfBirth || '').toLowerCase();
        return fullName.includes(query) || occ.includes(query) || loc.includes(query);
      }
      return true;
    });
  }, [peopleList, connectRelativeId, searchQuery]);

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

  const getRelDisplayLabel = (option) => {
    switch (option) {
      case 'father': return 'Father';
      case 'mother': return 'Mother';
      case 'parent': return 'Parent';
      case 'spouse': return 'Spouse';
      case 'child': return 'Child';
      case 'sibling': return 'Sibling';
      default: return 'Relative';
    }
  };

  const handleResetForNextMember = () => {
    setModalMode('form');
    setCreationMode('create');
    setSearchQuery('');
    setSelectedExistingPersonId('');
    setErrorMsg('');
    setFirstName('');
    setLastName('');
    setMiddleName('');
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setIsPhotoRemoved(false);
    setIsSubmitting(false);
    setShowMoreDetails(false);
    setLivingStatus('alive');
    setDateOfBirth('');
    setDateOfDeath('');
    setPlaceOfBirth('');
    setHometown('');
    setCurrentLocation('');
    setOccupation('');
    setBiography('');
    setGender('unspecified');

    // Option 2: Keep target relative unchanged (e.g. Potaiah Medida) so subsequent children are added to the same parent
    // Do not overwrite connectRelativeId with lastAddedMember.id

    setTimeout(() => {
      firstNameInputRef.current?.focus();
    }, 50);
  };

  // Submit Handler for CREATE NEW PERSON
  const handleSubmitNewPerson = async (e) => {
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

    setIsSubmitting(true);

    try {
      let newPerson;
      await familyStore.runInBatch(async () => {
      // 1. Create Person
      newPerson = onAddPerson({
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        gender: gender || 'unspecified',
        livingStatus: livingStatus || 'alive',
        dateOfBirth: dateOfBirth || null,
        dateOfDeath: dateOfDeath || null,
        placeOfBirth: placeOfBirth.trim(),
        hometown: hometown.trim(),
        currentLocation: currentLocation.trim(),
        occupation: occupation.trim(),
        photoUrl: '',
        photo: '',
        biography: biography.trim(),
      });

      // 2. If a device photo was selected, upload via M3D infrastructure
      if (selectedPhotoFile && newPerson?.id) {
        try {
          const uploadResult = await mediaStorageService.uploadPhoto({
            familyId,
            personId: newPerson.id,
            file: selectedPhotoFile,
            title: `${newPerson.displayName || firstName} — Portrait`,
            caption: 'Primary portrait',
            isPrimary: true,
          });

          const photoRef = uploadResult.storagePath || uploadResult.metadata.src;
          familyStore.addPhoto({
            ...uploadResult.metadata,
            src: uploadResult.metadata.src || photoRef,
            personId: newPerson.id,
            isPrimary: true,
            relatedPersonIds: [newPerson.id],
          });
        } catch (photoErr) {
          console.warn('Could not upload portrait for new member:', photoErr);
        }
      }

      // 3. Connect Relationship (when family is not empty and a relative is selected)
      if (!isFamilyEmpty && connectRelativeId && newPerson?.id) {
        if (relOption === 'child') {
          // newPerson is Child of connectRelativeId
          onAddRelationship({
            type: 'parent-child',
            parentId: connectRelativeId,
            childId: newPerson.id,
          });
          // Also link to spouse of connectRelativeId if one exists so both father and mother are linked
          const spouse = familyStore.getSpouse(connectRelativeId);
          if (spouse && String(spouse.id) !== String(connectRelativeId)) {
            try {
              onAddRelationship({
                type: 'parent-child',
                parentId: spouse.id,
                childId: newPerson.id,
              });
            } catch (spouseErr) {
              // Ignore if already linked or limit reached
            }
          }
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
          // Create direct sibling relationship
          onAddRelationship({
            type: 'sibling',
            personAId: connectRelativeId,
            personBId: newPerson.id,
          });
          // Also link to parents of connectRelativeId if any exist
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
                // Ignore if already linked or max reached
              }
            });
          }
        }
      }

      });

      // 4. Show lightweight success state
      setLastAddedMember(newPerson);
      setModalMode('success');
    } catch (err) {
      setErrorMsg(humanizeRelationshipError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler for LINK EXISTING PERSON
  const handleLinkExistingSubmit = (e) => {
    e?.preventDefault?.();
    setErrorMsg('');

    if (!connectRelativeId) {
      setErrorMsg('Please select a target family member.');
      return;
    }

    if (!selectedExistingPersonId) {
      setErrorMsg('Please select an existing family member to link.');
      return;
    }

    if (connectRelativeId === selectedExistingPersonId) {
      setErrorMsg('A person cannot be connected to themselves.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (relOption === 'spouse') {
        onAddRelationship({
          type: 'spouse',
          personAId: connectRelativeId,
          personBId: selectedExistingPersonId,
        });
      } else if (relOption === 'sibling') {
        onAddRelationship({
          type: 'sibling',
          personAId: connectRelativeId,
          personBId: selectedExistingPersonId,
        });
      } else if (relOption === 'child') {
        // selectedExistingPerson is Child of connectRelativeId
        onAddRelationship({
          type: 'parent-child',
          parentId: connectRelativeId,
          childId: selectedExistingPersonId,
        });
        // Also link to spouse of connectRelativeId if one exists so both father and mother are linked
        const spouse = familyStore.getSpouse(connectRelativeId);
        if (spouse && String(spouse.id) !== String(connectRelativeId)) {
          try {
            onAddRelationship({
              type: 'parent-child',
              parentId: spouse.id,
              childId: selectedExistingPersonId,
            });
          } catch (spouseErr) {
            // Ignore if already linked or limit reached
          }
        }
      } else if (relOption === 'parent' || relOption === 'father' || relOption === 'mother') {
        // selectedExistingPerson is Parent of connectRelativeId
        onAddRelationship({
          type: 'parent-child',
          parentId: selectedExistingPersonId,
          childId: connectRelativeId,
        });
      }

      const linkedPerson = peopleList.find((p) => p.id === selectedExistingPersonId) || familyStore.getPersonById(selectedExistingPersonId);
      setLastAddedMember(linkedPerson);
      setModalMode('success');
    } catch (err) {
      setErrorMsg(humanizeRelationshipError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    if (creationMode === 'link') {
      return handleLinkExistingSubmit(e);
    }
    return handleSubmitNewPerson(e);
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

  // Compute submit button label for new person
  let submitButtonLabel = 'Add Member';
  if (initialRelativeId) {
    if (relOption === 'father') submitButtonLabel = 'Add Father';
    else if (relOption === 'mother') submitButtonLabel = 'Add Mother';
    else if (relOption === 'parent') submitButtonLabel = 'Add Parent';
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
              {creationMode === 'link'
                ? 'LINK RELATIONSHIP'
                : isFamilyEmpty
                ? 'BEGIN LINEAGE'
                : initialRelativeId
                ? 'ADD RELATIVE'
                : 'FAMILY TREE'}
            </span>
            <h2 className="ft-quickadd-title">
              {modalMode === 'success'
                ? (creationMode === 'link' ? 'Relationship Linked' : 'Member Added')
                : isFamilyEmpty
                ? 'Add your first family member'
                : creationMode === 'link'
                ? `Link relationship to ${targetRelativeName}`
                : initialRelativeId
                ? `Add relative to ${targetRelativeName}`
                : 'Add someone to your family tree'}
            </h2>
            <p className="ft-quickadd-subtitle">
              {modalMode === 'success'
                ? 'Successfully recorded in your family lineage.'
                : isFamilyEmpty
                ? 'Start with yourself, a parent, grandparent, or anyone in your family.'
                : creationMode === 'link'
                ? 'Connect an existing family member without creating duplicate records.'
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

        {/* Success View */}
        {modalMode === 'success' ? (
          <div className="ft-quickadd-success">
            <div className="ft-quickadd-success__icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h3 className="ft-quickadd-success__name">
              ✓ {creationMode === 'link' ? 'Relationship Connected' : `${lastAddedMember?.displayName || 'Family member'} added`}
            </h3>
            <p className="ft-quickadd-success__desc">
              {creationMode === 'link'
                ? `Connected ${targetRelativeName} and ${lastAddedMember?.displayName || 'family member'} as ${getRelDisplayLabel(relOption)}.`
                : 'Your family tree, search, and chronicles have been updated in real-time.'}
            </p>

            <div className="ft-quickadd-success__actions">
              {creationMode === 'create' && (
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--primary ft-quickadd-success__btn-continue"
                  onClick={handleResetForNextMember}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {connectRelativeId && targetRelativeName && relOption === 'child'
                    ? `+ Add another child to ${targetRelativeName}`
                    : connectRelativeId && targetRelativeName && relOption === 'sibling'
                    ? `+ Add another sibling to ${targetRelativeName}`
                    : connectRelativeId && targetRelativeName
                    ? `+ Add another relative to ${targetRelativeName}`
                    : '+ Add another family member'}
                </button>
              )}
              <button
                type="button"
                className={`ft-form-btn ${creationMode === 'link' ? 'ft-form-btn--primary' : 'ft-form-btn--secondary'} ft-quickadd-success__btn-done`}
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ft-quickadd-form">
            <div className="ft-quickadd-body">
              {creationMode === 'link' ? (
                <>
              {/* RELATIONSHIP TYPE SECTION */}
              <div className="ft-quickadd-section">
                <div className="ft-quickadd-section-label">HOW ARE THEY RELATED?</div>
                <div className="ft-quickadd-pills" role="group" aria-label="Relationship type">
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'parent' || relOption === 'father' || relOption === 'mother' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('parent')}
                  >
                    Parent
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
                    className={`ft-quickadd-pill ${relOption === 'spouse' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('spouse')}
                  >
                    Spouse
                  </button>
                  <button
                    type="button"
                    className={`ft-quickadd-pill ${relOption === 'sibling' ? 'ft-quickadd-pill--active' : ''}`}
                    onClick={() => handleSelectRelOption('sibling')}
                  >
                    Sibling
                  </button>
                </div>
              </div>

              {/* MODE SWITCHER */}
              <div className="ft-quickadd-mode-switch" role="tablist" aria-label="Creation Mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="ft-quickadd-mode-tab"
                  onClick={() => {
                    setCreationMode('create');
                    setErrorMsg('');
                  }}
                >
                  Create New Person
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  className="ft-quickadd-mode-tab ft-quickadd-mode-tab--active"
                  onClick={() => {
                    setCreationMode('link');
                    setErrorMsg('');
                  }}
                >
                  Link Existing Person
                </button>
              </div>

              {/* TARGET MEMBER */}
              <div className="ft-quickadd-section">
                <div className="ft-quickadd-connect-box">
                  <label className="ft-quickadd-connect-label">
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
                      <span className="ft-quickadd-locked-badge">Target Member</span>
                    </div>
                  ) : (
                    <select
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

              {/* SEARCH & SELECT EXISTING PERSON */}
              <div className="ft-quickadd-section">
                <div className="ft-quickadd-section-label">CHOOSE EXISTING PERSON</div>
                <div className="ft-quickadd-search-wrap">
                  <svg className="ft-quickadd-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="ft-quickadd-search-input"
                    placeholder="Search family members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="ft-quickadd-link-list">
                  {candidateMembers.length === 0 ? (
                    <div className="ft-quickadd-empty-results">
                      No matching family members found.
                    </div>
                  ) : (
                    candidateMembers.map((member) => {
                      const isSelected = selectedExistingPersonId === member.id;
                      const context = getPersonContext(member);
                      return (
                        <div
                          key={member.id}
                          className={`ft-quickadd-link-card ${isSelected ? 'ft-quickadd-link-card--selected' : ''}`}
                          onClick={() => {
                            setSelectedExistingPersonId(member.id);
                            setErrorMsg('');
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedExistingPersonId(member.id);
                              setErrorMsg('');
                            }
                          }}
                        >
                          <div className="ft-quickadd-link-avatar">
                            {member.photo || member.photoUrl ? (
                              <img src={member.photo || member.photoUrl} alt={member.displayName} />
                            ) : (
                              <span>{member.displayName?.charAt(0) || 'M'}</span>
                            )}
                          </div>
                          <div className="ft-quickadd-link-info">
                            <div className="ft-quickadd-link-name">{member.displayName}</div>
                            {context && <div className="ft-quickadd-link-context">{context}</div>}
                          </div>
                          <div className="ft-quickadd-link-check">
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* RELATIONSHIP & MODE SECTIONS — OMITTED ON EMPTY FAMILY */}
              {!isFamilyEmpty && (
                <>
                  <div className="ft-quickadd-section">
                    <div className="ft-quickadd-section-label">HOW ARE THEY RELATED?</div>
                    <div className="ft-quickadd-pills" role="group" aria-label="Relationship type">
                      <button
                        type="button"
                        className={`ft-quickadd-pill ${relOption === 'parent' || relOption === 'father' || relOption === 'mother' ? 'ft-quickadd-pill--active' : ''}`}
                        onClick={() => handleSelectRelOption('parent')}
                      >
                        Parent
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
                        className={`ft-quickadd-pill ${relOption === 'spouse' ? 'ft-quickadd-pill--active' : ''}`}
                        onClick={() => handleSelectRelOption('spouse')}
                      >
                        Spouse
                      </button>
                      <button
                        type="button"
                        className={`ft-quickadd-pill ${relOption === 'sibling' ? 'ft-quickadd-pill--active' : ''}`}
                        onClick={() => handleSelectRelOption('sibling')}
                      >
                        Sibling
                      </button>
                    </div>
                  </div>

                  <div className="ft-quickadd-mode-switch" role="tablist" aria-label="Creation Mode">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={true}
                      className="ft-quickadd-mode-tab ft-quickadd-mode-tab--active"
                      onClick={() => {
                        setCreationMode('create');
                        setErrorMsg('');
                      }}
                    >
                      Create New Person
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={false}
                      className="ft-quickadd-mode-tab"
                      onClick={() => {
                        setCreationMode('link');
                        setErrorMsg('');
                      }}
                    >
                      Link Existing Person
                    </button>
                  </div>
                </>
              )}

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
                      onChange={(e) => {
                        lastNameEditedRef.current = true;
                        setLastName(e.target.value);
                      }}
                      autoComplete="off"
                    />
                    {surnameSuggestion && lastName === surnameSuggestion.surname && (
                      <span className="ft-quickadd-hint">From {surnameSuggestion.fromName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* CONNECT TO SECTION */}
              {!isFamilyEmpty && (
                <div className="ft-quickadd-section">
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

              {/* PROFILE PHOTO UPLOADER (OPTIONAL) */}
              <div className="ft-quickadd-photo-section">
                <ProfilePhotoUpload
                  personName={[firstName, lastName].filter(Boolean).join(' ') || 'New Member'}
                  selectedFile={selectedPhotoFile}
                  previewUrl={photoPreviewUrl}
                  isRemoved={isPhotoRemoved}
                  onChange={handlePhotoChange}
                  disabled={isSubmitting}
                  isUploading={isSubmitting && Boolean(selectedPhotoFile)}
                  compact={true}
                  label="PORTRAIT PHOTO (OPTIONAL)"
                />
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
                        <FamilyDatePicker
                          value={dateOfBirth}
                          onChange={setDateOfBirth}
                          placeholder="YYYY-MM-DD or Year"
                          ariaLabel="Date of birth"
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
                          placeholder="YYYY-MM-DD or Year"
                          ariaLabel="Date of death"
                        />
                      </div>
                    </div>

                    <div className="ft-form-field">
                      <label>Hometown / Ancestral Origin</label>
                      <LocationCombobox
                        value={hometown}
                        onChange={setHometown}
                        placeholder="e.g. Muthagudem, Edulapuram"
                        ariaLabel="Hometown or ancestral origin"
                        activeFamilyId={familyId}
                      />
                    </div>

                    <div className="ft-form-row ft-form-row--2">
                      <div className="ft-form-field">
                        <label>Birthplace</label>
                        <LocationCombobox
                          value={placeOfBirth}
                          onChange={setPlaceOfBirth}
                          placeholder="e.g. Hyderabad, Khammam"
                          ariaLabel="Birthplace"
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
                          activeFamilyId={familyId}
                        />
                      </div>
                    </div>

                    <div className="ft-form-field">
                      <label>Occupation</label>
                      <OccupationCombobox
                        value={occupation}
                        onChange={setOccupation}
                        placeholder="e.g. Farmer, Software Engineer"
                        ariaLabel="Occupation"
                        activeFamilyId={familyId}
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
            </>
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
            disabled={isSubmitting || (creationMode === 'link' && !selectedExistingPersonId)}
          >
            {creationMode === 'link'
              ? (isSubmitting ? 'Linking...' : 'Link Relationship')
              : (isSubmitting ? 'Adding...' : submitButtonLabel)}
          </button>
        </div>
      </form>
    )}
      </div>
    </div>
  );
}
