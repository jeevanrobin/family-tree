/**
 * FamilyPlacesModal — where the family was born and lives, and how they
 * moved across generations. The list works without any network; the map
 * looks places up on OpenStreetMap when asked (place names only).
 */

import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { computeGenerations } from '../../data/familyDataService.js';
import { buildMigrationSummary, geocodePlaces, loadGeocodeCache } from '../../migrations/migrationEngine.js';

const MigrationMap = lazy(() => import('../MigrationMap.jsx'));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export default function FamilyPlacesModal({ isOpen, onClose, onSelectPerson }) {
  const [coords, setCoords] = useState(() => loadGeocodeCache());
  const [locating, setLocating] = useState(null);
  const [error, setError] = useState('');
  const [focusPlace, setFocusPlace] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCoords(loadGeocodeCache());
    setError('');
    setFocusPlace(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const data = useMemo(() => {
    if (!isOpen) return null;
    const snap = familyStore.getSnapshot();
    const gens = computeGenerations(snap.people, snap.relationships);
    const minGen = Math.min(...gens.values(), 0);
    const normalized = new Map([...gens].map(([id, g]) => [String(id), g - minGen]));
    return { ...buildMigrationSummary(snap.people, normalized), byId: new Map(snap.people.map((p) => [String(p.id), p])) };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const { places, moves, unplaced, byId } = data;
  const missing = places.filter((p) => !(p.key in coords));
  const located = places.filter((p) => coords[p.key]);
  const nameOf = (id) => byId.get(id)?.displayName || '';

  const locate = async () => {
    setError('');
    setLocating({ done: 0, total: missing.length });
    try {
      const found = await geocodePlaces(
        missing.map((p) => p.name),
        {
          onProgress: (p) => {
            setLocating({ done: p.done, total: p.total, name: p.name });
            if (p.error) setError(`Could not reach OpenStreetMap (${p.error}). Try again when online.`);
          },
        }
      );
      setCoords((prev) => ({ ...prev, ...found }));
    } finally {
      setLocating(null);
    }
  };

  const shownPlaces = focusPlace ? places.filter((p) => p.key === focusPlace) : places;

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Family places and migrations">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container" style={{ maxWidth: '1040px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">Roots &amp; journeys</span>
            <h2 className="ft-view-modal__title">Family places</h2>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ft-modal-form-body ft-places">
          <section className="ft-places__list" aria-label="Places and moves">
            <h3 className="ft-places__heading">Moves</h3>
            {moves.length === 0 ? (
              <p className="ft-kin-hint">No moves recorded yet. Add birthplaces and where people live now.</p>
            ) : (
              <ul className="ft-places__moves">
                {moves.map((m) => (
                  <li key={`${m.from}→${m.to}`}>
                    <span className="ft-places__route">
                      {m.fromName} <span aria-hidden="true">→</span> {m.toName}
                    </span>
                    <span className="ft-places__count">
                      {m.people.length} {m.people.length === 1 ? 'person' : 'people'}
                      {m.generations.length > 0 && ` · Gen ${m.generations.map((g) => ROMAN[g] || g + 1).join(', ')}`}
                    </span>
                    <span className="ft-places__people">
                      {m.people.map((id, i) => (
                        <React.Fragment key={id}>
                          {i > 0 && ', '}
                          <button type="button" className="ft-history__link" onClick={() => onSelectPerson?.(id)}>
                            {nameOf(id)}
                          </button>
                        </React.Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="ft-places__heading">
              Places{' '}
              {focusPlace && (
                <button type="button" className="ft-voice__link" onClick={() => setFocusPlace(null)}>
                  show all
                </button>
              )}
            </h3>
            <ul className="ft-places__places">
              {shownPlaces.map((p) => (
                <li key={p.key}>
                  <strong>{p.name}</strong>
                  <span className="ft-places__count">
                    {p.born.length} born · {p.living.length} living
                  </span>
                </li>
              ))}
            </ul>
            {unplaced.length > 0 && (
              <p className="ft-kin-hint">{unplaced.length} people have no places recorded.</p>
            )}
          </section>

          <section className="ft-places__map" aria-label="Map">
            {located.length > 0 ? (
              <Suspense fallback={<div className="ft-migration-map ft-migration-map--loading">Loading map…</div>}>
                <MigrationMap places={places} moves={moves} coords={coords} onSelectPlace={setFocusPlace} />
              </Suspense>
            ) : (
              <div className="ft-migration-map ft-migration-map--empty">
                <p>See your family’s places on a map.</p>
              </div>
            )}
            {missing.length > 0 && (
              <div className="ft-places__locate">
                <button type="button" className="ft-form-btn ft-form-btn--primary" onClick={locate} disabled={!!locating}>
                  {locating
                    ? `Locating ${locating.done + 1 > locating.total ? locating.total : locating.done + 1} of ${locating.total}…`
                    : `Locate ${missing.length} place${missing.length === 1 ? '' : 's'} on the map`}
                </button>
                <p className="ft-voice__note">
                  Looks up place names only (never people’s names) on OpenStreetMap, about one per second. Results
                  are remembered on this device.
                </p>
              </div>
            )}
            {located.length < places.length && missing.length === 0 && (
              <p className="ft-voice__note">
                {places.length - located.length} place(s) could not be found on the map; try adding the district
                (e.g. “Muthagudem, Khammam”).
              </p>
            )}
            {error && <p className="ft-voice__error">{error}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
