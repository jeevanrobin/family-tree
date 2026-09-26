/**
 * RelationshipConflictBanner — lists relationships that contradict each other
 * (spouses also saved as parent/child, someone as their own ancestor) with a
 * one-click fix for each. Removals go through the store, so they appear in
 * Change history and can be undone there.
 */

import React, { useState } from 'react';

const MAX_SHOWN = 3;

export default function RelationshipConflictBanner({ conflicts, persons, onRemoveRelationships, onSelectPerson, onHide }) {
  const [fixedCount, setFixedCount] = useState(0);
  if (!conflicts?.length && fixedCount === 0) return null;

  const nameOf = (id) => {
    const p = persons?.find((x) => String(x.id) === String(id));
    return p?.displayName || p?.firstName || 'this person';
  };

  const fix = (ids) => {
    onRemoveRelationships(ids.filter(Boolean));
    setFixedCount((n) => n + 1);
  };

  if (!conflicts?.length) {
    return (
      <div className="ft-arrange-banner ft-arrange-banner--warning ft-conflicts" role="status">
        <div className="ft-arrange-banner__info">
          <span className="ft-arrange-banner__dot ft-conflicts__dot--ok" />
          <span className="ft-arrange-banner__text">
            <strong>All relationships look right now.</strong> Changed something by mistake? Undo it from Change
            history in the account menu.
          </span>
        </div>
        <button type="button" className="ft-arrange-banner__done-btn" onClick={onHide}>
          OK
        </button>
      </div>
    );
  }

  return (
    <div className="ft-arrange-banner ft-arrange-banner--warning ft-conflicts" role="alert">
      <div className="ft-conflicts__body">
        <div className="ft-arrange-banner__info">
          <span className="ft-arrange-banner__dot" />
          <span className="ft-arrange-banner__text">
            <strong>
              {conflicts.length === 1 ? 'One relationship needs' : `${conflicts.length} relationships need`} checking
            </strong>
          </span>
        </div>
        <ul className="ft-conflicts__list">
          {conflicts.slice(0, MAX_SHOWN).map((c) => (
            <li key={`${c.kind}:${c.ids.join('|')}`} className="ft-conflicts__item">
              <span className="ft-conflicts__message">{c.message}.</span>
              <span className="ft-conflicts__actions">
                {c.kind === 'spouse-and-parent' && (
                  <>
                    <button type="button" className="ft-conflicts__btn" onClick={() => fix(c.parentRelationshipIds)}>
                      Keep as husband &amp; wife
                    </button>
                    <button type="button" className="ft-conflicts__btn" onClick={() => fix(c.spouseRelationshipIds)}>
                      Keep as parent &amp; child
                    </button>
                  </>
                )}
                {c.kind === 'own-parent' && (
                  <button type="button" className="ft-conflicts__btn" onClick={() => fix(c.relationshipIds)}>
                    Remove this link
                  </button>
                )}
                {c.kind === 'ancestor-loop' && c.closingRelationshipId && (
                  <button type="button" className="ft-conflicts__btn" onClick={() => fix([c.closingRelationshipId])}>
                    Remove “{nameOf(c.ids[c.ids.length - 1])} is parent of {nameOf(c.ids[0])}”
                  </button>
                )}
                <button
                  type="button"
                  className="ft-conflicts__btn ft-conflicts__btn--ghost"
                  onClick={() => onSelectPerson?.(c.ids[0])}
                >
                  Show {nameOf(c.ids[0])}
                </button>
              </span>
            </li>
          ))}
        </ul>
        {conflicts.length > MAX_SHOWN && (
          <p className="ft-conflicts__more">and {conflicts.length - MAX_SHOWN} more — fix these first.</p>
        )}
      </div>
      <button type="button" className="ft-arrange-banner__done-btn" onClick={onHide} title="Hide this message">
        Hide
      </button>
    </div>
  );
}
