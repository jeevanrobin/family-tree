/**
 * TreePosterModal — preview the whole family tree as a poster and export it
 * as PNG (sharing), SVG (print shops) or PDF (via the browser's print dialog).
 */

import React, { useEffect, useMemo, useState } from 'react';
import familyStore from '../../store/FamilyStore.js';
import { buildTreePosterSvg, posterSvgToPng } from '../../poster/treePoster.js';

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const slug = (s) => (s || 'family-tree').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'family-tree';

export default function TreePosterModal({ isOpen, onClose, familyName = '' }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [theme, setTheme] = useState('light');
  const [showYears, setShowYears] = useState(true);
  const [showPlaces, setShowPlaces] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    setTitle(familyName ? `${familyName} Family Tree` : 'Our Family Tree');
    setError('');
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, familyName, onClose]);

  const poster = useMemo(() => {
    if (!isOpen) return null;
    return buildTreePosterSvg(familyStore.getSnapshot(), { title, subtitle, theme, showYears, showPlaces });
  }, [isOpen, title, subtitle, theme, showYears, showPlaces]);

  const previewUrl = useMemo(
    () => (poster ? URL.createObjectURL(new Blob([poster.svg], { type: 'image/svg+xml;charset=utf-8' })) : ''),
    [poster]
  );
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  if (!isOpen || !poster) return null;

  const run = async (label, action) => {
    setBusy(label);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message || 'Export failed.');
    } finally {
      setBusy('');
    }
  };

  const exportPng = () =>
    run('png', async () => download(await posterSvgToPng(poster.svg, poster.width, poster.height, 2), `${slug(title)}.png`));

  const exportSvg = () =>
    run('svg', async () => download(new Blob([poster.svg], { type: 'image/svg+xml;charset=utf-8' }), `${slug(title)}.svg`));

  // Print through a separate window sized to the poster; "Save as PDF" in the
  // browser's print dialog produces a vector PDF.
  const printPdf = () =>
    run('pdf', async () => {
      const win = window.open('', '_blank');
      if (!win) throw new Error('Allow pop-ups for this site to print the poster.');
      const landscape = poster.width >= poster.height;
      win.document.write(`<!doctype html><html><head><title>${title.replace(/</g, '&lt;')}</title>
<style>@page{size:${landscape ? 'A3 landscape' : 'A3 portrait'};margin:10mm}html,body{margin:0}svg{width:100%;height:auto;display:block}</style>
</head><body>${poster.svg}</body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    });

  return (
    <div className="ft-view-modal" role="dialog" aria-label="Family tree poster">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container ft-poster-modal" style={{ maxWidth: '980px' }}>
        <header className="ft-view-modal__header">
          <div>
            <span className="ft-view-modal__eyebrow">Print &amp; share</span>
            <h2 className="ft-view-modal__title">Family tree poster</h2>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="ft-modal-form-body ft-poster-body">
          <div className="ft-poster-options">
            <div className="ft-form-field">
              <label htmlFor="poster-title">Title</label>
              <input id="poster-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </div>
            <div className="ft-form-field">
              <label htmlFor="poster-subtitle">Subtitle</label>
              <input
                id="poster-subtitle"
                value={subtitle}
                placeholder="e.g. Medida family reunion · Muthagudem 2026"
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="ft-poster-toggles">
              <label>
                <input type="radio" name="poster-theme" checked={theme === 'light'} onChange={() => setTheme('light')} /> Light
              </label>
              <label>
                <input type="radio" name="poster-theme" checked={theme === 'dark'} onChange={() => setTheme('dark')} /> Dark
              </label>
              <label>
                <input type="checkbox" checked={showYears} onChange={(e) => setShowYears(e.target.checked)} /> Years
              </label>
              <label>
                <input type="checkbox" checked={showPlaces} onChange={(e) => setShowPlaces(e.target.checked)} /> Birthplaces
              </label>
            </div>
            <p className="ft-poster-meta">
              {poster.count} people · {poster.width} × {poster.height} px
            </p>
            <div className="ft-poster-actions">
              <button type="button" className="ft-form-btn ft-form-btn--primary" onClick={exportPng} disabled={!!busy}>
                {busy === 'png' ? 'Preparing…' : 'Download PNG'}
              </button>
              <button type="button" className="ft-form-btn ft-form-btn--secondary" onClick={printPdf} disabled={!!busy}>
                Print / Save as PDF
              </button>
              <button type="button" className="ft-form-btn ft-form-btn--secondary" onClick={exportSvg} disabled={!!busy}>
                Download SVG
              </button>
            </div>
            <p className="ft-poster-hint">PNG is best for WhatsApp. SVG or PDF stays sharp at any print size.</p>
            {error && <p className="ft-voice__error" role="alert">{error}</p>}
          </div>
          <div className="ft-poster-preview">
            <img src={previewUrl} alt={`Preview of ${title}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
