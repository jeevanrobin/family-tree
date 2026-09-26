/**
 * PersonCard Component — Modern Digital Profile Object
 * Minimal, crisp, photographic profile card with smooth motion feedback and constellation weighting.
 */

import React, { useMemo, useState } from 'react';
import { getInitials, getLifespanInfo, getAvatarGradient } from '../utils/familyHelpers.js';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import { useMediaUrl } from '../hooks/useMediaUrl.js';

export default function PersonCard({
  person,
  isSelected,
  isRelated,
  relationshipRole,
  teluguRole = null,
  constellationTier = 'default',
  generationRank = 'current',
  onClick,
  animationDelay = 0,
}) {
  const initials = useMemo(() => getInitials(person), [person]);
  const avatarBg = useMemo(() => getAvatarGradient(person), [person]);
  const lifespan = useMemo(() => getLifespanInfo(person), [person]);

  const rawPhoto = person.photo || person.photoUrl || '';
  const isStoragePath = rawPhoto.startsWith('family/');
  const resolvedPhoto = useMediaUrl(isStoragePath ? rawPhoto : '', rawPhoto);
  // Fall back to initials when the photo fails to load, instead of showing
  // the browser's broken-image alt text inside the avatar.
  const [failedPhoto, setFailedPhoto] = useState(null);
  const showPhoto = Boolean(resolvedPhoto) && failedPhoto !== resolvedPhoto;

  let cardClasses = `ft-person-card ft-person-card--${generationRank} ft-person-card--${person.gender || 'unspecified'}`;
  if (isSelected) cardClasses += ' ft-person-card--selected';
  else if (isRelated) cardClasses += ' ft-person-card--related';
  else if (constellationTier && constellationTier !== 'default') {
    cardClasses += ` ft-person-card--tier-${constellationTier}`;
  }

  if (person.livingStatus === 'deceased') {
    cardClasses += ' ft-person-card--deceased';
  }

  // Format date display (e.g. 1975 — Present or 1948 — 2020)
  const dateDisplay = useMemo(() => {
    if (lifespan.birthYear && lifespan.deathYear) {
      return `${lifespan.birthYear} — ${lifespan.deathYear}`;
    }
    if (lifespan.birthYear) {
      return `${lifespan.birthYear} — Present`;
    }
    return lifespan.formatted || '';
  }, [lifespan]);

  // Format role & location (e.g. Principal Cloud Architect · Bangalore)
  const roleAndLocation = useMemo(() => {
    const parts = [];
    if (person.occupation) parts.push(person.occupation);
    const loc = person.currentLocation || person.placeOfBirth || person.hometown;
    if (loc) {
      const city = loc.split(',')[0].trim();
      if (city) parts.push(city);
    }
    return parts.join(' \u00B7 ');
  }, [person]);

  return (
    <SpotlightCard
      className={cardClasses}
      spotlightColor={isSelected ? 'var(--ft-selected-glow)' : 'var(--ft-emerald-soft)'}
      spotlightSize={200}
      disabled={constellationTier === 'unrelated'}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(person.id);
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${person.displayName}, ${dateDisplay}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(person.id);
        }
      }}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Contextual Relationship Role Badge */}
      {teluguRole ? (
        <span
          className={`ft-person-card__relation-pill ft-person-card__relation-pill--te ${
            constellationTier === 'extended' || constellationTier === 'unrelated' ? 'ft-person-card__relation-pill--soft' : ''
          }`}
          title={`${teluguRole.telugu.map((t) => t.term.roman + (t.when ? ` (${t.when})` : '')).join(' / ')}${
            teluguRole.english ? ` · ${teluguRole.english}` : ''
          }${teluguRole.description ? ` · ${teluguRole.description}` : ''}`}
          aria-label={`Relationship: ${teluguRole.telugu.map((t) => t.term.roman).join(' or ')}`}
        >
          <span lang="te" className="ft-person-card__relation-script">
            {teluguRole.telugu.map((t) => t.term.script).join(' / ')}
          </span>
          <span className="ft-person-card__relation-roman">
            {teluguRole.telugu.map((t) => t.term.roman).join(' / ')}
          </span>
        </span>
      ) : relationshipRole && (
        <span
          className={`ft-person-card__relation-pill ${
            constellationTier === 'extended' ? 'ft-person-card__relation-pill--soft' : ''
          }`}
          aria-label={`Relationship: ${relationshipRole}`}
        >
          {relationshipRole}
        </span>
      )}

      {/* Selected Beacon Crown */}
      {isSelected && (
        <div className="ft-person-card__selected-crown" aria-hidden="true">
          <span className="ft-person-card__selected-beacon" />
        </div>
      )}

      {/* Archival portrait frame */}
      <div className="ft-person-card__avatar-frame">
        <div className="ft-person-card__avatar" style={{ background: avatarBg }}>
          {showPhoto ? (
            <img
              src={resolvedPhoto}
              alt={person.displayName}
              className="ft-person-card__photo"
              onError={() => setFailedPhoto(resolvedPhoto)}
            />
          ) : (
            <span className="ft-person-card__initials">{initials}</span>
          )}
        </div>
        {/* Status Jewel */}
        <span
          className={`ft-person-card__status-dot ft-person-card__status-dot--${person.livingStatus}`}
          title={person.livingStatus === 'alive' ? 'Living' : 'Deceased'}
        />
      </div>

      {/* Plaque metadata */}
      <div className="ft-person-card__info">
        <div
          className="ft-person-card__name"
          title={person.displayName}
          // Zoomed-out cards show large names; shrink ones with a very long
          // word (e.g. "Venkatanarsamma") so they never overflow the card.
          style={{
            '--name-fit': Math.min(
              1,
              10 / Math.max(1, ...String(person.displayName || '').split(/\s+/).map((w) => w.length))
            ),
          }}
        >
          {person.displayName}
        </div>

        {dateDisplay && (
          <div className="ft-person-card__dates">
            {dateDisplay}
          </div>
        )}

        {roleAndLocation && (
          <div className="ft-person-card__occupation" title={roleAndLocation}>
            {roleAndLocation}
          </div>
        )}
      </div>

      {/* Subtle Gender Bar */}
      <div
        className={`ft-person-card__gender-bar ft-person-card__gender-bar--${person.gender}`}
        aria-hidden="true"
      />
    </SpotlightCard>
  );
}
