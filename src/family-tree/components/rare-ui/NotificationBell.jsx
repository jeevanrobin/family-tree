import React, { useEffect, useRef } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { cn } from '../../lib/utils.js';
import './rareUi.css';

const SWING_SPRING = {
  type: 'spring',
  stiffness: 220,
  damping: 10,
  mass: 1,
  restDelta: 0.01,
};

const CLAPPER_SPRING = { stiffness: 300, damping: 14, mass: 1 };
const IMPULSE = 500;
const MAX_VELOCITY = 900;
const BURST = 5;
const CLAPPER_SWEEP = 13;
const CLAPPER_VELOCITY = 450;

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export default function NotificationBell({
  count = 0,
  size = 36,
  onClick,
  title = 'Notifications',
  className,
  ...props
}) {
  const reduced = useReducedMotion() ?? false;
  const swing = useMotionValue(0);
  const swingVelocity = useVelocity(swing);

  const clapperLag = useTransform(
    swingVelocity,
    [-CLAPPER_VELOCITY, 0, CLAPPER_VELOCITY],
    [CLAPPER_SWEEP, 0, -CLAPPER_SWEEP],
    { clamp: true }
  );
  const clapper = useSpring(clapperLag, CLAPPER_SPRING);
  const previous = useRef(count);
  const ringing = useRef(null);

  const triggerRing = () => {
    if (reduced) return;
    const moving = swing.getVelocity();
    const along = moving > 1 ? 1 : -1;
    ringing.current = animate(swing, 0, {
      ...SWING_SPRING,
      velocity: clamp(moving + along * IMPULSE, MAX_VELOCITY),
    });
  };

  useEffect(() => {
    const delta = count - previous.current;
    previous.current = count;
    if (delta <= 0 || reduced) return;

    const weight = 0.7 + (0.6 * Math.min(delta, BURST)) / BURST;
    const moving = swing.getVelocity();
    const along = moving > 1 ? 1 : -1;

    ringing.current = animate(swing, 0, {
      ...SWING_SPRING,
      velocity: clamp(moving + along * IMPULSE * weight, MAX_VELOCITY),
    });
  }, [count, reduced, swing]);

  useEffect(() => () => ringing.current?.stop(), []);

  const handleClick = (e) => {
    triggerRing();
    onClick?.(e);
  };

  const iconSize = Math.round(size * 0.55);

  return (
    <button
      type="button"
      data-slot="notification-bell"
      className={cn('ft-header__icon-btn', className)}
      style={{ width: size, height: size }}
      onClick={handleClick}
      title={title}
      aria-label={`${title}${count > 0 ? ` (${count} unread)` : ''}`}
      {...props}
    >
      <motion.svg
        viewBox="0 0 18 18"
        fill="currentColor"
        aria-hidden="true"
        width={iconSize}
        height={iconSize}
        style={{ rotate: swing, transformOrigin: '50% 12%' }}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fillOpacity={0.8}
          d="M3.5 6.5C3.5 3.46279 5.96279 1 9 1C12.0372 1 14.5 3.46279 14.5 6.5V10.75C14.5 11.4408 15.0592 12 15.75 12C16.1642 12 16.5 12.3358 16.5 12.75C16.5 13.1642 16.1642 13.5 15.75 13.5H2.25C1.83579 13.5 1.5 13.1642 1.5 12.75C1.5 12.3358 1.83579 12 2.25 12C2.94079 12 3.5 11.4408 3.5 10.75V6.5Z"
        />
        <motion.path
          style={{
            rotate: clapper,
            transformBox: 'fill-box',
            transformOrigin: '50% 0%',
          }}
          d="M10.2 15H7.80099C7.64999 15 7.50799 15.068 7.41299 15.185C7.31799 15.302 7.28099 15.456 7.31199 15.603C7.48499 16.425 8.17999 17 9.00099 17C9.82199 17 10.517 16.425 10.69 15.603C10.721 15.456 10.684 15.302 10.589 15.185C10.494 15.068 10.351 15 10.2 15Z"
        />
      </motion.svg>

      {count > 0 && (
        <span className="ft-bell-badge">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
