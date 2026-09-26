/**
 * AppErrorBoundary — keeps a rendering crash in one screen from blanking the
 * whole app. Shows a calm recovery screen instead; family data is untouched
 * (it lives in the store / local cache, not in component state).
 */

import React from 'react';

const STALE_CODE = /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Invalid hook call/i;
const RELOAD_KEY = 'medida-error-reloaded';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    // The app has been running fine for a while: allow a future auto-reload.
    this.resetTimer = setTimeout(() => {
      try {
        if (!this.state.error) sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // ignore
      }
    }, 10000);
  }

  componentWillUnmount() {
    clearTimeout(this.resetTimer);
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary caught a rendering error:', error, info?.componentStack);
    this.setState({ componentStack: info?.componentStack || '' });

    // After an update (git pull / new deploy) the browser can still hold
    // references to old code chunks. Reloading once fetches the new ones.
    if (STALE_CODE.test(String(error?.message || error))) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
        }
      } catch {
        // storage blocked — fall through to the manual screen
      }
    }
  }

  copyDetails = () => {
    try {
      navigator.clipboard?.writeText(this.details());
      this.setState({ copied: true });
    } catch {
      // clipboard unavailable — the text is still visible to select
    }
  };

  details() {
    const { error, componentStack } = this.state;
    const stack = String(error?.stack || '').split('\n').slice(0, 8).join('\n');
    const where = String(componentStack || '').trim().split('\n').slice(0, 6).join('\n');
    return [`${error?.name || 'Error'}: ${error?.message || error}`, `Page: ${window.location.pathname}`, stack, where]
      .filter(Boolean)
      .join('\n\n');
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="ft-error-screen" role="alert">
        <div className="ft-error-screen__card">
          <p className="ft-error-screen__eyebrow">Something went wrong</p>
          <h1 className="ft-error-screen__title">This page couldn’t be displayed.</h1>
          <p className="ft-error-screen__body">
            Your family’s data is safe. Reload to try again, or go back to the family tree.
          </p>
          <details className="ft-error-screen__details">
            <summary>Technical details</summary>
            <pre>{this.details()}</pre>
            <button type="button" className="ft-error-screen__btn" onClick={this.copyDetails}>
              {this.state.copied ? 'Copied' : 'Copy details'}
            </button>
          </details>
          <div className="ft-error-screen__actions">
            <button type="button" className="ft-error-screen__btn ft-error-screen__btn--primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <a className="ft-error-screen__btn" href="/app">
              Back to family tree
            </a>
          </div>
        </div>
      </div>
    );
  }
}
