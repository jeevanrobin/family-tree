import React from 'react';

export default function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFocusSelected,
  hasSelection,
  scale = 1,
}) {
  return (
    <div className="ft-controls" role="toolbar" aria-label="Tree view controls">
      <div className="ft-controls__divider" />
      <button className="ft-controls__btn" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">−</button>
      <span className="ft-controls__scale-badge">{Math.round(scale * 100)}%</span>
      <button className="ft-controls__btn" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">+</button>
      <div className="ft-controls__divider" />
      <button className="ft-controls__btn" onClick={onReset} title="Fit entire tree" aria-label="Fit entire tree">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
      {hasSelection && <button className="ft-controls__focus-btn" onClick={onFocusSelected} title="Center on selected person" aria-label="Center selected person">◎</button>}
    </div>
  );
}
