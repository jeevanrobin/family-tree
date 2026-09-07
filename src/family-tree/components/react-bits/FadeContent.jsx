/**
 * FadeContent Component (React Bits inspired)
 * Seamless opacity, blur, and translateY entrance transition for containers & modal sections.
 */

import React, { useRef, useState, useEffect } from 'react';

export default function FadeContent({
  children,
  blur = false,
  duration = 400,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
  delay = 0,
  initialOpacity = 0,
  distance = 12,
  className = '',
  style = {},
  isReducedMotion = false,
}) {
  const [isVisible, setIsVisible] = useState(isReducedMotion);
  const domRef = useRef(null);

  useEffect(() => {
    if (isReducedMotion) {
      setIsVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, isReducedMotion]);

  if (isReducedMotion) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div
      ref={domRef}
      className={`rb-fade-content ${className}`}
      style={{
        opacity: isVisible ? 1 : initialOpacity,
        transform: isVisible ? 'translateY(0px)' : `translateY(${distance}px)`,
        filter: blur ? (isVisible ? 'blur(0px)' : 'blur(8px)') : 'none',
        transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}, filter ${duration}ms ${easing}`,
        willChange: 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
