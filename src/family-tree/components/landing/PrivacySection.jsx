import React from 'react';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';

/**
 * PrivacySection
 * Factual privacy & security story backed by the real architecture:
 * private family spaces, RLS isolation, role-based permissions,
 * invite-only membership and authenticated media storage.
 */

const POINTS = [
  {
    id: 'spaces',
    title: 'Private family spaces',
    desc: 'Every family lives in its own private space, isolated at the database level by Row-Level Security.',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: 'permissions',
    title: 'Family-based permissions',
    desc: 'Access is scoped to your family, with Owner, Editor, Contributor and Viewer roles for every member.',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'access',
    title: 'Invite-only membership',
    desc: 'Families are never publicly searchable. Relatives join only through an explicit invitation.',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  {
    id: 'media',
    title: 'Authenticated media storage',
    desc: 'Photos and documents sit behind authenticated, membership-checked storage policies — not public links.',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
];

// Demo members shown in the permissions visual (marketing content only)
const DEMO_MEMBERS = [
  { name: 'Padma Sharma', relation: 'Daughter of Vikram', initials: 'PS', color: '#E56515', role: 'Owner', roleClass: 'owner' },
  { name: 'Vikram Sharma', relation: 'Son of Ravi', initials: 'VS', color: '#8A9099', role: 'Editor', roleClass: 'editor' },
  { name: 'Anita Sharma', relation: 'Daughter of Ravi', initials: 'AS', color: '#C98467', role: 'Contributor', roleClass: 'editor' },
  { name: 'Arjun Sharma', relation: 'Son of Ravi', initials: 'ArS', color: '#7C858E', role: 'Viewer', roleClass: 'viewer' },
];

export default function PrivacySection({ isReducedMotion = false }) {
  return (
    <section className="fl-privacy" id="privacy" aria-labelledby="fl-privacy-title">
      <div className="fl-container">
        <div className="fl-privacy__grid">
          <div>
            <ScrollReveal duration={500} distance={16} isReducedMotion={isReducedMotion}>
              <span className="fl-eyebrow">Privacy</span>
              <h2 className="fl-section-title" id="fl-privacy-title">
                Your family history deserves privacy.
              </h2>
              <p className="fl-section-sub">
                A family archive holds the most personal records you own. That&rsquo;s why privacy
                isn&rsquo;t a setting here — it&rsquo;s the foundation.
              </p>
            </ScrollReveal>

            <div className="fl-privacy__points">
              {POINTS.map((point, i) => (
                <ScrollReveal
                  key={point.id}
                  duration={480}
                  distance={18}
                  isReducedMotion={isReducedMotion}
                  style={{ transitionDelay: isReducedMotion ? undefined : `${i * 90}ms` }}
                >
                  <div className="fl-privacy__point">
                    <span className="fl-privacy__point-icon">{point.icon}</span>
                    <div>
                      <h3 className="fl-privacy__point-title">{point.title}</h3>
                      <p className="fl-privacy__point-desc">{point.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          <ScrollReveal duration={550} distance={24} isReducedMotion={isReducedMotion}>
            <div
              className="fl-permissions"
              role="img"
              aria-label="Family member permissions preview showing an Owner, an Editor, a Contributor and a Viewer"
            >
              <div className="fl-permissions__bar">
                <div className="fl-app-window__dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="fl-permissions__title">Family Settings — Members</span>
              </div>
              <div className="fl-permissions__body">
                {DEMO_MEMBERS.map((member) => (
                  <div key={member.name} className="fl-member-row">
                    <span className="fl-member-row__avatar" style={{ background: member.color }} aria-hidden="true">
                      {member.initials}
                    </span>
                    <div>
                      <div className="fl-member-row__name">{member.name}</div>
                      <div className="fl-member-row__relation">{member.relation}</div>
                    </div>
                    <span className={`fl-member-row__role fl-role--${member.roleClass}`}>{member.role}</span>
                  </div>
                ))}
                <p className="fl-permissions__note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Only invited members can open this family.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
