/**
 * PersonCard Component — Modern Digital Profile Object
 * Minimal, crisp, photographic profile card with smooth motion feedback and constellation weighting.
 */

import React, { useMemo } from 'react';
import { getInitials, getLifespanInfo, getAvatarGradient } from '../utils/familyHelpers.js';
import SpotlightCard from './react-bits/SpotlightCard.jsx';
import { useMediaUrl } from '../hooks/useMediaUrl.js';

export default function PersonCard({
  person,
  isSelected,
  isRelated,
  relationshipRole,
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
      {relationshipRole && (
        <span className="ft-person-card__relation-pill" aria-label={`Relationship: ${relationshipRole}`}>
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
          {resolvedPhoto ? (
            <img src={resolvedPhoto} alt={person.displayName} className="ft-person-card__photo" />
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
        <div className="ft-person-card__name" title={person.displayName}>
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
