/**
 * AcceptInvitationPage Component — Medida's Family (Milestone 3E)
 *
 * Secure invitation acceptance portal:
 * - Validates cryptographic token hash with server
 * - Displays family details, inviter identity, and assigned role
 * - Enforces authenticated recipient verification
 * - Executes atomic membership acceptance and routes to /app
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { collaborationService } from '../../auth/collaborationService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFamily } from '../../auth/FamilyContext.jsx';
import { ROLE_LABELS } from '../../auth/roles.js';

export default function AcceptInvitationPage() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const rawToken = routeToken || searchParams.get('token');

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  let familyContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    familyContext = useFamily();
  } catch {
    familyContext = null;
  }

  const [loading, setLoading] = useState(true);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      if (!rawToken) {
        setError('No invitation token provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const details = await collaborationService.getInvitationDetails(rawToken);

        if (!details || !details.valid) {
          setError(details?.error || 'This invitation is invalid or has expired.');
        } else {
          setInviteDetails(details);
        }
      } catch (err) {
        setError(err.message || 'Failed to verify invitation.');
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [rawToken]);

  const handleAccept = async () => {
    if (!rawToken) return;

    try {
      setAccepting(true);
      setError(null);

      const res = await collaborationService.acceptInvitation(rawToken);

      if (res.success) {
        setAcceptedSuccess(true);

        // Refresh verified memberships in context
        if (familyContext?.refreshMemberships) {
          await familyContext.refreshMemberships();
        }

        // Switch to the newly accepted family
        if (res.family_id && familyContext?.switchFamily) {
          familyContext.switchFamily(res.family_id);
        }

        setTimeout(() => {
          navigate('/app', { replace: true });
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const isEmailMismatch =
    user && inviteDetails?.email && user.email?.toLowerCase() !== inviteDetails.email.toLowerCase();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#e5e7eb',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
          textAlign: 'center',
        }}
      >
        {/* Brand Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.35)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#f97316',
          }}
        >
          Family Collaboration
        </span>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f3f4f6', margin: '8px 0 12px' }}>
          Family Tree Invitation
        </h1>

        {loading || authLoading ? (
          <div style={{ padding: '32px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#f97316',
                borderRadius: '50%',
                animation: 'ft-spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Verifying invitation token...</p>
          </div>
        ) : error ? (
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                color: '#f87171',
                fontSize: '0.875rem',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
            <Link
              to="/app"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.08)',
                color: '#e5e7eb',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Return to Family Tree
            </Link>
          </div>
        ) : acceptedSuccess ? (
          <div style={{ padding: '24px 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '2px solid #10b981',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '1.4rem',
              }}
            >
              ✓
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#34d399', marginBottom: '6px' }}>
              Welcome to the Family!
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              Invitation accepted. Opening your family archive...
            </p>
          </div>
        ) : inviteDetails ? (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.6 }}>
              You have been invited to collaborate on the family tree archive of:
            </p>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '16px',
                margin: '18px 0',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f3f4f6' }}>
                {inviteDetails.family_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px' }}>
                Invited as:{' '}
                <strong style={{ color: '#f97316' }}>
                  {ROLE_LABELS[inviteDetails.role] || inviteDetails.role}
                </strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                Recipient email: <code>{inviteDetails.email}</code>
              </div>
            </div>

            {!user ? (
              <div>
                <p style={{ fontSize: '0.825rem', color: '#9ca3af', marginBottom: '16px' }}>
                  Please sign in or create an account with <strong>{inviteDetails.email}</strong> to accept this invitation.
                </p>
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={() => navigate(`/signin?redirect=/invite/${rawToken}`)}
                >
                  Sign In to Accept
                </button>
              </div>
            ) : isEmailMismatch ? (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '0.825rem',
                  color: '#f87171',
                  textAlign: 'left',
                }}
              >
                ⚠️ You are currently signed in as <strong>{user.email}</strong>, but this invitation was sent to{' '}
                <strong>{inviteDetails.email}</strong>.
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="ft-form-btn ft-form-btn--secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    onClick={() => {
                      familyContext?.logout();
                      navigate(`/signin?redirect=/invite/${rawToken}`);
                    }}
                  >
                    Switch Account
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? 'Joining Family...' : 'Accept Invitation'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
