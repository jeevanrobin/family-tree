import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import FadeContent from '../react-bits/FadeContent.jsx';
import AuthShell from './AuthShell.jsx';
import AuthInput from './AuthInput.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';

/**
 * Reset Password Page
 * Set a new password after following an email reset link.
 * Uses the existing useAuth()/Supabase implementation — presentation only.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const isReducedMotion = useReducedMotion();

  const handleReset = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit
    setStatusMessage(null);

    if (password !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (password.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    try {
      setLoading(true);
      const { error } = await updateUser({ data: {}, password });

      if (error) {
        throw error;
      }

      setStatusMessage({
        type: 'success',
        text: 'Your password has been successfully reset! Redirecting to sign in...',
      });

      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    } catch (err) {
      console.error('Password reset update error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update password. Please try requesting a new reset link.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="fa-card">
        <FadeContent duration={500} delay={90} distance={12} isReducedMotion={isReducedMotion}>
          <h1 className="fa-card__title">Set a new password</h1>
          <p className="fa-card__sub">Choose a new password for your account.</p>
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

        <FadeContent duration={500} delay={170} distance={12} isReducedMotion={isReducedMotion}>
          <form onSubmit={handleReset} className="fa-form" noValidate={false}>
            <AuthInput
              id="new-password"
              label="New Password"
              type="password"
              passwordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              minLength={6}
              autoFocus
              disabled={loading}
            />

            <AuthInput
              id="confirm-new-password"
              label="Confirm New Password"
              type="password"
              passwordToggle
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={loading}
            />

            <button
              type="submit"
              className="fa-btn fa-btn--primary fa-btn--block"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="fa-btn__spinner" aria-hidden="true" />
                  Updating Password…
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </FadeContent>

        <FadeContent duration={500} delay={240} distance={10} isReducedMotion={isReducedMotion}>
          <div className="fa-card__footer">
            <p>
              <button
                type="button"
                onClick={() => navigate('/signin')}
                className="fa-link"
              >
                Back to Sign In
              </button>
            </p>
          </div>
        </FadeContent>
      </div>
    </AuthShell>
  );
}
