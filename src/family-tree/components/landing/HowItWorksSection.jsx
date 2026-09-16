import React from 'react';
import ScrollReveal from '../react-bits/ScrollReveal.jsx';

/**
 * HowItWorksSection
 * Three steps that progress downward as the user scrolls.
 */

const STEPS = [
  {
    num: '01',
    title: 'Create your family',
    desc: 'Give your family tree a name and start with an empty canvas. Every family begins completely blank — yours to shape.',
  },
  {
    num: '02',
    title: 'Add your people',
    desc: 'Add relatives, relationships, stories, events and memories. The tree grows with you, one person at a time.',
  },
  {
    num: '03',
    title: 'Preserve your story',
    desc: 'Keep discovering, adding and preserving your family\u2019s history — and invite relatives to build it with you.',
  },
];

export default function HowItWorksSection({ isReducedMotion = false }) {
  return (
    <section className="fl-how" id="how-it-works" aria-labelledby="fl-how-title">
      <div className="fl-container">
        <ScrollReveal duration={500} distance={16} isReducedMotion={isReducedMotion}>
          <div className="fl-section-head fl-section-head--center">
            <span className="fl-eyebrow">How it works</span>
            <h2 className="fl-section-title" id="fl-how-title">
              Your history, in three gentle steps
            </h2>
            <p className="fl-section-sub">
              No imports to wrangle, no templates to fill. Start small — the story writes itself
              from here.
            </p>
          </div>
        </ScrollReveal>

        <div className="fl-how__list">
          {STEPS.map((step, i) => (
            <ScrollReveal
              key={step.num}
              duration={520}
              distance={24}
              threshold={0.3}
              isReducedMotion={isReducedMotion}
              style={{ transitionDelay: isReducedMotion ? undefined : `${i * 110}ms` }}
            >
              <div className="fl-how__step">
                <span className="fl-how__num" aria-hidden="true">
                  {step.num}
                </span>
                <div>
                  <h3 className="fl-how__step-title">{step.title}</h3>
                  <p className="fl-how__step-desc">{step.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
