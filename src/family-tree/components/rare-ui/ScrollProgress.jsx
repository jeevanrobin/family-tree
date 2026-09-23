import React, { useState, useEffect, useRef } from 'react';

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';
import { cn } from '../../lib/utils.js';
import './rareUi.css';

export default function ScrollProgress({
  sections = [],
  containerRef,
  offset = 120,
  onNavigateSection,
  className,
  ...props
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const rootRef = useRef(null);

  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef } : undefined
  );

  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.25,
  });

  const [percent, setPercent] = useState(0);

  useEffect(() => {
    return progress.on('change', (latest) => {
      setPercent(Math.round(Math.min(100, Math.max(0, latest * 100))));
    });
  }, [progress]);

  // Section tracking
  useEffect(() => {
    const scroller = containerRef?.current ?? window;

    const update = () => {
      const anchor = (containerRef?.current?.getBoundingClientRect().top ?? 0) + offset;
      const active = sections.findLast(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const top = el.getBoundingClientRect().top;
        return top <= anchor;
      });
      if (active) {
        setActiveId(active.id);
      }
    };

    update();
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sections, containerRef, offset]);

  // Outside click to close menu
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeLabel = sections.find((s) => s.id === activeId)?.label || 'Overview';

  const handleSelect = (id) => {
    setActiveId(id);
    setOpen(false);
    if (onNavigateSection) {
      onNavigateSection(id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    }
  };

  return (
    <div
      ref={rootRef}
      data-slot="scroll-progress-root"
      className={cn(className)}
      {...props}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            className="ft-scroll-progress-menu"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="menu"
            aria-label="Section navigation"
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontFamily: 'var(--ft-font-mono)',
                color: 'var(--ft-text-muted)',
                padding: '4px 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Page Sections
            </div>
            {sections.map((s) => {
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    'ft-scroll-progress-menu__item',
                    isActive && 'ft-scroll-progress-menu__item--active'
                  )}
                  onClick={() => handleSelect(s.id)}
                  role="menuitem"
                >
                  <span>{s.label}</span>
                  {isActive && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--ft-accent)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="ft-scroll-progress-pill"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Reading progress: ${percent}%, current section: ${activeLabel}. Click to jump to a section.`}
      >
        {/* Radial progress circle */}
        <div className="ft-scroll-progress-pill__indicator">
          <svg width="22" height="22" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--ft-border, rgba(255,255,255,0.15))"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--ft-accent, #E56515)"
              strokeWidth="3"
              strokeDasharray={94.25}
              strokeDashoffset={94.25 - (94.25 * percent) / 100}
              strokeLinecap="round"
              style={{ transition: reduceMotion ? 'none' : 'stroke-dashoffset 0.15s ease' }}
            />
          </svg>
        </div>

        <span className="ft-scroll-progress-pill__label">{activeLabel}</span>

        <svg
          className="ft-scroll-progress-pill__chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}
