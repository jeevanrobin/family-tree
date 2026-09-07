/**
 * DataManagementModal Component — Backup, Export, Import & Reset
 * Secure JSON export, validated backup import, and sample data restoration.
 */

import React, { useState, useRef } from 'react';

export default function DataManagementModal({
  isOpen,
  onClose,
  onExportData,
  onImportData,
  onResetData,
  onClearData,
}) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const data = onExportData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medida-family-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: 'Family data successfully exported as backup JSON.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Export failed.',
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onImportData(text);
          setStatusMessage({
            type: 'success',
            text: 'Family data successfully imported and verified!',
          });
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Failed to import family data.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    onResetData();
    setResetConfirmOpen(false);
    setStatusMessage({
      type: 'success',
      text: 'Family tree has been reset to sample data.',
    });
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    if (onClearData) {
      onClearData();
    }
    setClearConfirmOpen(false);
    setStatusMessage({
      type: 'success',
      text: 'All dummy family data cleared! You now have a fresh, blank family tree.',
    });
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Data Management & Backup">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container" style={{ maxWidth: '540px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">FAMILY STORE</span>
            <h2 className="ft-view-modal__title">Backup &amp; Data Management</h2>
            <p className="ft-view-modal__subtitle">Export backup, restore data, or reset to original sample family</p>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {statusMessage && (
          <div
            className={`ft-form-error-banner ${statusMessage.type === 'success' ? 'ft-form-error-banner--success' : ''}`}
            style={{
              background: statusMessage.type === 'success' ? 'var(--ft-emerald-soft)' : 'var(--ft-coral-soft)',
              color: statusMessage.type === 'success' ? 'var(--ft-emerald)' : 'var(--ft-coral)',
              borderColor: statusMessage.type === 'success' ? 'var(--ft-emerald-border)' : 'var(--ft-coral)',
            }}
          >
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Export Card */}
          <div className="ft-data-action-card">
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--ft-text-primary)' }}>
                Export Family Backup
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--ft-text-secondary)', marginTop: '2px' }}>
                Download a versioned JSON file of all members, relationships, and metadata.
              </p>
            </div>
            <button
              className="ft-form-btn ft-form-btn--primary"
              onClick={handleExport}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export JSON</span>
            </button>
          </div>

          {/* Import Card */}
          <div className="ft-data-action-card">
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--ft-text-primary)' }}>
                Import Family Backup
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--ft-text-secondary)', marginTop: '2px' }}>
                Load and validate a previously saved backup file.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="ft-form-btn ft-form-btn--secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Choose File</span>
            </button>
          </div>

          {/* Clear All Data Card */}
          <div className="ft-data-action-card" style={{ borderLeft: '3px solid var(--ft-orange-primary)' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--ft-orange-primary)' }}>
                Clear All Data (Start Fresh)
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--ft-text-secondary)', marginTop: '2px' }}>
                Remove all dummy people, stories, events, and photos to begin building your own family tree from scratch.
              </p>
            </div>
            <button
              className="ft-form-btn"
              style={{ background: 'rgba(229, 101, 21, 0.15)', color: 'var(--ft-orange-primary)', border: '1px solid var(--ft-orange-primary)', fontWeight: 600 }}
              onClick={() => setClearConfirmOpen(true)}
            >
              Clear All Data
            </button>
          </div>

          {/* Reset Card */}
          <div className="ft-data-action-card" style={{ borderLeft: '3px solid var(--ft-coral)' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--ft-coral)' }}>
                Reset to Sample Family
              </div>
              <p style={{ fontSize: '0.80rem', color: 'var(--ft-text-secondary)', marginTop: '2px' }}>
                Restore the default 4-generation Medida family dataset.
              </p>
            </div>
            <button
              className="ft-form-btn"
              style={{ background: 'var(--ft-coral-soft)', color: 'var(--ft-coral)', border: '1px solid var(--ft-coral)' }}
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset Tree
            </button>
          </div>
        </div>

        {/* Clear Confirmation Overlay */}
        {clearConfirmOpen && (
          <div className="ft-reset-modal-confirm">
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--ft-orange-primary)' }}>
              Clear All Family Data?
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--ft-text-secondary)', margin: '8px 0 16px' }}>
              This will remove all dummy/sample people, relationships, stories, events, photos, and documents, giving you a fresh blank canvas to build your own family.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="ft-form-btn ft-form-btn--secondary"
                onClick={() => setClearConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="ft-form-btn"
                style={{ background: 'var(--ft-orange-primary)', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={handleClear}
              >
                Confirm Clear
              </button>
            </div>
          </div>
        )}

        {/* Reset Confirmation Overlay */}
        {resetConfirmOpen && (
          <div className="ft-reset-modal-confirm">
            <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--ft-coral)' }}>
              Reset Family Tree?
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--ft-text-secondary)', margin: '8px 0 16px' }}>
              This will replace your current local family data with the original sample family.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="ft-form-btn ft-form-btn--secondary"
                onClick={() => setResetConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="ft-form-btn"
                style={{ background: 'var(--ft-coral)', color: '#fff', border: 'none' }}
                onClick={handleReset}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        )}

        <div className="ft-modal-footer">
          <button
            type="button"
            className="ft-form-btn ft-form-btn--secondary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
