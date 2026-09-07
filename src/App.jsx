import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FamilyTreeApp from './family-tree/components/FamilyTreeApp.jsx';
import SignInPage from './family-tree/components/auth/SignInPage.jsx';
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
 * Protected Route Wrapper for Cloud Mode
 */
function ProtectedAppRoute() {
  const { user, loading: authLoading } = useAuth();
  const { memberships, activeFamily, loading: familyLoading } = useFamily();

  if (authLoading || familyLoading) {
    return (
      <div className="ft-app ft-app--loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0c', color: '#e5e7eb' }}>
        <div className="ft-loading-container" style={{ textAlign: 'center' }}>
          <div className="ft-loading-spinner" style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'ft-spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
          <p className="ft-loading-text" style={{ fontSize: '0.9rem', color: '#9ca3af', letterSpacing: '0.05em' }}>Loading family archive...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> go to sign in
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Authenticated but has zero family memberships -> proceed to onboarding
  if (!memberships || memberships.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  // Authenticated with verified active family -> render main canvas
  return <FamilyTreeApp activeFamily={activeFamily} />;
}

/**
 * Route wrapper for Onboarding: Requires authentication
 */
function ProtectedOnboardingRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <OnboardingFlow />;
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
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/onboarding" element={<OnboardingFlow />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invite/:token" element={<AcceptInvitationPage />} />
          <Route path="/invite" element={<AcceptInvitationPage />} />
          <Route path="/app" element={<FamilyTreeApp isLocalMode={true} />} />
          <Route path="/app/timeline" element={<FamilyTreeApp isLocalMode={true} initialView="timeline" />} />
          <Route path="/app/memories" element={<FamilyTreeApp isLocalMode={true} initialView="memories" />} />
          <Route path="/app/memories/:storyId" element={<FamilyTreeApp isLocalMode={true} initialView="memories" />} />
          <Route path="/app/archive" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/archive/photo/:photoId" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/archive/document/:docId" element={<FamilyTreeApp isLocalMode={true} initialView="archive" />} />
          <Route path="/app/insights" element={<FamilyTreeApp isLocalMode={true} initialView="insights" />} />
          <Route path="/" element={<Navigate replace to="/app" />} />
          <Route path="*" element={<Navigate replace to="/app" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // ── 2. Cloud Mode (Supabase configured) ─────────────────────
  return (
    <BrowserRouter>
      <FamilyProvider>
        <Routes>
          <Route
            path="/signin"
            element={
              <PublicAuthRoute>
                <SignInPage />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/onboarding"
            element={<ProtectedOnboardingRoute />}
          />
          <Route
            path="/reset-password"
            element={<ResetPasswordPage />}
          />
          <Route
            path="/invite/:token"
            element={<AcceptInvitationPage />}
          />
          <Route
            path="/invite"
            element={<AcceptInvitationPage />}
          />
          <Route
            path="/app"
            element={<ProtectedAppRoute />}
          />
          <Route
            path="/app/timeline"
            element={<ProtectedAppRoute />}
          />
          <Route
            path="/app/memories"
            element={<ProtectedAppRoute />}
          />
          <Route
            path="/app/memories/:storyId"
            element={<ProtectedAppRoute />}
          />
          <Route
            path="/app/archive"
            element={<ProtectedAppRoute />}
          />
          <Route
            path="/app/archive/photo/:photoId"
            element={<ProtectedAppRoute />}
          />
          <Route
            path="/app/archive/document/:docId"
            element={<ProtectedAppRoute />}
          />
          <Route
            path="/app/insights"
            element={<ProtectedAppRoute />}
          />
          <Route path="/" element={<Navigate replace to="/app" />} />
          <Route path="*" element={<Navigate replace to="/app" />} />
        </Routes>
      </FamilyProvider>
    </BrowserRouter>
  );
}