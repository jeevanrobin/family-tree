/**
 * AppErrorBoundary — keeps a rendering crash in one screen from blanking the
 * whole app. Shows a calm recovery screen instead; family data is untouched
 * (it lives in the store / local cache, not in component state).
 */

import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary caught a rendering error:', error, info?.componentStack);
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
