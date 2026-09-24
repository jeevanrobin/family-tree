import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion, useSpring } from 'motion/react';
import { cn } from '../../lib/utils.js';

const ACCENT = '#E56515';
const SPRING = { type: 'spring', stiffness: 200, damping: 28, mass: 1 };

const SEGMENTS = 40;

function polarToCartesian(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function MatrixOrb({
  value,
  maxValue = 100,
  label,
  size = 120,
  strokeWidth = 6,
  color = ACCENT,
  trackColor = 'rgba(255,255,255,0.08)',
  pulseOnHover = true,
  className,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const gradientId = `matrix-orb-gradient-${useId().replace(/:/g, '')}`;
  const clipId = `matrix-orb-clip-${useId().replace(/:/g, '')}`;

  const radius = size / 2 - strokeWidth / 2;
  const center = size / 2;
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const circumference = 2 * Math.PI * radius;

  const animatedValue = useSpring(0, SPRING);
  const progressOffset = useSpring(circumference, SPRING);

  useEffect(() => {
    if (reduced) {
      animatedValue.jump(percentage);
      progressOffset.jump(circumference * (1 - percentage / 100));
    } else {
      animatedValue.set(percentage);
      progressOffset.set(circumference * (1 - percentage / 100));
    }
  }, [percentage, circumference, animatedValue, progressOffset, reduced]);

  const displayValue = useSpring(0, SPRING);
  useEffect(() => {
    displayValue.set(Math.round(value));
  }, [value, displayValue]);

  const pulseScale = useSpring(1, { type: 'spring', stiffness: 300, damping: 25 });

  useEffect(() => {
    if (!reduced && pulseOnHover) {
      pulseScale.set(isHovered ? 1.08 : 1);
    } else if (reduced) {
      pulseScale.jump(1);
    }
  }, [isHovered, pulseScale, reduced, pulseOnHover]);

  const segmentArcs = [];
  for (let i = 0; i < SEGMENTS; i += 2) {
    const startAngle = (i / SEGMENTS) * 360;
    const endAngle = ((i + 1) / SEGMENTS) * 360;
    segmentArcs.push(describeArc(center, center, radius + strokeWidth / 2 + 8, startAngle, endAngle));
  }

  return (
    <motion.div
      data-slot="matrix-orb"
      className={cn('relative inline-flex flex-col items-center justify-center', className)}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute"
        animate={{ scale: pulseScale }}
        transition={reduced ? { duration: 0 } : SPRING}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <clipPath id={clipId}>
            <circle cx={center} cy={center} r={radius} />
          </clipPath>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: progressOffset }}
          transition={reduced ? { duration: 0 } : SPRING}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />

        {isHovered && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="matrix-orb-glow"
          >
            {segmentArcs.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity={0.5}
              />
            ))}
          </motion.g>
        )}
      </motion.svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-mono text-lg font-semibold tracking-tight"
          style={{ color }}
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
        >
          {Math.round(value)}
        </motion.span>
        {label && (
          <span className="mt-0.5 text-center text-xs ft-matrix-orb-label">
            {label}
          </span>
        )}
      </div>
    </motion.div>
  );
}
