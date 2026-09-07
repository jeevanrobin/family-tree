import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
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
    <div className="ft-auth-container">
      <div className="ft-auth-card">
        <div className="ft-auth-header">
          <h1>Set New Password</h1>
          <p className="ft-auth-tagline">Medida's Family Archive</p>
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

        <form onSubmit={handleReset} className="ft-auth-form">
          <div className="ft-auth-field">
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              autoFocus
              placeholder="At least 6 characters"
            />
          </div>

          <div className="ft-auth-field">
            <label htmlFor="confirm-new-password">Confirm New Password</label>
            <input
              type="password"
              id="confirm-new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
              placeholder="Repeat your new password"
            />
          </div>

          <button
            type="submit"
            className="ft-auth-button"
            disabled={loading}
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="ft-auth-footer">
          <p>
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="ft-auth-link"
            >
              Back to Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
