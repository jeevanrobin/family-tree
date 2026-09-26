import React from 'react';

export default function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFocusSelected,
  onFitBranch,
  focusMode = 'all',
  onSetFocusMode,
  labelLanguage = 'te',
  onSetLabelLanguage,
  onExpandAll,
  onCollapseAll,
  hasSelection,
  scale = 1,
}) {
  return (
    <div className="ft-controls" role="toolbar" aria-label="Tree view controls">
      {/* Expand / Collapse All Quick Actions */}
      <div className="ft-controls__group">
        <button
          type="button"
          className="ft-controls__btn ft-controls__btn--text"
          onClick={onExpandAll}
          title="Expand all branches"
          aria-label="Expand all branches"
        >
          Expand All
        </button>
        <button
          type="button"
          className="ft-controls__btn ft-controls__btn--text"
          onClick={onCollapseAll}
          title="Collapse all branches"
          aria-label="Collapse all branches"
        >
          Collapse
        </button>
      </div>

      <div className="ft-controls__divider" />

      {/* Focus Mode Selector (when person is selected) */}
      {hasSelection && (
        <>
          <div className="ft-controls__group ft-controls__group--focus" role="radiogroup" aria-label="Tree Focus Mode">
            <button
              type="button"
              className={`ft-controls__pill-btn ${focusMode === 'person' ? 'ft-controls__pill-btn--active' : ''}`}
              onClick={() => onSetFocusMode?.(focusMode === 'person' ? 'all' : 'person')}
              title="Focus Person (isolate lineage)"
              aria-label="Focus Person"
            >
              Focus Person
            </button>
            <button
              type="button"
              className={`ft-controls__pill-btn ${focusMode === 'family' ? 'ft-controls__pill-btn--active' : ''}`}
              onClick={() => onSetFocusMode?.(focusMode === 'family' ? 'all' : 'family')}
              title="Focus Family (isolate unit)"
              aria-label="Focus Family"
            >
              Focus Family
            </button>
          </div>
          <div className="ft-controls__divider" />
          <div className="ft-controls__group" role="radiogroup" aria-label="Relationship label language">
            <button
              type="button"
              role="radio"
              aria-checked={labelLanguage === 'te'}
              className={`ft-controls__pill-btn ${labelLanguage === 'te' ? 'ft-controls__pill-btn--active' : ''}`}
              onClick={() => onSetLabelLanguage?.('te')}
              title="Show relationships in Telugu"
              lang="te"
            >
              తెలుగు
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={labelLanguage === 'en'}
              className={`ft-controls__pill-btn ${labelLanguage === 'en' ? 'ft-controls__pill-btn--active' : ''}`}
              onClick={() => onSetLabelLanguage?.('en')}
              title="Show relationships in English"
            >
              EN
            </button>
          </div>
          <div className="ft-controls__divider" />
        </>
      )}

      {/* Zoom controls */}
      <button className="ft-controls__btn" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">−</button>
      <span className="ft-controls__scale-badge">{Math.round(scale * 100)}%</span>
      <button className="ft-controls__btn" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">+</button>

      <div className="ft-controls__divider" />

      {/* Return Home / Fit All */}
      <button className="ft-controls__btn" onClick={onReset} title="Fit entire tree (Return Home)" aria-label="Fit entire tree">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>

      {/* Center on person & Fit branch */}
      {hasSelection && (
        <>
          <button
            className="ft-controls__focus-btn"
            onClick={onFocusSelected}
            title="Center on selected person"
            aria-label="Center selected person"
          >
            ◎
          </button>
          {onFitBranch && (
            <button
              className="ft-controls__btn"
              onClick={onFitBranch}
              title="Fit branch of selected person"
              aria-label="Fit branch"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <path d="M10 7h4a2 2 0 0 1 2 2v5" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
