import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import FadeContent from '../react-bits/FadeContent.jsx';
import ClickSpark from '../react-bits/ClickSpark.jsx';
import AuthShell from './AuthShell.jsx';
import AuthInput from './AuthInput.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';

/**
 * Sign In Page
 * Email/password authentication with sign-in and forgot-password flows.
 * Uses the existing useAuth()/Supabase implementation — presentation only.
 */
export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formType, setFormType] = useState('signin'); // 'signin' | 'forgot-password'
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const { signIn, resetPassword, loading, error: authError } = useAuth();
  const navigate = useNavigate();
  const isReducedMotion = useReducedMotion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit
    setStatusMessage(null);

    // If Supabase is not configured, running locally doesn't require cloud authentication
    if (!isSupabaseConfigured) {
      navigate('/app');
      return;
    }

    try {
      if (formType === 'signin') {
        await signIn({ email, password });
        navigate('/app');
      } else if (formType === 'forgot-password') {
        await resetPassword({ email });
        // Generic success response to avoid revealing user existence
        setStatusMessage({
          type: 'success',
          text: 'If an account exists with that email address, you will receive password reset instructions shortly.',
        });
        setEmail('');
      }
    } catch (err) {
      if (formType === 'forgot-password') {
        // Always show generic message to avoid email enumeration
        setStatusMessage({
          type: 'success',
          text: 'If an account exists with that email address, you will receive password reset instructions shortly.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Authentication failed. Please check your credentials and try again.',
        });
      }
      console.warn('Auth error:', err?.message || err);
    }
  };

  const switchToForgot = () => {
    setFormType('forgot-password');
    setStatusMessage(null);
  };

  const switchToSignIn = () => {
    setFormType('signin');
    setStatusMessage(null);
  };

  const isForgot = formType === 'forgot-password';

  return (
    <AuthShell>
      <div className="fa-card">
        <FadeContent duration={500} delay={90} distance={12} isReducedMotion={isReducedMotion}>
          <h1 className="fa-card__title">{isForgot ? 'Reset your password' : 'Welcome back'}</h1>
          <p className="fa-card__sub">
            {isForgot
              ? 'Enter your registered email and we\u2019ll send you a link to reset your password.'
              : 'Continue preserving your family\u2019s story.'}
          </p>
        </FadeContent>

        {statusMessage && (
          <div className={`fa-banner fa-banner--${statusMessage.type}`} role="alert">
            {statusMessage.type === 'success' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            )}
            {statusMessage.text}
          </div>
        )}

        {authError && !statusMessage && (
          <div className="fa-banner fa-banner--error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {authError}
          </div>
        )}

        {!isSupabaseConfigured && (
          <div
            className="fa-banner"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'var(--ft-surface-soft)',
              borderColor: 'var(--ft-border)',
              color: 'var(--ft-text-secondary)',
              fontSize: '0.85rem',
            }}
          >
            <span>
              <strong>Local Demo Mode:</strong> Cloud authentication is optional. All features run offline in your browser.
            </span>
            <Link
              to="/app"
              className="fl-btn fl-btn--primary"
              style={{
                alignSelf: 'flex-start',
                padding: '6px 14px',
                fontSize: '0.82rem',
                borderRadius: '8px',
              }}
            >
              Open Family App Directly &rarr;
            </Link>
          </div>
        )}

        <FadeContent duration={500} delay={170} distance={12} isReducedMotion={isReducedMotion}>
          <form onSubmit={handleSubmit} className="fa-form" noValidate={false}>
            <AuthInput
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              autoFocus
              required
              disabled={loading}
            />

            {!isForgot && (
              <AuthInput
                id="password"
                label="Password"
                type="password"
                passwordToggle
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={loading}
                labelAction={
                  <button type="button" className="fa-link" onClick={switchToForgot}>
                    Forgot password?
                  </button>
                }
              />
            )}

            {isForgot && (
              <p className="fa-field__help">
                Enter your registered email and we&rsquo;ll send a link to reset your password.
              </p>
            )}

            <ClickSpark
              sparkColor="var(--ft-accent)"
              sparkSize={6}
              sparkCount={6}
              className="fa-spark-wrap"
            >
              <button type="submit" className="fa-btn fa-btn--primary fa-btn--block" disabled={loading}>
                {loading ? (
                  <>
                    <span className="fa-btn__spinner" aria-hidden="true" />
                    {isForgot ? 'Sending…' : 'Signing in…'}
                  </>
                ) : isForgot ? (
                  'Send Reset Link'
                ) : (
                  'Sign In'
                )}
              </button>
            </ClickSpark>
          </form>
        </FadeContent>

        <FadeContent duration={500} delay={240} distance={10} isReducedMotion={isReducedMotion}>
          <div className="fa-card__footer">
            {isForgot ? (
              <p>
                <button type="button" className="fa-link" onClick={switchToSignIn}>
                  Back to Sign In
                </button>
              </p>
            ) : (
              <>
                <p>
                  Don&rsquo;t have an account?{' '}
                  <Link to="/signup" className="fa-link">
                    Create Your Family
                  </Link>
                </p>
              </>
            )}
          </div>
        </FadeContent>
      </div>
    </AuthShell>
  );
}
