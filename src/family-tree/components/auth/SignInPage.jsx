import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';

/**
 * Sign In Page
 * Email/password authentication form with sign-in, sign-up, and forgot-password flows.
 */
export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formType, setFormType] = useState('signin'); // 'signin' | 'signup' | 'forgot-password'
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const { signIn, signUp, resetPassword, loading, error: authError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      if (formType === 'signin') {
        await signIn({ email, password });
        navigate('/app');
      } else if (formType === 'signup') {
        if (password !== confirmPassword) {
          setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
          return;
        }
        await signUp({ email, password });
        // After signup, user proceeds to family creation/onboarding
        navigate('/onboarding');
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
      console.error('Auth error:', err);
    }
  };

  return (
    <div className="ft-auth-container">
      <div className="ft-auth-card">
        <div className="ft-auth-header">
          <h1>Medida's Family</h1>
          <p className="ft-auth-tagline">Generations. Stories. Memories.</p>
        </div>

        {statusMessage && (
          <div
            className={`ft-auth-status ft-auth-status--${statusMessage.type}`}
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.875rem',
              backgroundColor: statusMessage.type === 'success' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
              color: statusMessage.type === 'success' ? '#22c55e' : '#ef4444',
              border: `1px solid ${statusMessage.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ft-auth-form">
          {formType !== 'forgot-password' && (
            <>
              <div className="ft-auth-field">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="name@example.com"
                />
              </div>

              <div className="ft-auth-field">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                  placeholder="••••••••"
                />
              </div>

              {formType === 'signup' && (
                <div className="ft-auth-field">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength="6"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </>
          )}

          {formType === 'forgot-password' && (
            <div className="ft-auth-field">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="name@example.com"
              />
              <p className="ft-auth-help" style={{ marginTop: '8px', fontSize: '0.8rem', color: '#9ca3af' }}>
                Enter your registered email and we'll send a link to reset your password.
              </p>
            </div>
          )}

          <button
            type="submit"
            className="ft-auth-button"
            disabled={loading}
          >
            {loading ? 'Processing...' :
              formType === 'signin' ? 'Sign In' :
              formType === 'signup' ? 'Create Account' : 'Send Reset Link'
            }
          </button>

          {authError && !statusMessage && (
            <div className="ft-auth-error">
              {authError}
            </div>
          )}
        </form>

        <div className="ft-auth-footer">
          {formType === 'signin' && (
            <>
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFormType('signup');
                    setStatusMessage(null);
                  }}
                  className="ft-auth-link"
                >
                  Create Account
                </button>
              </p>
              <p>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('forgot-password');
                    setStatusMessage(null);
                  }}
                  className="ft-auth-link"
                >
                  Forgot Password?
                </button>
              </p>
            </>
          )}

          {formType !== 'signin' && (
            <p>
              <button
                type="button"
                onClick={() => {
                  setFormType('signin');
                  setStatusMessage(null);
                }}
                className="ft-auth-link"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="ft-auth-brand">
        <p>Private &amp; Secure • Your Family's Legacy</p>
      </div>
    </div>
  );
}