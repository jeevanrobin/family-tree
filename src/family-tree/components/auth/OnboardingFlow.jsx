import React from 'react';
import CreateFamilyPage from './CreateFamilyPage.jsx';

/**
 * Onboarding Flow — Backward Compatibility Wrapper
 * Forwards directly to CreateFamilyPage.
 */
export default function OnboardingFlow() {
  return <CreateFamilyPage />;
}