/**
 * ScrollReveal Component (React Bits inspired)
 * Scroll-driven reveal animation triggered when elements enter viewport.
 * Perfect for Timeline cards, Album images, and Archive documents.
 */

import React, { useRef, useState, useEffect } from 'react';

export default function ScrollReveal({
  children,
  threshold = 0.15,
  rootMargin = '0px 0px -40px 0px',
  duration = 450,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
  distance = 18,
  scale = 0.98,
  className = '',
  style = {},
  isReducedMotion = false,
}) {
  const [hasRevealed, setHasRevealed] = useState(isReducedMotion);
  const elementRef = useRef(null);

  useEffect(() => {
    if (isReducedMotion) {
      setHasRevealed(true);
      return;
    }

    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasRevealed(true);
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [threshold, rootMargin, isReducedMotion]);

  if (isReducedMotion) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div
      ref={elementRef}
      className={`rb-scroll-reveal ${className}`}
      style={{
        opacity: hasRevealed ? 1 : 0,
        transform: hasRevealed ? 'translateY(0px) scale(1)' : `translateY(${distance}px) scale(${scale})`,
        transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
