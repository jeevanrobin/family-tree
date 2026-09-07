/**
 * FamilySettingsModal Component — Medida's Family (Milestone 3E)
 *
 * Comprehensive family management & collaboration center:
 * - Family overview & metadata
 * - Verified member roster with real-time roles
 * - Role editing & member removal (Owner only)
 * - Atomic ownership transfer with explicit confirmation
 * - Family invitations management (+ Invite, Resend, Revoke)
 * - Copyable secure invitation link generator
 */

import React, { useState, useEffect, useCallback } from 'react';
import { collaborationService } from '../../auth/collaborationService.js';
import { ROLES, ROLE_LABELS, canManageMembers, canTransferOwnership } from '../../auth/roles.js';

export default function FamilySettingsModal({
  isOpen,
  onClose,
  family,
  currentRole,
  currentUser,
  onMembersUpdated,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members' | 'invitations'
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null); // { type: 'success'|'error', text: '' }

  // Invite Sub-Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.EDITOR);
  const [inviteDuration, setInviteDuration] = useState(7);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [lastCreatedInvite, setLastCreatedInvite] = useState(null);

  // Transfer Ownership Sub-Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Remove Member Sub-Modal State
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const isOwner = canManageMembers(currentRole);
  const canTransfer = canTransferOwnership(currentRole);

  // Fetch Members
  const loadMembers = useCallback(async () => {
    if (!family?.id) return;
    try {
      setLoadingMembers(true);
      const data = await collaborationService.getFamilyMembers(family.id);
      setMembers(data || []);
    } catch (err) {
      console.warn('Failed to fetch family members:', err.message);
    } finally {
      setLoadingMembers(false);
    }
  }, [family?.id]);

  // Fetch Invitations
  const loadInvitations = useCallback(async () => {
    if (!family?.id || !isOwner) return;
    try {
      setLoadingInvitations(true);
      const data = await collaborationService.getFamilyInvitations(family.id);
      setInvitations(data || []);
    } catch (err) {
      console.warn('Failed to fetch family invitations:', err.message);
    } finally {
      setLoadingInvitations(false);
    }
  }, [family?.id, isOwner]);

  useEffect(() => {
    if (isOpen && family?.id) {
      loadMembers();
      if (isOwner) loadInvitations();
    }
  }, [isOpen, family?.id, isOwner, loadMembers, loadInvitations]);

  if (!isOpen) return null;

  // Handle Invitation Creation
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviteSubmitting(true);
      setStatusBanner(null);

      const res = await collaborationService.createInvitation({
        familyId: family.id,
        email: inviteEmail.trim(),
        role: inviteRole,
        durationDays: Number(inviteDuration),
        familyName: family.name,
      });

      if (res.success) {
        setLastCreatedInvite(res);
        setInviteEmail('');
        setStatusBanner({
          type: 'success',
          text: `Invitation issued for ${res.invitation.email}!`,
        });
        loadInvitations();
      }
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text: err.message || 'Failed to issue invitation.',
      });
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Handle Invitation Revocation
  const handleRevokeInvite = async (inviteId) => {
    try {
      await collaborationService.revokeInvitation(inviteId, family.id);
      setStatusBanner({ type: 'success', text: 'Invitation revoked.' });
      loadInvitations();
    } catch (err) {
      setStatusBanner({ type: 'error', text: err.message || 'Failed to revoke invitation.' });
    }
  };

  // Handle Role Change
  const handleChangeRole = async (userId, newRole) => {
    try {
      await collaborationService.updateMemberRole(family.id, userId, newRole);
      setStatusBanner({ type: 'success', text: `Role updated to ${ROLE_LABELS[newRole]}.` });
      loadMembers();
      onMembersUpdated?.();
    } catch (err) {
      setStatusBanner({ type: 'error', text: err.message || 'Failed to update member role.' });
    }
  };

  // Handle Member Removal
  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      setRemoveSubmitting(true);
      await collaborationService.removeMember(family.id, removeTarget.user_id);
      setStatusBanner({ type: 'success', text: `Removed ${removeTarget.display_name || removeTarget.email}.` });
      setRemoveModalOpen(false);
      setRemoveTarget(null);
      loadMembers();
      onMembersUpdated?.();
    } catch (err) {
      setStatusBanner({ type: 'error', text: err.message || 'Failed to remove member.' });
    } finally {
      setRemoveSubmitting(false);
    }
  };

  // Handle Ownership Transfer
  const handleConfirmTransfer = async () => {
    if (!transferTarget) return;
    try {
      setTransferSubmitting(true);
      await collaborationService.transferOwnership(family.id, transferTarget.user_id);
      setStatusBanner({
        type: 'success',
        text: `Ownership transferred to ${transferTarget.display_name || transferTarget.email}.`,
      });
      setTransferModalOpen(false);
      setTransferTarget(null);
      loadMembers();
      onMembersUpdated?.();
    } catch (err) {
      setStatusBanner({ type: 'error', text: err.message || 'Failed to transfer ownership.' });
    } finally {
      setTransferSubmitting(false);
    }
  };

  return (
    <div className="ft-view-modal ft-view-modal--open" role="dialog" aria-modal="true">
      <div className="ft-view-modal__backdrop" onClick={onClose} />
      <div className="ft-view-modal__container" style={{ maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <header className="ft-view-modal__header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <div>
            <span className="ft-view-modal__eyebrow" style={{ color: '#f97316' }}>COLLABORATION &amp; ACCESS</span>
            <h2 className="ft-view-modal__title">{family?.name || 'Family'} Settings</h2>
            <p className="ft-view-modal__subtitle">Manage member permissions, invites, and family administration</p>
          </div>
          <button className="ft-view-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 28px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              color: activeTab === 'overview' ? '#f97316' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #f97316' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              color: activeTab === 'members' ? '#f97316' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === 'members' ? '2px solid #f97316' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Members ({members.length})
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'transparent',
                color: activeTab === 'invitations' ? '#f97316' : '#9ca3af',
                border: 'none',
                borderBottom: activeTab === 'invitations' ? '2px solid #f97316' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              Invitations ({invitations.filter((i) => i.status === 'pending').length})
            </button>
          )}
        </div>

        {/* Status Notification Banner */}
        {statusBanner && (
          <div
            style={{
              margin: '16px 28px 0',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.825rem',
              background: statusBanner.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: statusBanner.type === 'success' ? '#34d399' : '#f87171',
              border: `1px solid ${statusBanner.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{statusBanner.text}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '18px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Family Name</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f3f4f6', marginTop: '4px' }}>{family?.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Role</span>
                <div style={{ marginTop: '4px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: currentRole === 'owner' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: currentRole === 'owner' ? '#f97316' : '#d1d5db',
                      border: `1px solid ${currentRole === 'owner' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                    }}
                  >
                    {ROLE_LABELS[currentRole] || currentRole}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Members</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f3f4f6', marginTop: '4px' }}>{members.length} verified</div>
              </div>
            </div>

            {/* Role capabilities breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '8px' }}>Collaboration Capabilities</h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Owner:</strong> Full control, invite members, assign roles, and transfer ownership.</li>
                <li><strong>Editor:</strong> Add and modify people, relationships, stories, events, and cloud media.</li>
                <li><strong>Contributor:</strong> Contribute family stories, memories, life milestones, photos, and scanned records.</li>
                <li><strong>Viewer:</strong> Read-only access across the family tree and dossier.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Active members with verified access to this archive</span>
              {isOwner && (
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  onClick={() => {
                    setLastCreatedInvite(null);
                    setInviteModalOpen(true);
                  }}
                >
                  + Invite Member
                </button>
              )}
            </div>

            {loadingMembers ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Loading member roster...</div>
            ) : members.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>No members found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {members.map((m) => {
                  const isSelf = currentUser && m.user_id === currentUser.id;
                  const isTargetOwner = m.role === 'owner';

                  return (
                    <div
                      key={m.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: m.role === 'owner' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255,255,255,0.1)',
                            color: '#ffffff',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                          }}
                        >
                          {(m.display_name || m.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f3f4f6' }}>
                            {m.display_name} {isSelf && <span style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 400 }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{m.email}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Role selector / Badge */}
                        {isOwner && !isTargetOwner && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.user_id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(20,20,24,0.8)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '4px',
                              color: '#e5e7eb',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            <option value={ROLES.EDITOR}>Editor</option>
                            <option value={ROLES.CONTRIBUTOR}>Contributor</option>
                            <option value={ROLES.VIEWER}>Viewer</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              background: m.role === 'owner' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                              color: m.role === 'owner' ? '#f97316' : '#d1d5db',
                              border: `1px solid ${m.role === 'owner' ? 'rgba(249, 115, 22, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                            }}
                          >
                            {ROLE_LABELS[m.role] || m.role}
                          </span>
                        )}

                        {/* Owner actions: Transfer & Remove */}
                        {isOwner && !isTargetOwner && !isSelf && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {canTransfer && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferTarget(m);
                                  setTransferModalOpen(true);
                                }}
                                title="Transfer Ownership"
                                style={{
                                  padding: '4px 8px',
                                  background: 'transparent',
                                  border: '1px solid rgba(249, 115, 22, 0.3)',
                                  borderRadius: '4px',
                                  color: '#f97316',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Make Owner
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveTarget(m);
                                setRemoveModalOpen(true);
                              }}
                              title="Remove member"
                              style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '4px',
                                color: '#ef4444',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Invitations (Owner Only) */}
        {activeTab === 'invitations' && isOwner && (
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Pending invitations to collaborate on this family</span>
              <button
                type="button"
                className="ft-form-btn ft-form-btn--primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                onClick={() => {
                  setLastCreatedInvite(null);
                  setInviteModalOpen(true);
                }}
              >
                + Invite Member
              </button>
            </div>

            {loadingInvitations ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Loading invitations...</div>
            ) : invitations.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>No invitations issued yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {invitations.map((inv) => {
                  const isPending = inv.status === 'pending';
                  const expiresText = new Date(inv.expires_at).toLocaleDateString();

                  return (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f3f4f6' }}>{inv.email}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                          Role: <strong style={{ color: '#e5e7eb' }}>{ROLE_LABELS[inv.role] || inv.role}</strong> &middot; Expires: {expiresText}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.675rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background:
                              inv.status === 'pending'
                                ? 'rgba(249, 115, 22, 0.15)'
                                : inv.status === 'accepted'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(156, 163, 175, 0.15)',
                            color:
                              inv.status === 'pending'
                                ? '#f97316'
                                : inv.status === 'accepted'
                                ? '#34d399'
                                : '#9ca3af',
                          }}
                        >
                          {inv.status}
                        </span>

                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            style={{
                              padding: '4px 8px',
                              background: 'transparent',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '4px',
                              color: '#ef4444',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sub-Modal: Create Invitation */}
        {inviteModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#121216',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                padding: '24px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6', marginBottom: '8px' }}>
                Invite Family Member
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '16px' }}>
                Send a secure single-use invitation to collaborate on <strong>{family?.name}</strong>.
              </p>

              {lastCreatedInvite ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      padding: '12px',
                      color: '#34d399',
                      fontSize: '0.825rem',
                    }}
                  >
                    ✓ Invitation created successfully!
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                      Direct Invitation Link
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        readOnly
                        value={lastCreatedInvite.inviteUrl}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '4px',
                          color: '#e5e7eb',
                          fontSize: '0.75rem',
                        }}
                      />
                      <button
                        type="button"
                        className="ft-form-btn ft-form-btn--primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        onClick={() => {
                          navigator.clipboard?.writeText(lastCreatedInvite.inviteUrl);
                          alert('Invitation link copied to clipboard!');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="ft-form-btn ft-form-btn--secondary"
                      onClick={() => setInviteModalOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. cousin.ananya@gmail.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        color: '#f3f4f6',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                      Role Assignment
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1a1a20',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        color: '#f3f4f6',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value={ROLES.EDITOR}>Editor — Can add &amp; edit people, relationships &amp; records</option>
                      <option value={ROLES.CONTRIBUTOR}>Contributor — Can add stories, memories &amp; photos</option>
                      <option value={ROLES.VIEWER}>Viewer — Read-only access across the archive</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                      Invitation Expiry
                    </label>
                    <select
                      value={inviteDuration}
                      onChange={(e) => setInviteDuration(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1a1a20',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        color: '#f3f4f6',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value={7}>7 Days</option>
                      <option value={14}>14 Days</option>
                      <option value={30}>30 Days</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="ft-form-btn ft-form-btn--secondary"
                      onClick={() => setInviteModalOpen(false)}
                      disabled={inviteSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="ft-form-btn ft-form-btn--primary"
                      disabled={inviteSubmitting || !inviteEmail.trim()}
                    >
                      {inviteSubmitting ? 'Sending...' : 'Issue Invitation'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Sub-Modal: Transfer Ownership Confirmation */}
        {transferModalOpen && transferTarget && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#121216',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                borderRadius: '10px',
                padding: '24px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f97316', marginBottom: '8px' }}>
                Transfer Family Ownership
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#d1d5db', lineHeight: 1.5, marginBottom: '16px' }}>
                Are you sure you want to transfer ownership of <strong>{family?.name}</strong> to{' '}
                <strong>{transferTarget.display_name || transferTarget.email}</strong>?
              </p>
              <div
                style={{
                  background: 'rgba(249, 115, 22, 0.08)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.78rem',
                  color: '#fdba74',
                  marginBottom: '16px',
                }}
              >
                ⚠️ <strong>This action cannot be undone.</strong> You will automatically become an <strong>Editor</strong> and will surrender full administrative control.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--secondary"
                  onClick={() => setTransferModalOpen(false)}
                  disabled={transferSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ background: '#ea580c', borderColor: '#ea580c' }}
                  onClick={handleConfirmTransfer}
                  disabled={transferSubmitting}
                >
                  {transferSubmitting ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Modal: Remove Member Confirmation */}
        {removeModalOpen && removeTarget && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#121216',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                padding: '24px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>
                Remove Family Member
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#d1d5db', lineHeight: 1.5, marginBottom: '16px' }}>
                Are you sure you want to remove <strong>{removeTarget.display_name || removeTarget.email}</strong> from this family? They will immediately lose access to the private records and media.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--secondary"
                  onClick={() => setRemoveModalOpen(false)}
                  disabled={removeSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ft-form-btn ft-form-btn--primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  onClick={handleConfirmRemove}
                  disabled={removeSubmitting}
                >
                  {removeSubmitting ? 'Removing...' : 'Remove Member'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
