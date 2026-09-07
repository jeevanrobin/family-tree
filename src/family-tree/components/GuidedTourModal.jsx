/**
 * GuidedTourModal Component — Explore Family Mode
 * Cinematic guided journey stepping through Generation I → II → III → IV.
 * Features Play/Pause, Next/Previous, generation highlights, and ancestor spotlights.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GENERATION_CONFIG, getAllPersons } from '../data/familyDataService.js';
import FadeContent from './react-bits/FadeContent.jsx';

const TOUR_STEPS = [
  {
    step: 0,
    gen: 0,
    title: 'Generation I — The Ancestral Foundation',
    era: '1918 – 2005',
    headline: 'Agricultural Stewardship & Community Leadership',
    narrative: 'Ramaiah Medida and Saraswathi Medida, alongside Narasimha Reddy and Lakshmi Reddy, established the foundations of the family legacy in Warangal and Nalgonda.',
    featuredPersonId: 'gg-ramaiah',
    featuredPersonName: 'Ramaiah Medida',
    featuredRole: 'Village Elder & Agronomist',
  },
  {
    step: 1,
    gen: 1,
    title: 'Generation II — Post-Independence Expansion',
    era: '1945 – Present',
    headline: 'Infrastructure, Academia & Master Textiles',
    narrative: 'Venkat Ramaiah Medida graduated from Osmania Engineering, designing major irrigation dams, while Padma Medida led collegiate education and Srinivas Kumar expanded textile trade.',
    featuredPersonId: 'g-venkat',
    featuredPersonName: 'Venkat Ramaiah Medida',
    featuredRole: 'Civil Infrastructure Engineer',
  },
  {
    step: 2,
    gen: 2,
    title: 'Generation III — Modern Innovation & Medicine',
    era: '1972 – Present',
    headline: 'Quantum Physics, Pediatric Medicine & Cloud Technology',
    narrative: 'Suresh, Rajesh, Kavitha, Meena, Vikram, and Deepa expanded the family footprint across Austin, Bangalore, and Mumbai, pioneering in technology, law, and healthcare.',
    featuredPersonId: 'p-rajesh',
    featuredPersonName: 'Rajesh Venkat Medida',
    featuredRole: 'Principal Cloud Architect',
  },
  {
    step: 3,
    gen: 3,
    title: 'Generation IV — The Global Horizon',
    era: '2000 – Present',
    headline: 'AI Genomics, Architecture, Robotics & Cinema',
    narrative: 'Priya, Rohan, Anika, Arjun, Maya, and Kiran represent the next generation across Stanford, Columbia, IIT Madras, and Mumbai cinema.',
    featuredPersonId: 'c-priya',
    featuredPersonName: 'Priya Suresh Medida',
    featuredRole: 'AI & Genomics Researcher',
  },
];

export default function GuidedTourModal({
  isOpen,
  onClose,
  onStepChange,
  isReducedMotion = false,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const stepData = TOUR_STEPS[currentStep];

  // Notify parent canvas whenever tour step changes
  useEffect(() => {
    if (isOpen) {
      onStepChange?.(stepData);
    }
  }, [isOpen, currentStep, onStepChange, stepData]);

  // Autoplay progression
  useEffect(() => {
    if (isPlaying && isOpen) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < TOUR_STEPS.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 5500);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isPlaying, isOpen]);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="ft-tour-overlay" role="dialog" aria-label="Explore Family Guided Tour">
      <div className="ft-tour-card">
        {/* Step Indicator */}
        <div className="ft-tour-header">
          <div className="ft-tour-stepper">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.step}
                className={`ft-tour-step-dot ${idx === currentStep ? 'ft-tour-step-dot--active' : idx < currentStep ? 'ft-tour-step-dot--completed' : ''}`}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(idx);
                }}
                aria-label={`Jump to ${s.title}`}
              />
            ))}
          </div>

          <div className="ft-tour-badges">
            <span className="ft-tour-era-badge">{stepData.era}</span>
            <button className="ft-tour-close-btn" onClick={onClose} aria-label="Exit tour">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dynamic Story Content */}
        <FadeContent key={stepData.step} duration={300} distance={10} isReducedMotion={isReducedMotion}>
          <div className="ft-tour-body">
            <span className="ft-tour-gen-title">{stepData.title}</span>
            <h2 className="ft-tour-headline">{stepData.headline}</h2>
            <p className="ft-tour-narrative">{stepData.narrative}</p>

            <div className="ft-tour-spotlight-pill">
              <span className="ft-tour-spotlight-label">Spotlight</span>
              <span className="ft-tour-spotlight-name">{stepData.featuredPersonName}</span>
              <span className="ft-tour-spotlight-role">&bull; {stepData.featuredRole}</span>
            </div>
          </div>
        </FadeContent>

        {/* Tour Control Actions */}
        <div className="ft-tour-controls">
          <div className="ft-tour-nav-btns">
            <button
              className="ft-tour-btn ft-tour-btn--secondary"
              onClick={handlePrev}
              disabled={currentStep === 0}
              aria-label="Previous generation"
            >
              Previous
            </button>

            <button
              className={`ft-tour-btn ${isPlaying ? 'ft-tour-btn--playing' : 'ft-tour-btn--primary'}`}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause tour' : 'Play tour'}
            >
              {isPlaying ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Play Tour</span>
                </>
              )}
            </button>

            <button
              className="ft-tour-btn ft-tour-btn--secondary"
              onClick={handleNext}
              disabled={currentStep === TOUR_STEPS.length - 1}
              aria-label="Next generation"
            >
              Next
            </button>
          </div>

          <span className="ft-tour-progress-text">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
}
