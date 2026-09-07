/**
 * SpotlightCard Component (React Bits Inspired)
 * Adds a subtle radial spotlight effect that follows the cursor on hover.
 */

import React, { useRef, useState, useCallback } from 'react';

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(212, 163, 115, 0.14)',
  spotlightSize = 220,
  disabled = false,
  ...props
}) {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: -999, y: -999 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e) => {
      if (disabled || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [disabled]
  );

  const handleMouseEnter = useCallback(() => {
    if (!disabled) setIsHovered(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setPosition({ x: -999, y: -999 });
  }, []);

  return (
    <div
      ref={cardRef}
      className={`rb-spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        overflow: 'visible',
      }}
      {...props}
    >
      {/* Spotlight Gradient Layer */}
      {isHovered && !disabled && (
        <div
          className="rb-spotlight-overlay"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            borderRadius: 'inherit',
            background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
            zIndex: 2,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {children}
    </div>
  );
}
