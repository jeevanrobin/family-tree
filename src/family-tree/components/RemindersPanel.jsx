/**
 * RemindersPanel — upcoming birthdays, wedding anniversaries and death
 * anniversaries, opened from the header bell.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import familyStore from '../store/FamilyStore.js';
import { getUpcomingOccasions, describeWhen } from '../reminders/remindersEngine.js';

const LOOKAHEAD_DAYS = 30;
const BADGE_DAYS = 7;

const ICON = { birthday: '🎂', anniversary: '💍', 'death-anniversary': '🪔' };
const LABEL = { birthday: 'Birthday', anniversary: 'Anniversary', 'death-anniversary': 'Vardhanti' };

/** Upcoming occasions for the current family, kept in sync with the store. */
export function useUpcomingOccasions(days = LOOKAHEAD_DAYS) {
  const [snapshot, setSnapshot] = useState(() => familyStore.getSnapshot());
  useEffect(() => familyStore.subscribe(setSnapshot), []);
  return useMemo(
    () => getUpcomingOccasions({ people: snapshot.people, relationships: snapshot.relationships }, { days }),
    [snapshot, days]
  );
}

export function countSoonOccasions(occasions) {
  return occasions.filter((o) => o.daysAway <= BADGE_DAYS).length;
}

export default function RemindersPanel({ occasions, onClose, onSelectPerson }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onPointer = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="ft-reminders" ref={panelRef} role="dialog" aria-label="Upcoming family occasions">
      <div className="ft-reminders__head">
        <span className="ft-reminders__title">Upcoming occasions</span>
        <span className="ft-reminders__sub">Next {LOOKAHEAD_DAYS} days</span>
      </div>

      {occasions.length === 0 ? (
        <p className="ft-reminders__empty">
          Nothing in the next {LOOKAHEAD_DAYS} days. Add dates of birth, marriage and death to people to get
          reminders here.
        </p>
      ) : (
        <ul className="ft-reminders__list">
          {occasions.map((o) => (
            <li key={o.id + o.date}>
              <button
                type="button"
                className={`ft-reminders__item ${o.daysAway === 0 ? 'ft-reminders__item--today' : ''}`}
                onClick={() => {
                  onSelectPerson?.(o.personIds[0]);
                  onClose?.();
                }}
              >
                <span className="ft-reminders__icon" aria-hidden="true">{ICON[o.type]}</span>
                <span className="ft-reminders__text">
                  <span className="ft-reminders__what">{o.title}</span>
                  <span className="ft-reminders__when">
                    {describeWhen(o.daysAway)} ·{' '}
                    {new Date(`${o.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ·{' '}
                    {LABEL[o.type]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
