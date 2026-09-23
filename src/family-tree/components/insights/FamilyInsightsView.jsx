/**
 * FamilyInsightsView.jsx — Medida's Family (Milestone M4E)
 * 
 * Museum-quality, magazine-inspired Family Insights & Archive Health.
 * Single source of truth: FamilyStore via familyInsightsEngine.
 */

import React, { useMemo } from 'react';
import { analyzeFamily } from '../../insights/familyInsightsEngine.js';
import UserProfileMenu from '../UserProfileMenu.jsx';
import AnimatedCounter from '../rare-ui/AnimatedCounter.jsx';


export default function FamilyInsightsView({
  store,
  onNavigateToPerson,
  onNavigateToEvent,
  onNavigateToStory,
  onNavigateToPhoto,
  onNavigateToDocument,
  onNavigateToTree,
  onNavigateToTimeline,
  onNavigateToMemories,
  onNavigateToArchive,
  onOpenSearch,
  activeView = 'insights',
  onNavigateView,
  isLocalMode = false,
}) {
  // Memoized single-pass snapshot analysis
  const insights = useMemo(() => {
    return analyzeFamily({ store });
  }, [store]);

  const {
    overview,
    generationDistribution,
    branches,
    network,
    milestones,
    archiveComposition,
    topLocations,
    archiveHealth,
    completeness,
    coverage,
    recentActivity,
  } = insights;

  return (
    <div className="ft-insights-view" role="region" aria-label="Family Insights and Archive Health">
      {/* ── Editorial Header ───────────────────────────────────── */}
      <header className="ft-insights-header">
        <div className="ft-insights-header__content">
          <div className="ft-insights-header__top-row">
            <div className="ft-insights-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>ARCHIVE INTELLIGENCE</span>
            </div>

            <div className="ft-insights-header__actions">
              <button
                type="button"
                className="ft-insights-header__btn ft-insights-header__btn--search"
                onClick={onOpenSearch}
                title="Search Family Archive (⌘K)"
                aria-label="Open global search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search</span>
                <kbd>⌘K</kbd>
              </button>

              <UserProfileMenu
                activeView={activeView}
                onNavigateView={onNavigateView}
                isLocalMode={isLocalMode}
              />

              <button
                type="button"
                className="ft-insights-header__btn ft-insights-header__btn--close"
                onClick={onNavigateToTree}
                title="Return to Family Tree"
                aria-label="Return to interactive tree"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <h1 className="ft-insights-header__title">FAMILY INSIGHTS</h1>
          <p className="ft-insights-header__tagline">
            A closer look at the people, stories, places, and memories that make our family.
          </p>

          <div className="ft-insights-header__chronicle-tag">
            <span>Historical Scope:</span>
            <strong>{coverage.historySpanText}</strong>
            <span className="ft-insights-sep">•</span>
            <span>Generations:</span>
            <strong>{overview.totalGenerations}</strong>
          </div>
        </div>
      </header>

      {/* ── Main Insights Body ──────────────────────────────────── */}
      <main className="ft-insights-main">
        {/* SECTION 1: KEY OVERVIEW METRICS */}
        <section className="ft-insights-section" aria-label="Archive Metrics Overview">
          <div className="ft-insights-metrics-grid">
            <div
              className="ft-insights-metric-card"
              onClick={onNavigateToTree}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateToTree && onNavigateToTree()}
            >
              <span className="ft-insights-metric-card__num">
                <AnimatedCounter value={overview.totalPeople} />
              </span>
              <span className="ft-insights-metric-card__label">Family Members</span>
              <span className="ft-insights-metric-card__sub">{overview.livingMembers} living · {overview.deceasedMembers} ancestral</span>
            </div>

            <div
              className="ft-insights-metric-card"
              onClick={onNavigateToArchive}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateToArchive && onNavigateToArchive()}
            >
              <span className="ft-insights-metric-card__num">
                <AnimatedCounter value={overview.photoCount} />
              </span>
              <span className="ft-insights-metric-card__label">Photographs</span>
              <span className="ft-insights-metric-card__sub">{coverage.photoCoveragePercent}% of family pictured</span>
            </div>

            <div
              className="ft-insights-metric-card"
              onClick={onNavigateToMemories}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateToMemories && onNavigateToMemories()}
            >
              <span className="ft-insights-metric-card__num">
                <AnimatedCounter value={overview.storyCount} />
              </span>
              <span className="ft-insights-metric-card__label">Oral Stories</span>
              <span className="ft-insights-metric-card__sub">{coverage.storyCoveragePercent}% members documented</span>
            </div>

            <div
              className="ft-insights-metric-card"
              onClick={onNavigateToTimeline}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateToTimeline && onNavigateToTimeline()}
            >
              <span className="ft-insights-metric-card__num">
                <AnimatedCounter value={overview.eventCount} />
              </span>
              <span className="ft-insights-metric-card__label">Life Milestones</span>
              <span className="ft-insights-metric-card__sub">{coverage.eventCoveragePercent}% members recorded</span>
            </div>

            <div
              className="ft-insights-metric-card"
              onClick={onNavigateToArchive}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateToArchive && onNavigateToArchive()}
            >
              <span className="ft-insights-metric-card__num">
                <AnimatedCounter value={overview.documentCount} />
              </span>
              <span className="ft-insights-metric-card__label">Archival Documents</span>
              <span className="ft-insights-metric-card__sub">{coverage.documentTypes.length} categories verified</span>
            </div>

            <div className="ft-insights-metric-card ft-insights-metric-card--highlight">
              <span className="ft-insights-metric-card__num">
                <AnimatedCounter value={completeness.averageCompleteness} suffix="%" />
              </span>
              <span className="ft-insights-metric-card__label">Archive Completeness</span>
              <span className="ft-insights-metric-card__sub">Deterministic profile health</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: COMPLETE THE FAMILY STORY (ARCHIVE HEALTH) */}
        <section className="ft-insights-section" aria-label="Complete the Family Story">
          <div className="ft-insights-section__header">
            <div>
              <h2 className="ft-insights-section__title">Complete the Family Story</h2>
              <p className="ft-insights-section__sub">
                Gentle suggestions to fill in missing details and preserve complete records across generations.
              </p>
            </div>
          </div>

          <div className="ft-insights-health-grid">
            {archiveHealth.items.map((item) => (
              <div key={item.id} className="ft-insights-health-card">
                <div className="ft-insights-health-card__badge">
                  <span>{item.count}</span> {item.count === 1 ? 'item' : 'items'}
                </div>
                <h3 className="ft-insights-health-card__title">{item.title}</h3>
                <p className="ft-insights-health-card__desc">{item.description}</p>
                <div className="ft-insights-health-card__items">
                  {item.items.slice(0, 4).map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      className="ft-insights-chip"
                      onClick={() => {
                        if (item.type === 'person') {
                          onNavigateToPerson && onNavigateToPerson(record.id);
                        } else if (item.type === 'story') {
                          onNavigateToStory && onNavigateToStory(record);
                        } else if (item.type === 'photo') {
                          onNavigateToPhoto && onNavigateToPhoto(record);
                        }
                      }}
                      title={`Inspect ${record.displayName || record.title || record.name}`}
                    >
                      <span>{record.displayName || record.title || record.name}</span>
                    </button>
                  ))}
                  {item.items.length > 4 && (
                    <span className="ft-insights-health-card__more">+{item.items.length - 4} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: GENERATIONAL DYNAMICS & FAMILY BRANCHES */}
        <div className="ft-insights-two-col">
          {/* Generation Breakdown */}
          <section className="ft-insights-section" aria-label="Generational Distribution">
            <div className="ft-insights-section__header">
              <div>
                 <h2 className="ft-insights-section__title">Generations of the family</h2>
                <p className="ft-insights-section__sub">Family distribution across {overview.totalGenerations} generational tiers</p>
              </div>
            </div>

            <div className="ft-insights-gens-list">
              {generationDistribution.map((gen) => (
                <div key={gen.generationIndex} className="ft-insights-gen-row">
                  <div className="ft-insights-gen-row__meta">
                    <span className="ft-insights-gen-row__label">{gen.label}</span>
                    <span className="ft-insights-gen-row__count">{gen.count} {gen.count === 1 ? 'member' : 'members'}</span>
                  </div>
                  <div className="ft-insights-gen-row__members">
                    {gen.people.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="ft-insights-person-pill"
                        onClick={() => onNavigateToPerson && onNavigateToPerson(p.id)}
                        title={`View ${p.displayName} in Tree`}
                      >
                        <span className="ft-insights-person-pill__initial">
                          {p.firstName ? p.firstName[0].toUpperCase() : 'P'}
                        </span>
                        <span>{p.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Family Branches */}
          <section className="ft-insights-section" aria-label="Family Branches">
            <div className="ft-insights-section__header">
              <div>
                <h2 className="ft-insights-section__title">Lineage Branches</h2>
                <p className="ft-insights-section__sub">Lineages branching through subsequent generations</p>
              </div>
            </div>

            <div className="ft-insights-branches-grid">
              {branches.map((b) => (
                <div key={b.id} className="ft-insights-branch-card">
                  <div className="ft-insights-branch-card__header">
                    <h3 className="ft-insights-branch-card__title">{b.name}</h3>
                    <span className="ft-insights-branch-card__span">{b.generationSpan}</span>
                  </div>
                  <p className="ft-insights-branch-card__count">
                    <strong>{b.memberCount}</strong> family members
                  </p>
                  <div className="ft-insights-branch-card__preview">
                    {b.members.slice(0, 4).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="ft-insights-chip"
                        onClick={() => onNavigateToPerson && onNavigateToPerson(m.id)}
                      >
                        {m.displayName}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="ft-insights-btn ft-insights-btn--ghost"
                    onClick={() => onNavigateToPerson && onNavigateToPerson(b.rootPerson.id)}
                  >
                    Explore Branch in Tree →
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* SECTION 4: ARCHIVE BALANCE & MILESTONES */}
        <div className="ft-insights-two-col">
          {/* Archive Balance */}
          <section className="ft-insights-section" aria-label="Archive Composition">
            <div className="ft-insights-section__header">
              <div>
                <h2 className="ft-insights-section__title">Archive Balance</h2>
                <p className="ft-insights-section__sub">Proportional breakdown of preserved media</p>
              </div>
            </div>

            <div className="ft-insights-composition-card">
              <div className="ft-insights-composition-bar" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="ft-insights-composition-segment ft-insights-composition-segment--photos"
                  style={{ width: `${archiveComposition.photos.percentage}%` }}
                  title={`Photographs: ${archiveComposition.photos.count}`}
                />
                <div
                  className="ft-insights-composition-segment ft-insights-composition-segment--stories"
                  style={{ width: `${archiveComposition.stories.percentage}%` }}
                  title={`Stories: ${archiveComposition.stories.count}`}
                />
                <div
                  className="ft-insights-composition-segment ft-insights-composition-segment--events"
                  style={{ width: `${archiveComposition.events.percentage}%` }}
                  title={`Life Events: ${archiveComposition.events.count}`}
                />
                <div
                  className="ft-insights-composition-segment ft-insights-composition-segment--docs"
                  style={{ width: `${archiveComposition.documents.percentage}%` }}
                  title={`Documents: ${archiveComposition.documents.count}`}
                />
              </div>

              <div className="ft-insights-composition-legend">
                <div className="ft-insights-legend-item" onClick={onNavigateToArchive} role="button" tabIndex={0}>
                  <span className="ft-insights-legend-dot ft-insights-legend-dot--photos" />
                  <span>Photos: <strong>{archiveComposition.photos.count}</strong> ({archiveComposition.photos.percentage}%)</span>
                </div>
                <div className="ft-insights-legend-item" onClick={onNavigateToMemories} role="button" tabIndex={0}>
                  <span className="ft-insights-legend-dot ft-insights-legend-dot--stories" />
                  <span>Stories: <strong>{archiveComposition.stories.count}</strong> ({archiveComposition.stories.percentage}%)</span>
                </div>
                <div className="ft-insights-legend-item" onClick={onNavigateToTimeline} role="button" tabIndex={0}>
                  <span className="ft-insights-legend-dot ft-insights-legend-dot--events" />
                  <span>Events: <strong>{archiveComposition.events.count}</strong> ({archiveComposition.events.percentage}%)</span>
                </div>
                <div className="ft-insights-legend-item" onClick={onNavigateToArchive} role="button" tabIndex={0}>
                  <span className="ft-insights-legend-dot ft-insights-legend-dot--docs" />
                  <span>Documents: <strong>{archiveComposition.documents.count}</strong> ({archiveComposition.documents.percentage}%)</span>
                </div>
              </div>

              <div className="ft-insights-network-summary">
                <span>Family Relationship Density: <strong>{network.densityRatio}</strong></span>
                <span className="ft-insights-sep">•</span>
                <span>Direct Connections: <strong>{network.totalRelationships}</strong> ({network.parentChildCount} parent-child, {network.spouseCount} marriages)</span>
              </div>
            </div>
          </section>

          {/* Historical Milestones */}
          <section className="ft-insights-section" aria-label="Historical Milestones">
            <div className="ft-insights-section__header">
              <div>
                <h2 className="ft-insights-section__title">Historic Milestones</h2>
                <p className="ft-insights-section__sub">Key events that shaped our family history</p>
              </div>
              <button type="button" className="ft-insights-link-btn" onClick={onNavigateToTimeline}>
                View Timeline →
              </button>
            </div>

            <div className="ft-insights-milestones-list">
              {milestones.notableMilestones.map((m) => (
                <div
                  key={m.id}
                  className="ft-insights-milestone-item"
                  onClick={() => onNavigateToEvent && onNavigateToEvent(m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateToEvent && onNavigateToEvent(m.id)}
                >
                  <span className="ft-insights-milestone-year">{m.date ? m.date.split('-')[0] : '—'}</span>
                  <div className="ft-insights-milestone-body">
                    <h4 className="ft-insights-milestone-title">{m.title}</h4>
                    <p className="ft-insights-milestone-desc">{m.location || m.description}</p>
                  </div>
                  <span className="ft-insights-milestone-type">{m.type}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* SECTION 5: GEOGRAPHIC FOOTPRINT */}
        <section className="ft-insights-section" aria-label="Geographic Footprint">
          <div className="ft-insights-section__header">
            <div>
              <h2 className="ft-insights-section__title">Geographic Footprint</h2>
              <p className="ft-insights-section__sub">
                Origins, homesteads, and global journeys connected to Medida family members.
              </p>
            </div>
          </div>

          <div className="ft-insights-locations-grid">
            {topLocations.map((loc) => (
              <div key={loc.city} className="ft-insights-location-card">
                <div className="ft-insights-location-card__header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <h3 className="ft-insights-location-card__city">{loc.city}</h3>
                </div>
                <p className="ft-insights-location-card__count">
                  <strong>{loc.count}</strong> {loc.count === 1 ? 'record' : 'records'} associated
                </p>
                <div className="ft-insights-location-card__people">
                  {loc.people.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="ft-insights-chip"
                      onClick={() => onNavigateToPerson && onNavigateToPerson(p.id)}
                    >
                      {p.displayName}
                    </button>
                  ))}
                  {loc.people.length > 3 && (
                    <span className="ft-insights-health-card__more">+{loc.people.length - 3}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6: RECENT ADDITIONS TO THE ARCHIVE */}
        <section className="ft-insights-section" aria-label="Recent Chronicles">
          <div className="ft-insights-section__header">
            <div>
              <h2 className="ft-insights-section__title">Recent Chronicles</h2>
              <p className="ft-insights-section__sub">
                Latest memories, photographs, and milestone records added to our private archive.
              </p>
            </div>
          </div>

          <div className="ft-insights-recent-grid">
            {recentActivity.map((act) => (
              <div
                key={`${act.type}-${act.id}`}
                className="ft-insights-recent-card"
                onClick={() => {
                  if (act.type === 'story' && onNavigateToStory) onNavigateToStory(act);
                  else if (act.type === 'photo' && onNavigateToPhoto) onNavigateToPhoto(act);
                  else if (act.type === 'document' && onNavigateToDocument) onNavigateToDocument(act);
                  else if (act.type === 'event' && onNavigateToEvent) onNavigateToEvent(act.id);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="ft-insights-recent-card__top">
                  <span className={`ft-insights-badge ft-insights-badge--${act.type}`}>
                    {act.type.toUpperCase()}
                  </span>
                  {act.timestamp && (
                    <span className="ft-insights-recent-card__date">
                      {act.timestamp.includes('-') ? act.timestamp.split('-')[0] : act.timestamp}
                    </span>
                  )}
                </div>
                <h4 className="ft-insights-recent-card__title">{act.title}</h4>
                {act.person && (
                  <p className="ft-insights-recent-card__person">
                    Associated with <strong>{act.person.displayName}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
