import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import FamilyTreeApp from './family-tree/components/FamilyTreeApp.jsx';
import LandingPage from './family-tree/components/landing/LandingPage.jsx';
import SignInPage from './family-tree/components/auth/SignInPage.jsx';
import SignUpPage from './family-tree/components/auth/SignUpPage.jsx';
import CreateFamilyPage from './family-tree/components/auth/CreateFamilyPage.jsx';
import FamilySelectorView from './family-tree/components/auth/FamilySelectorView.jsx';
import OnboardingFlow from './family-tree/components/auth/OnboardingFlow.jsx';
import ResetPasswordPage from './family-tree/components/auth/ResetPasswordPage.jsx';
import AcceptInvitationPage from './family-tree/components/auth/AcceptInvitationPage.jsx';
import { useAuth } from './family-tree/hooks/useAuth.js';
import { FamilyProvider, useFamily } from './family-tree/auth/FamilyContext.jsx';
import { isSupabaseConfigured } from './family-tree/lib/supabaseClient.js';
import familyStore from './family-tree/store/FamilyStore.js';
import { LocalAdapter } from './family-tree/store/repository/LocalAdapter.js';
import './family-tree/familyTree.css';

/**
 * Loading Spinner Helper
 */
function LoadingScreen() {
  return (
    <div
      className="ft-app ft-app--loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0c',
        color: '#e5e7eb',
      }}
    >
      <div className="ft-loading-container" style={{ textAlign: 'center' }}>
        <div
          className="ft-loading-spinner"
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#f97316',
            borderRadius: '50%',
            animation: 'ft-spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p className="ft-loading-text" style={{ fontSize: '0.9rem', color: '#9ca3af', letterSpacing: '0.05em' }}>
          Loading family archive...
        </p>
      </div>
    </div>
  );
}

/**
 * /app Gateway Route:
 * - 0 families: -> /create-family
 * - 1 family: -> /app/family/:familyId
 * - 2+ families: -> FamilySelectorView
 */
function AppGatewayRoute() {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: familyLoading } = useFamily();

  if (authLoading || familyLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!memberships || memberships.length === 0) {
    return <Navigate to="/create-family" replace />;
  }

  if (memberships.length === 1) {
    return <Navigate to={`/app/family/${memberships[0].familyId}`} replace />;
  }

  return <FamilySelectorView />;
}

/**
 * Protected Family Route:
 * Authoritative security check for /app/family/:familyId/*
 * Verifies that the authenticated user belongs to the requested family.
 * Uses wildcard route to preserve FamilyTreeApp instance across view navigation.
 * If unauthorized, renders an explicit Access Denied boundary.
 */
function ProtectedFamilyRoute() {
  const { familyId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { memberships, activeFamily, switchFamily, loading: familyLoading } = useFamily();

  useEffect(() => {
    if (familyId && activeFamily?.id !== familyId) {
      const match = (memberships || []).find((m) => m.familyId === familyId);
      if (match) {
        switchFamily(familyId);
      }
    }
  }, [familyId, activeFamily?.id, memberships, switchFamily]);

  if (authLoading || familyLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Authoritative Membership Verification
  const verifiedMembership = (memberships || []).find((m) => m.familyId === familyId);

  if (!verifiedMembership) {
    return (
      <div className="ft-auth-container" style={{ minHeight: '100vh', padding: '40px 20px' }}>
        <div className="ft-auth-card" style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '8px' }}>
            Access Denied
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '24px' }}>
            You do not have permission or verified membership to access this family archive.
          </p>
          <Link
            to="/app"
            className="ft-form-btn ft-form-btn--primary"
            style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none' }}
          >
            Return to My Families
          </Link>
        </div>
      </div>
    );
  }

  // FamilyTreeApp derives viewMode from URL, no need for initialView prop
  return <FamilyTreeApp activeFamily={verifiedMembership.family} />;
}

/**
 * Route wrapper for Create Family / Onboarding: Requires authentication
 */
function ProtectedCreateFamilyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <CreateFamilyPage />;
}

/**
 * Public Authentication Route: Redirects to /app if already logged in
 */
function PublicAuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return children;
}

export default function App() {
  // ── 1. Local Mode (Supabase not configured) ─────────────────
  // Preserves 100% backward compatibility with M1/M2 functionality
  if (!isSupabaseConfigured) {
    // Ensure LocalAdapter is set
    if (!(familyStore.repository instanceof LocalAdapter)) {
      familyStore.setRepository(new LocalAdapter());
    }

    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="/create-family" element={<CreateFamilyPage />} />
          <Route path="/app/create-family" element={<CreateFamilyPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />
          <Route path="/invite" element={<AcceptInvitationPage />} />

          {/* Local tree canvas routes */}
          <Route path="/app" element={<FamilyTreeApp isLocalMode={true} />} />
          <Route path="/app/timeline" element={<FamilyTreeApp isLocalMode={true} initialView="timeline" />} />
          <Route path="/app/memories" element={<FamilyTreeApp isLocalMode={true} initialView="memories" />} />
          <Route path="/app/memories/:storyId" element={<FamilyTreeApp isLocalMode={true} initialView="memories" />} />
          <Route path="/app/archive" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/archive/photo/:photoId" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/archive/document/:docId" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/insights" element={<FamilyTreeApp isLocalMode={true} initialView="insights" />} />

          {/* Local familyId parameterized routes */}
          <Route path="/app/family/:familyId" element={<FamilyTreeApp isLocalMode={true} />} />
          <Route path="/app/family/:familyId/timeline" element={<FamilyTreeApp isLocalMode={true} initialView="timeline" />} />
          <Route path="/app/family/:familyId/memories" element={<FamilyTreeApp isLocalMode={true} initialView="memories" />} />
          <Route path="/app/family/:familyId/memories/:storyId" element={<FamilyTreeApp isLocalMode={true} initialView="memories" />} />
          <Route path="/app/family/:familyId/archive" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/family/:familyId/archive/photo/:photoId" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/family/:familyId/archive/document/:docId" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/family/:familyId/insights" element={<FamilyTreeApp isLocalMode={true} initialView="insights" />} />

          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // ── 2. Cloud Mode (Supabase configured) ─────────────────────
  return (
    <BrowserRouter>
      <FamilyProvider>
        <Routes>
          {/* Public Landing Page at '/' */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/tree" element={<FamilyTreeApp isLocalMode={true} />} />

          {/* Authentication Routes */}
          <Route
            path="/signin"
            element={
              <PublicAuthRoute>
                <SignInPage />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicAuthRoute>
                <SignUpPage />
              </PublicAuthRoute>
            }
          />

          {/* Family Creation / Onboarding */}
          <Route path="/create-family" element={<ProtectedCreateFamilyRoute />} />
          <Route path="/app/create-family" element={<ProtectedCreateFamilyRoute />} />
          <Route path="/onboarding" element={<ProtectedCreateFamilyRoute />} />

          {/* Password Reset & Invitations */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />
          <Route path="/invite" element={<AcceptInvitationPage />} />

          {/* /app Gateway (0 -> create, 1 -> family canvas, 2+ -> selector) */}
          <Route path="/app" element={<AppGatewayRoute />} />

          {/* /app/family/:familyId/* Secure Family Routes */}
          {/* Single wildcard route preserves FamilyTreeApp instance across view navigation */}
          <Route path="/app/family/:familyId/*" element={<ProtectedFamilyRoute />} />

          {/* Backward compatibility for legacy /app sub-routes */}
          <Route path="/app/timeline" element={<AppGatewayRoute />} />
          <Route path="/app/memories" element={<AppGatewayRoute />} />
          <Route path="/app/archive" element={<AppGatewayRoute />} />
          <Route path="/app/insights" element={<AppGatewayRoute />} />

          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </FamilyProvider>
    </BrowserRouter>
  );
}