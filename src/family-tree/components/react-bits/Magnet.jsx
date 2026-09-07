/**
 * Magnet Component (React Bits Inspired)
 * Subtle magnetic attraction effect for interactive buttons.
 */

import React, { useRef, useState, useCallback } from 'react';

export default function Magnet({
  children,
  strength = 12,
  active = true,
  className = '',
  ...props
}) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e) => {
      if (!active || !ref.current) return;
      const { clientX, clientY } = e;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const deltaX = (clientX - centerX) / (width / 2);
      const deltaY = (clientY - centerY) / (height / 2);

      setPosition({
        x: deltaX * strength,
        y: deltaY * strength,
      });
    },
    [active, strength]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={ref}
      className={`rb-magnet ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
        transition: position.x === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 0.1s ease-out',
        display: 'inline-block',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
