/**
 * PersonDetails Component — Rich Editorial Family Profile Dossier
 * Milestone 2B: Sections for OVERVIEW, STORY & MEMORIES, EVENTS TIMELINE,
 * PHOTOS GALLERY, ARCHIVAL DOCUMENTS, and FAMILY LINEAGE.
 * Milestone 3B: Centralized role-based action gating (Owner, Editor, Contributor, Viewer).
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  getParents,
  getChildren,
  getSpouse,
  getSiblings,
  getSiblingDisplayLabel,
  getGeneration,
  getStoriesForPerson,
  getEventsForPerson,
  getPhotosForPerson,
  getDocumentsForPerson,
  GENERATION_CONFIG,
} from '../data/familyDataService.js';
import { getInitials, formatDate, getLifespanInfo, getAvatarGradient } from '../utils/familyHelpers.js';
import { useFamily } from '../auth/FamilyContext.jsx';
import { useMediaUrl } from '../hooks/useMediaUrl.js';
import {
  canEditPerson as checkCanEditPerson,
  canDeletePerson as checkCanDeletePerson,
  canAddRelative as checkCanAddRelative,
  canAddStory as checkCanAddStory,
  canDeleteStory as checkCanDeleteStory,
  canAddLifeEvent as checkCanAddLifeEvent,
  canDeleteLifeEvent as checkCanDeleteLifeEvent,
  canUploadMedia as checkCanUploadMedia,
  canUploadDocument as checkCanUploadDocument,
} from '../auth/roles.js';

function PersonHeroCameo({ person }) {
  const photoSrc = person.photo || person.photoUrl || '';
  const isStoragePath = photoSrc.startsWith('family/');
  const resolvedUrl = useMediaUrl(isStoragePath ? photoSrc : '', photoSrc);

  if (resolvedUrl) {
    return <img src={resolvedUrl} alt={person.displayName} className="ft-details__avatar-img" />;
  }
  return <span className="ft-details__avatar-initials">{getInitials(person)}</span>;
}

function GalleryThumbnailItem({ photo, onOpen }) {
  const storagePath = photo.storage_path || photo.storagePath || '';
  const resolvedUrl = useMediaUrl(storagePath, photo.src);

  return (
    <div
      className={`ft-gallery-item ${photo.isPrimary ? 'ft-gallery-item--primary' : ''}`}
      onClick={onOpen}
      title={photo.title}
    >
      <img src={resolvedUrl || photo.src} alt={photo.title} className="ft-gallery-img" />
      {photo.isPrimary && (
        <span className="ft-gallery-primary-tag">Primary</span>
      )}
      {photo._offlinePending && (
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            fontSize: '0.65rem',
            background: 'rgba(234, 179, 8, 0.9)',
            color: '#000',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700,
          }}
        >
          Pending
        </span>
      )}
      <div className="ft-gallery-overlay">
        <div className="ft-gallery-caption-text">{photo.title}</div>
        {photo.date && <div className="ft-gallery-date-text">{photo.date}</div>}
      </div>
    </div>
  );
}

export default function PersonDetails({
  person,
  onClose,
  onSelectPerson,
  onCenterPerson,
  onEditPerson,
  onDeletePerson,
  onAddRelative,
  // M2B Reactive Collections (from hook, via props)
  stories: storiesProp,
  lifeEvents: lifeEventsProp,
  photos: photosProp,
  documents: documentsProp,
  // M2B Entity Handlers
  onOpenStoryModal,
  onOpenEventModal,
  onOpenPhotoModal,
  onOpenDocumentModal,
  onOpenLightbox,
  onOpenDocumentViewer,
  onDeleteStory,
  onDeleteEvent,
  initialSection = 'overview',
  isLocalMode = false,
}) {
  const [activeSection, setActiveSection] = useState(initialSection || 'overview'); // 'overview' | 'story' | 'events' | 'photos' | 'documents' | 'family'

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection, person?.id]);

  // Determine user's active family role
  let currentRole = 'owner';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const familyCtx = useFamily();
    currentRole = familyCtx?.currentRole || 'owner';
  } catch {
    currentRole = 'owner';
  }

  const canEdit = isLocalMode || checkCanEditPerson(currentRole);
  const canDelete = isLocalMode || checkCanDeletePerson(currentRole);
  const canRelate = isLocalMode || checkCanAddRelative(currentRole);
  const canStory = isLocalMode || checkCanAddStory(currentRole);
  const canDelStory = isLocalMode || checkCanDeleteStory(currentRole);
  const canEvent = isLocalMode || checkCanAddLifeEvent(currentRole);
  const canDelEvent = isLocalMode || checkCanDeleteLifeEvent(currentRole);
  const canPhoto = isLocalMode || checkCanUploadMedia(currentRole);
  const canDoc = isLocalMode || checkCanUploadDocument(currentRole);

  const parents = useMemo(() => getParents(person?.id), [person?.id]);
  const children = useMemo(() => getChildren(person?.id), [person?.id]);
  const spouse = useMemo(() => getSpouse(person?.id), [person?.id]);
  const siblings = useMemo(() => getSiblings(person?.id), [person?.id]);
  const lifespan = useMemo(() => getLifespanInfo(person), [person]);
  const avatarBg = useMemo(() => getAvatarGradient(person), [person]);
  const genNum = useMemo(() => getGeneration(person?.id), [person?.id]);
  const genMeta = useMemo(() => GENERATION_CONFIG[genNum] || GENERATION_CONFIG[0], [genNum]);

  // M2B Collections — prefer props from hook (reactive), fall back to direct query
  const stories = storiesProp || getStoriesForPerson(person?.id);
  const lifeEvents = lifeEventsProp || getEventsForPerson(person?.id);
  const photos = photosProp || getPhotosForPerson(person?.id);
  const documents = documentsProp || getDocumentsForPerson(person?.id);

  // Close dossier on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!person) return null;

  // Format date display
  const dateDisplay = lifespan.birthYear && lifespan.deathYear
    ? `${lifespan.birthYear} — ${lifespan.deathYear}`
    : lifespan.birthYear
    ? `${lifespan.birthYear} — Present`
    : lifespan.formatted || '';

  // Formatted occupation & location
  const occupationAndLocation = [person.occupation, person.currentLocation || person.hometown]
    .filter(Boolean)
    .join(' · ');

  // Immediate Family Summary Text
  const familySummary = [
    spouse ? `Spouse: ${spouse.displayName}` : null,
    children.length > 0 ? `${children.length} ${children.length === 1 ? 'Child' : 'Children'}` : null,
    parents.length > 0 ? `${parents.length} ${parents.length === 1 ? 'Parent' : 'Parents'}` : null,
  ].filter(Boolean).join(' • ');

  return (
    <aside className="ft-details" aria-label={`Profile of ${person.displayName}`}>
      {/* Dossier Header Bar */}
      <div className="ft-details__header">
        <div className="ft-details__header-meta">
          <span className="ft-details__gen-badge" style={{ color: genMeta.color, borderColor: `${genMeta.color}40` }}>
            {genMeta.title.toUpperCase()}
          </span>
          <span className="ft-details__id-pill">ID: {person.id.split('-').slice(0, 2).join('-')}</span>
        </div>

        <div className="ft-details__header-actions">
          {onCenterPerson && (
            <button
              className="ft-details__action-btn"
              onClick={() => onCenterPerson(person.id)}
              title="Center camera on person"
              aria-label="Center camera on person"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="7" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
          )}

          {onEditPerson && canEdit && (
            <button
              className="ft-details__action-btn"
              onClick={() => onEditPerson(person)}
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}

          {onDeletePerson && canDelete && (
            <button
              className="ft-details__action-btn ft-details__action-btn--delete"
              onClick={() => onDeletePerson(person)}
              title="Delete Person"
              aria-label="Delete Person"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}

          <button
            className="ft-details__close-btn"
            onClick={onClose}
            aria-label="Close profile"
            title="Close (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Internal Navigation Section Tabs */}
      <div className="ft-details__subnav" aria-label="Profile Sections">
        <button
          className={`ft-details__subnav-btn ${activeSection === 'overview' ? 'ft-details__subnav-btn--active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          Overview
        </button>
        <button
          className={`ft-details__subnav-btn ${activeSection === 'story' ? 'ft-details__subnav-btn--active' : ''}`}
          onClick={() => setActiveSection('story')}
        >
          Story ({stories.length})
        </button>
        <button
          className={`ft-details__subnav-btn ${activeSection === 'events' ? 'ft-details__subnav-btn--active' : ''}`}
          onClick={() => setActiveSection('events')}
        >
          Events ({lifeEvents.length})
        </button>
        <button
          className={`ft-details__subnav-btn ${activeSection === 'photos' ? 'ft-details__subnav-btn--active' : ''}`}
          onClick={() => setActiveSection('photos')}
        >
          Photos ({photos.length})
        </button>
        <button
          className={`ft-details__subnav-btn ${activeSection === 'documents' ? 'ft-details__subnav-btn--active' : ''}`}
          onClick={() => setActiveSection('documents')}
        >
          Docs ({documents.length})
        </button>
        <button
          className={`ft-details__subnav-btn ${activeSection === 'family' ? 'ft-details__subnav-btn--active' : ''}`}
          onClick={() => setActiveSection('family')}
        >
          Family
        </button>
      </div>

      {/* Dossier Scrollable Body */}
      <div className="ft-details__body">
        {/* ── 1. OVERVIEW SECTION ── */}
        {activeSection === 'overview' && (
          <div className="ft-details__overview-tab">
            <div className="ft-details__hero">
              <div className="ft-details__avatar-wrap">
                <div className="ft-details__avatar-cameo" style={{ background: avatarBg }}>
                  <PersonHeroCameo person={person} avatarBg={avatarBg} />
                </div>
                <span className={`ft-details__status-pill ft-details__status-pill--${person.livingStatus}`}>
                  <span className="ft-details__status-dot-inline" />
                  {person.livingStatus === 'alive' ? 'Living' : 'Deceased'}
                </span>
              </div>

              <h2 className="ft-details__name">{person.displayName}</h2>

              {occupationAndLocation && (
                <p className="ft-details__occupation">{occupationAndLocation}</p>
              )}

              {dateDisplay && (
                <div className="ft-details__lifespan-tag">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{dateDisplay}</span>
                </div>
              )}

              {/* Family Lineage Summary */}
              <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--ft-text-secondary)', fontWeight: '500' }}>
                {familySummary}
              </div>

              {/* Quick Add Relative Actions — Restricted to Owner/Editor */}
              {onAddRelative && canRelate && (
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    className="ft-details__add-rel-btn ft-details__add-rel-btn--primary"
                    onClick={() => onAddRelative(person.id, null)}
                  >
                    + Add Relative
                  </button>
                  <button
                    className="ft-details__add-rel-btn"
                    onClick={() => onAddRelative(person.id, 'child')}
                  >
                    + Add Child
                  </button>
                  <button
                    className="ft-details__add-rel-btn"
                    onClick={() => onAddRelative(person.id, 'spouse')}
                  >
                    + Add Spouse
                  </button>
                  <button
                    className="ft-details__add-rel-btn"
                    onClick={() => onAddRelative(person.id, 'parent')}
                  >
                    + Add Parent
                  </button>
                  <button
                    className="ft-details__add-rel-btn"
                    onClick={() => onAddRelative(person.id, 'sibling')}
                  >
                    + Add Sibling
                  </button>
                </div>
              )}
            </div>

            {/* Vitals Grid */}
            <div className="ft-details__section" style={{ marginTop: '20px' }}>
              <h3 className="ft-details__section-title">Vitals &amp; Origins</h3>
              <div className="ft-details__grid">
                <div className="ft-details__item">
                  <span className="ft-details__label">Born</span>
                  <span className="ft-details__val">{formatDate(person.dateOfBirth) || 'Unknown'}</span>
                </div>

                {person.dateOfDeath ? (
                  <div className="ft-details__item">
                    <span className="ft-details__label">Died</span>
                    <span className="ft-details__val">{formatDate(person.dateOfDeath)}</span>
                  </div>
                ) : (
                  <div className="ft-details__item">
                    <span className="ft-details__label">Status</span>
                    <span className="ft-details__val" style={{ color: 'var(--ft-emerald)' }}>Living Family Member</span>
                  </div>
                )}

                {person.placeOfBirth && (
                  <div className="ft-details__item">
                    <span className="ft-details__label">Birthplace</span>
                    <span className="ft-details__val">{person.placeOfBirth}</span>
                  </div>
                )}

                {(person.currentLocation || person.hometown) && (
                  <div className="ft-details__item">
                    <span className="ft-details__label">Residence</span>
                    <span className="ft-details__val">{person.currentLocation || person.hometown}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Biography Snippet */}
            {person.biography && (
              <div className="ft-details__section" style={{ marginTop: '20px' }}>
                <h3 className="ft-details__section-title">Biography</h3>
                <div className="ft-details__bio-card">
                  <p>{person.biography}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2. STORY & MEMORIES SECTION ── */}
        {activeSection === 'story' && (
          <div className="ft-details__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="ft-details__section-title">Memories &amp; Stories</h3>
              {onOpenStoryModal && canStory && (
                <button
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  onClick={() => onOpenStoryModal(person, null)}
                >
                  + Record Memory
                </button>
              )}
            </div>

            {person.biography && (
              <div className="ft-details__bio-card" style={{ borderLeft: '3px solid var(--ft-emerald)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.86rem', color: 'var(--ft-emerald)', marginBottom: '4px' }}>
                  Core Life Biography
                </div>
                <p>{person.biography}</p>
                {person.notes && (
                  <div className="ft-details__notes">
                    <strong>Archival Notes: </strong>{person.notes}
                  </div>
                )}
              </div>
            )}

            {stories.length === 0 && !person.biography ? (
              <div className="ft-empty-state">
                <p>No recorded stories yet for {person.displayName}.</p>
              </div>
            ) : (
              stories.map((s) => (
                <div key={s.id} className="ft-story-card">
                  <div className="ft-story-card__header">
                    <div>
                      <h4 className="ft-story-card__title">{s.title}</h4>
                      <div className="ft-story-card__meta">
                        {s.date && <span>{s.date}</span>}
                        {s.date && s.location && <span>&middot;</span>}
                        {s.location && <span>{s.location}</span>}
                        {s.narrator && <span>&middot; Recounted by {s.narrator}</span>}
                      </div>
                    </div>
                    {(canStory || canDelStory) && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {canStory && (
                          <button
                            className="ft-details__action-btn"
                            onClick={() => onOpenStoryModal(person, s)}
                            title="Edit Memory"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {canDelStory && (
                          <button
                            className="ft-details__action-btn ft-details__action-btn--delete"
                            onClick={() => {
                              if (window.confirm('Delete this memory?')) {
                                onDeleteStory(s.id);
                              }
                            }}
                            title="Delete Memory"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="ft-story-card__content">{s.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 3. EVENTS TIMELINE SECTION ── */}
        {activeSection === 'events' && (
          <div className="ft-details__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="ft-details__section-title">Chronological Milestones</h3>
              {onOpenEventModal && canEvent && (
                <button
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  onClick={() => onOpenEventModal(person, null)}
                >
                  + Add Life Event
                </button>
              )}
            </div>

            {lifeEvents.length === 0 ? (
              <div className="ft-empty-state">
                <p>No timeline milestones recorded yet for {person.displayName}.</p>
              </div>
            ) : (
              <div className="ft-timeline-vertical">
                {lifeEvents.map((e) => (
                  <div key={e.id} className="ft-timeline-item">
                    <div className="ft-timeline-dot" />
                    <div className="ft-timeline-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="ft-timeline-badge">{e.type}</span>
                          <span className="ft-timeline-date">{e.date ? formatDate(e.date) || e.date : 'Undated'}</span>
                          <h4 className="ft-timeline-title">{e.title}</h4>
                        </div>
                        {(canEvent || canDelEvent) && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {canEvent && (
                              <button
                                className="ft-details__action-btn"
                                onClick={() => onOpenEventModal(person, e)}
                                title="Edit Event"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            )}
                            {canDelEvent && (
                              <button
                                className="ft-details__action-btn ft-details__action-btn--delete"
                                onClick={() => {
                                  if (window.confirm('Delete this life event?')) {
                                    onDeleteEvent(e.id);
                                  }
                                }}
                                title="Delete Event"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {e.location && (
                        <div className="ft-timeline-location">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{e.location}</span>
                        </div>
                      )}
                      {e.description && <p className="ft-timeline-desc">{e.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 4. PHOTOS GALLERY SECTION ── */}
        {activeSection === 'photos' && (
          <div className="ft-details__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="ft-details__section-title">Photographs ({photos.length})</h3>
              {onOpenPhotoModal && canPhoto && (
                <button
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  onClick={() => onOpenPhotoModal(person)}
                >
                  + Add Photo
                </button>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="ft-empty-state">
                <p>No photos in album yet.</p>
              </div>
            ) : (
              <div className="ft-gallery-grid">
                {photos.map((ph, idx) => (
                  <GalleryThumbnailItem
                    key={ph.id}
                    photo={ph}
                    onOpen={() => onOpenLightbox(photos, idx)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 5. DOCUMENTS SECTION ── */}
        {activeSection === 'documents' && (
          <div className="ft-details__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="ft-details__section-title">Archival Records &amp; Documents</h3>
              {onOpenDocumentModal && canDoc && (
                <button
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  onClick={() => onOpenDocumentModal(person, null)}
                >
                  + Record Document
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="ft-empty-state">
                <p>No archival records registered for {person.displayName}.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.map((d) => (
                  <div
                    key={d.id}
                    className="ft-doc-card"
                    onClick={() => onOpenDocumentViewer(d)}
                  >
                    <div className="ft-doc-card__icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="ft-timeline-badge">{d.type}</span>
                        {d.date && <span style={{ fontSize: '0.74rem', color: 'var(--ft-text-muted)' }}>{d.date}</span>}
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '0.86rem', color: 'var(--ft-text-primary)', marginTop: '2px' }}>
                        {d.name}
                      </div>
                      {d.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--ft-text-secondary)', marginTop: '2px', lineClamp: 1 }}>
                          {d.description}
                        </div>
                      )}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 6. FAMILY LINEAGE SECTION ── */}
        {activeSection === 'family' && (
          <div className="ft-details__section">
            <h3 className="ft-details__section-title">Immediate Lineage</h3>

            {/* Parents */}
            {parents.length > 0 && (
               <div className="ft-details__rel-group">
                <span className="ft-details__rel-role">Parents ({parents.length})</span>
                <div className="ft-details__rel-chips">
                  {parents.map((p) => (
                    <button
                      key={p.id}
                      className="ft-details__rel-chip"
                      onClick={() => onSelectPerson?.(p.id)}
                    >
                      {p.photo || p.photoUrl ? (
                        <img src={p.photo || p.photoUrl} alt={p.displayName} className="ft-details__rel-avatar" />
                      ) : (
                        <span className="ft-details__rel-avatar">{getInitials(p)}</span>
                      )}
                      <div className="ft-details__rel-chip-info">
                        <span className="ft-details__rel-chip-role">{p.gender === 'female' ? 'Mother' : p.gender === 'male' ? 'Father' : 'Parent'}</span>
                        <span className="ft-details__rel-chip-name">{p.displayName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spouse */}
            {spouse && (
              <div className="ft-details__rel-group">
                <span className="ft-details__rel-role">Spouse</span>
                <div className="ft-details__rel-chips">
                  <button
                    className="ft-details__rel-chip"
                    onClick={() => onSelectPerson?.(spouse.id)}
                  >
                    {spouse.photo || spouse.photoUrl ? (
                      <img src={spouse.photo || spouse.photoUrl} alt={spouse.displayName} className="ft-details__rel-avatar" />
                    ) : (
                      <span className="ft-details__rel-avatar">{getInitials(spouse)}</span>
                    )}
                    <div className="ft-details__rel-chip-info">
                      <span className="ft-details__rel-chip-role">{spouse.gender === 'female' ? 'Wife' : spouse.gender === 'male' ? 'Husband' : 'Spouse'}</span>
                      <span className="ft-details__rel-chip-name">{spouse.displayName}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Children */}
            {children.length > 0 && (
              <div className="ft-details__rel-group">
                <span className="ft-details__rel-role">Children ({children.length})</span>
                <div className="ft-details__rel-chips">
                  {children.map((c) => (
                    <button
                      key={c.id}
                      className="ft-details__rel-chip"
                      onClick={() => onSelectPerson?.(c.id)}
                    >
                      {c.photo || c.photoUrl ? (
                        <img src={c.photo || c.photoUrl} alt={c.displayName} className="ft-details__rel-avatar" />
                      ) : (
                        <span className="ft-details__rel-avatar">{getInitials(c)}</span>
                      )}
                      <div className="ft-details__rel-chip-info">
                        <span className="ft-details__rel-chip-role">{c.gender === 'female' ? 'Daughter' : c.gender === 'male' ? 'Son' : 'Child'}</span>
                        <span className="ft-details__rel-chip-name">{c.displayName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Siblings */}
            {siblings.length > 0 && (
              <div className="ft-details__rel-group">
                <span className="ft-details__rel-role">Siblings ({siblings.length})</span>
                <div className="ft-details__rel-chips">
                  {siblings.map((s) => (
                    <button
                      key={s.id}
                      className="ft-details__rel-chip"
                      onClick={() => onSelectPerson?.(s.id)}
                    >
                      {s.photo || s.photoUrl ? (
                        <img src={s.photo || s.photoUrl} alt={s.displayName} className="ft-details__rel-avatar" />
                      ) : (
                        <span className="ft-details__rel-avatar">{getInitials(s)}</span>
                      )}
                      <div className="ft-details__rel-chip-info">
                        <span className="ft-details__rel-chip-role">{getSiblingDisplayLabel(s)}</span>
                        <span className="ft-details__rel-chip-name">{s.displayName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
