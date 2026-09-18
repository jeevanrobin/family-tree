import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useFamily } from '../../auth/FamilyContext.jsx';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import familyStore from '../../store/FamilyStore.js';
import { createRepository, FAMILY_ID_KEY } from '../../store/repository/index.js';
import AuthShell from './AuthShell.jsx';
import AuthInput from './AuthInput.jsx';
import ClickSpark from '../react-bits/ClickSpark.jsx';
import FadeContent from '../react-bits/FadeContent.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';

/**
 * CreateFamilyPage Component
 * Dedicated family creation screen for authenticated users.
 * Guarantees zero prefilled sample names, atomic owner assignment,
 * and completely empty initial tree state (0 people, 0 relationships).
 */
export default function CreateFamilyPage() {
  const [familyName, setFamilyName] = useState('');
  const [familyDescription, setFamilyDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const { refreshMemberships } = useFamily();
  const navigate = useNavigate();
  const isReducedMotion = useReducedMotion();

  const handleCreateFamily = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!user) {
      setError('You must be signed in to create a family.');
      return;
    }

    const trimmedName = familyName.trim();
    if (!trimmedName) {
      setError('Please enter a family name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isSupabaseConfigured && supabase) {
        // Atomic database-side creation derives identity and ownership from auth.uid().
        const { data: familyRows, error: familyError } = await supabase.rpc('create_family_with_owner', {
          family_name: trimmedName,
          family_description: familyDescription.trim() || null,
        });

        if (familyError) throw familyError;

        const familyData = Array.isArray(familyRows) ? familyRows[0] : familyRows;
        if (!familyData?.id) {
          throw new Error('Family creation did not return a family ID.');
        }

        // 2. Set local selector
        localStorage.setItem(FAMILY_ID_KEY, familyData.id);

        // 3. Configure FamilyStore with SyncAdapter for this verified family
        const adapter = createRepository(familyData.id);
        familyStore.setRepository(adapter);

        // 4. Ensure empty initial in-memory state (0 members, 0 relationships)
        familyStore.loadFromData([], [], [], [], [], []);

        // 5. Refresh FamilyContext memberships
        if (refreshMemberships) {
          await refreshMemberships();
        }

        // 6. Navigate directly to the new family tree
        navigate(`/app/family/${familyData.id}`);
      } else {
        // Local mode fallback
        const localId = `family-${Date.now()}`;
        localStorage.setItem(FAMILY_ID_KEY, localId);
        familyStore.loadFromData([], [], [], [], [], []);
        navigate(`/app/family/${localId}`);
      }
    } catch (err) {
      console.error('Failed to create family:', err);
      setError(err.message || 'Failed to create family tree. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="fa-card fa-create-card">
        <FadeContent duration={500} delay={90} distance={12} isReducedMotion={isReducedMotion}>
          <span className="fa-create-card__eyebrow">Your private family space</span>
          <h1 className="fa-card__title">Create your family space</h1>
          <p className="fa-card__sub">
            Give your family tree a name and start building your story together.
          </p>
        </FadeContent>

        {error && (
          <div className="fa-banner fa-banner--error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        <FadeContent duration={500} delay={170} distance={12} isReducedMotion={isReducedMotion}>
          <form onSubmit={handleCreateFamily} className="fa-form fa-create-form">
            <AuthInput
              id="family-name"
              label="Family Name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
              autoFocus
              disabled={loading}
              placeholder="Enter your family name"
              helpText="This name identifies your family tree."
            />

            <div className="fa-field">
              <label className="fa-field__label" htmlFor="family-description">
                Family Description <span className="fa-field__optional">(Optional)</span>
              </label>
              <textarea
                className="fa-input fa-textarea"
                id="family-description"
                name="family-description"
                value={familyDescription}
                onChange={(e) => setFamilyDescription(e.target.value)}
                rows="4"
                disabled={loading}
                placeholder="Tell your family a little about this family tree..."
              />
            </div>

            <ClickSpark
              sparkColor="var(--ft-accent)"
              sparkSize={6}
              sparkCount={6}
              className="fa-spark-wrap"
            >
              <button
                type="submit"
                className="fa-btn fa-btn--primary fa-btn--block"
                disabled={loading || !familyName.trim()}
              >
                {loading ? (
                  <>
                    <span className="fa-btn__spinner" aria-hidden="true" />
                    Creating Family…
                  </>
                ) : (
                  'Create Family'
                )}
              </button>
            </ClickSpark>
          </form>
        </FadeContent>

        <div className="fa-create-card__privacy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <p>Your family space is private and access is controlled by family membership.</p>
        </div>
      </div>
    </AuthShell>
  );
}
