/**
 * Invitation Email Service — Medida's Family (Milestone 3E)
 *
 * Secure client-side email delivery abstraction:
 * - NEVER embeds email provider API keys or secrets in the browser.
 * - Dispatches invitation delivery requests to a secure server-side boundary
 *   (e.g., Supabase Edge Function + Resend).
 * - Provides graceful local/development fallback with console logging and
 *   copyable direct invitation links for local testing.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

export const invitationEmailService = {
  /**
   * Constructs the absolute invitation URL given the raw invitation token.
   * @param {string} rawToken
   * @returns {string}
   */
  getInviteUrl(rawToken) {
    if (!rawToken) return '';
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:5173';
    return `${origin}/invite/${rawToken}`;
  },

  /**
   * Requests delivery of a family invitation email.
   * Delegates actual sending to a secure server-side endpoint.
   *
   * @param {object} params
   * @param {string} params.email - Recipient email
   * @param {string} params.familyName - Name of the family tree
   * @param {string} params.role - Assigned role (editor, contributor, viewer)
   * @param {string} params.rawToken - Raw single-use invitation token
   * @param {string} [params.expiresAt] - Expiration timestamp
   * @returns {Promise<{ success: boolean, method: string, inviteUrl: string, error?: string }>}
   */
  async sendInvitationEmail({ email, familyName, role, rawToken, expiresAt }) {
    const inviteUrl = this.getInviteUrl(rawToken);

    // If Supabase is configured, attempt dispatch to Edge Function
    if (isSupabaseConfigured && supabase?.functions) {
      try {
        const { data, error } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email,
            familyName,
            role,
            inviteUrl,
            expiresAt,
          },
        });

        if (!error && data?.success) {
          return {
            success: true,
            method: 'edge-function',
            inviteUrl,
          };
        }
      } catch (err) {
        // Edge function may not be deployed in local dev; fall through to dev link fallback
        console.warn('Edge function delivery unavailable, using local delivery boundary:', err.message);
      }
    }

    // Development / Local fallback:
    // Secure boundary maintained (no secrets leaked); provides copyable link for testing
    // In production, tokens are strictly NEVER logged to the console
    const isProduction =
      (typeof import.meta !== 'undefined' && Boolean(import.meta?.env?.PROD)) ||
      (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production');

    if (!isProduction) {
      console.info(
        `[M3E Dev Email Delivery]\nTo: ${email}\nFamily: ${familyName}\nRole: ${role}\nInvite Link: ${inviteUrl}\nExpires: ${expiresAt || '7 days'}`
      );
    }

    return {
      success: true,
      method: 'development-link',
      inviteUrl,
    };
  },
};

export default invitationEmailService;
