import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import FadeContent from '../react-bits/FadeContent.jsx';
import ClickSpark from '../react-bits/ClickSpark.jsx';
import AuthShell from './AuthShell.jsx';
import AuthInput from './AuthInput.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';

/**
 * Sign Up Page
 * New account creation with first name, email, and password.
 * Uses the existing useAuth()/Supabase signup as the source of truth —
 * validation, email confirmation and session behavior are unchanged.
 */
export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [fieldErrors, setFieldErrors] = useState({});
  const [isEmailVerificationSent, setIsEmailVerificationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp, error: authError } = useAuth();
  const navigate = useNavigate();
  const isReducedMotion = useReducedMotion();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // If running in Local Mode without Supabase, navigate directly to app
    if (!isSupabaseConfigured) {
      navigate('/app');
      return;
    }

    setStatusMessage(null);
    setFieldErrors({});

    const cleanFirstName = firstName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Client-side validations (unchanged rules, now with inline field errors)
    if (!cleanFirstName) {
      setFieldErrors({ firstName: 'Please enter your first name.' });
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setFieldErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 6) {
      setFieldErrors({ password: 'Password must be at least 6 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signUp({
        email: cleanEmail,
        password,
        data: {
          firstName: cleanFirstName,
          first_name: cleanFirstName,
          full_name: cleanFirstName,
        },
      });

      if (res?.error) {
        throw res.error;
      }

      // Check if email confirmation is required (user created but no active session returned)
      if (res?.user && !res?.session) {
        setIsEmailVerificationSent(true);
      } else {
        // User is directly authenticated, proceed to app gateway
        navigate('/app');
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to create account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Email verification state ──
  if (isEmailVerificationSent) {
    return (
      <AuthShell>
        <div className="fa-card">
          <div className="fa-verify">
            <div className="fa-verify__icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 6L2 7" />
              </svg>
            </div>

            <h1 className="fa-card__title">Check your email</h1>
            <p className="fa-card__sub">
              We sent a verification link to your email address.
            </p>

            <span className="fa-verify__email">{email}</span>

            <p className="fa-verify__note">
              After verifying your email, sign in to continue creating your family space.
            </p>

            <div className="fa-verify__actions">
              <Link to="/signin" className="fa-btn fa-btn--primary fa-btn--block">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  // ── Sign-up form ──
  return (
    <AuthShell>
      <div className="fa-card">
        <FadeContent duration={500} delay={90} distance={12} isReducedMotion={isReducedMotion}>
          <h1 className="fa-card__title">Create your family space</h1>
          <p className="fa-card__sub">
            Start building your family&rsquo;s story, one connection at a time.
          </p>
        </FadeContent>

        {statusMessage && (
          <div className={`fa-banner fa-banner--${statusMessage.type}`} role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
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
              <strong>Local Demo Mode:</strong> Cloud authentication is optional. You can build your family tree offline.
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
              Start Local Family Space &rarr;
            </Link>
          </div>
        )}

        <FadeContent duration={500} delay={170} distance={12} isReducedMotion={isReducedMotion}>
          <form onSubmit={handleSubmit} className="fa-form" noValidate={false}>
            <AuthInput
              id="first-name"
              label="First Name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              autoComplete="given-name"
              autoFocus
              required
              disabled={isSubmitting}
              error={fieldErrors.firstName}
            />

            <AuthInput
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              error={fieldErrors.email}
            />

            <AuthInput
              id="password"
              label="Password"
              type="password"
              passwordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={isSubmitting}
              error={fieldErrors.password}
              helpText="At least 6 characters."
            />

            <AuthInput
              id="confirm-password"
              label="Confirm Password"
              type="password"
              passwordToggle
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={isSubmitting}
              error={fieldErrors.confirmPassword}
            />

            <ClickSpark
              sparkColor="var(--ft-accent)"
              sparkSize={6}
              sparkCount={6}
              className="fa-spark-wrap"
            >
              <button
                type="submit"
                className="fa-btn fa-btn--primary fa-btn--block"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="fa-btn__spinner" aria-hidden="true" />
                    Creating Account…
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </ClickSpark>
          </form>
        </FadeContent>

        <FadeContent duration={500} delay={240} distance={10} isReducedMotion={isReducedMotion}>
          <div className="fa-card__footer">
            <p>
              Already have an account?{' '}
              <Link to="/signin" className="fa-link">
                Sign In
              </Link>
            </p>
          </div>
        </FadeContent>
      </div>
    </AuthShell>
  );
}
