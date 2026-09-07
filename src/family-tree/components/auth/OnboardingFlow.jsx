import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useFamily } from '../../auth/FamilyContext.jsx';
import { supabase } from '../../lib/supabaseClient.js';
import familyStore from '../../store/FamilyStore.js';
import { SupabaseAdapter } from '../../store/repository/SupabaseAdapter.js';
import { FAMILY_ID_KEY } from '../../store/repository/index.js';

/**
 * Onboarding Flow
 * Handles initial family creation after authentication.
 * Assigns creating user as 'owner' in family_memberships.
 */
export default function OnboardingFlow() {
  const [familyName, setFamilyName] = useState('');
  const [familyDescription, setFamilyDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { refreshMemberships } = useFamily();
  const navigate = useNavigate();

  const handleCreateFamily = async () => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    if (!familyName.trim()) {
      setError('Family name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Create family record with creator attribution
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          description: familyDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // 2. Authoritative: Create membership record linking user to family as OWNER
      const { error: membershipError } = await supabase
        .from('family_memberships')
        .insert({
          family_id: familyData.id,
          user_id: user.id,
          role: 'owner',
        });

      if (membershipError) throw membershipError;

      // 3. Set local selector
      localStorage.setItem(FAMILY_ID_KEY, familyData.id);

      // 4. Switch FamilyStore to use SupabaseAdapter for this verified family
      const supabaseAdapter = new SupabaseAdapter(familyData.id);
      familyStore.setRepository(supabaseAdapter);

      // 5. Refresh FamilyContext memberships
      if (refreshMemberships) {
        await refreshMemberships();
      }

      // 6. Navigate to main family tree canvas
      navigate('/app');
    } catch (err) {
      console.error('Family creation error:', err);
      setError(err.message || 'Failed to create family. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ft-onboarding-container">
      <div className="ft-onboarding-card">
        <div className="ft-onboarding-header">
          <h1>Welcome to Medida's Family</h1>
          <p className="ft-onboarding-tagline">Create your private family tree archive</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateFamily();
          }}
          className="ft-onboarding-form"
        >
          <div className="ft-onboarding-field">
            <label htmlFor="family-name">Family Name</label>
            <input
              type="text"
              id="family-name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              placeholder="e.g., Medida Family"
              autoFocus
            />
          </div>

          <div className="ft-onboarding-field">
            <label htmlFor="family-description">Family Description (Optional)</label>
            <textarea
              id="family-description"
              value={familyDescription}
              onChange={(e) => setFamilyDescription(e.target.value)}
              rows="3"
              placeholder="A brief dedication or background about your family lineage..."
            />
          </div>

          <button
            type="submit"
            className="ft-onboarding-button"
            disabled={loading || !familyName.trim()}
          >
            {loading ? 'Creating Family...' : 'Create Your Family'}
          </button>

          {error && (
            <div className="ft-onboarding-error" role="alert">
              {error}
            </div>
          )}
        </form>

        <div className="ft-onboarding-footer">
          <p>
            Your family archive is private, encrypted, and accessible only to invited members.
          </p>
        </div>
      </div>
    </div>
  );
}