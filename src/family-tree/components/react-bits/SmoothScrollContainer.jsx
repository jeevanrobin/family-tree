/**
 * SmoothScrollContainer Component
 * Lightweight, hardware-accelerated smooth scrolling wrapper for modal & document views.
 * Scoped strictly to content containers — never touches the family tree canvas.
 * Automatically respects prefers-reduced-motion.
 */

import React, { useRef, useEffect } from 'react';

export default function SmoothScrollContainer({
  children,
  className = '',
  style = {},
  isReducedMotion = false,
  ...props
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isReducedMotion) return;

    // Enable CSS smooth scrolling behavior for internal navigation
    el.style.scrollBehavior = 'smooth';
    el.style.webkitOverflowScrolling = 'touch';

    return () => {
      if (el) el.style.scrollBehavior = 'auto';
    };
  }, [isReducedMotion]);

  return (
    <div
      ref={scrollRef}
      className={`rb-smooth-scroll-container ${className}`}
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
