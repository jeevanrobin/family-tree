/**
 * ClickSpark Component (React Bits Inspired)
 * Elegant, restrained micro-sparks on button & card interactions.
 */

import React, { useRef, useState, useCallback } from 'react';

export default function ClickSpark({
  sparkColor = 'var(--ft-accent)',
  sparkSize = 8,
  sparkCount = 6,
  duration = 400,
  children,
  className = '',
  onClick,
  ...props
}) {
  const [sparks, setSparks] = useState([]);
  const sparkIdCounter = useRef(0);

  const handleClick = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const newSparks = Array.from({ length: sparkCount }).map((_, i) => {
        sparkIdCounter.current += 1;
        const angle = (i / sparkCount) * Math.PI * 2;
        const distance = 16 + Math.random() * 12;
        return {
          id: sparkIdCounter.current,
          x: clickX,
          y: clickY,
          targetX: clickX + Math.cos(angle) * distance,
          targetY: clickY + Math.sin(angle) * distance,
        };
      });

      setSparks((prev) => [...prev, ...newSparks]);

      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => !newSparks.some((n) => n.id === s.id)));
      }, duration);

      onClick?.(e);
    },
    [sparkCount, duration, onClick]
  );

  return (
    <div
      className={`rb-click-spark ${className}`}
      onClick={handleClick}
      style={{ position: 'relative', overflow: 'visible', display: 'inline-block' }}
      {...props}
    >
      {children}
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="rb-spark-dot"
          style={{
            position: 'absolute',
            left: spark.x,
            top: spark.y,
            width: sparkSize,
            height: sparkSize,
            borderRadius: '50%',
            backgroundColor: sparkColor,
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
            animation: `rbSparkFly ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
            '--spark-dx': `${spark.targetX - spark.x}px`,
            '--spark-dy': `${spark.targetY - spark.y}px`,
          }}
        />
      ))}
    </div>
  );
}
