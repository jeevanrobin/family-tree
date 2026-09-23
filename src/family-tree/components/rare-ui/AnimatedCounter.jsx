import React, { memo, useMemo } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useTransform,
  useSpring,
} from 'motion/react';

import { cn } from '../../lib/utils.js';
import './rareUi.css';

const FACES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const WHEEL = [...FACES, 0];
const LINE = 1.4;

const FADE = `linear-gradient(to bottom,
  rgba(0,0,0,0) 0%,
  rgba(0,0,0,0.06) 5.5%,
  rgba(0,0,0,0.5) 11%,
  rgba(0,0,0,0.94) 16.5%,
  #000 22%,
  #000 78%,
  rgba(0,0,0,0.94) 83.5%,
  rgba(0,0,0,0.5) 89%,
  rgba(0,0,0,0.06) 94.5%,
  rgba(0,0,0,0) 100%)`;

const BOUNCE = 0.16;

const spring = (duration) => ({
  type: 'spring',
  visualDuration: duration,
  bounce: BOUNCE,
});

const MAX_DECIMALS = 15;
const MAX_PAD = 24;
const MIN_DURATION = 0.01;
const MAX_DURATION = 60;

const clamp = (n, low, high) => Math.min(high, Math.max(low, Number.isFinite(n) ? n : low));
const isDigit = (char) => char >= '0' && char <= '9';

const SIZER = FACES.map((face) => (
  <span key={face} aria-hidden="true" style={{ visibility: 'hidden', gridArea: '1/1' }}>
    {face}
  </span>
));

const STACK = WHEEL.map((face, index) => (
  <span
    key={index}
    style={{
      height: `${LINE}em`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {face}
  </span>
));

const EVERY_THREE = /\B(?=(\d{3})+(?!\d))/g;

function group(whole, separator) {
  if (!separator) return whole;
  return whole.replace(EVERY_THREE, separator);
}

function measure(value, decimals, padStart, duration) {
  const amount = Number.isFinite(value) ? value : 0;
  const places = clamp(Math.trunc(decimals), 0, MAX_DECIMALS);
  const pad = clamp(Math.trunc(padStart), 1, MAX_PAD);
  const scaled = Math.min(Number.MAX_SAFE_INTEGER, Math.round(Math.abs(amount) * 10 ** places));

  return {
    amount,
    scaled,
    places,
    pace: clamp(duration, MIN_DURATION, MAX_DURATION),
    width: Math.max(String(scaled).length, places + pad),
  };
}

function format({ scaled, places, width }, separator, decimalSeparator) {
  const raw = String(scaled).padStart(width, '0');
  const whole = group(raw.slice(0, raw.length - places) || '0', separator);
  return places ? `${whole}${decimalSeparator}${raw.slice(raw.length - places)}` : whole;
}

function toCells(chars, width) {
  const cells = [];
  let seen = 0;
  let run = 0;

  for (const char of chars) {
    if (isDigit(char)) {
      run = 0;
      cells.push({ kind: 'digit', key: width - seen++, digit: Number(char) });
    } else {
      cells.push({ kind: 'mark', key: `mark-${width - seen}-${run++}`, char });
    }
  }
  return cells;
}

const Fixed = memo(function Fixed({ children, dep }) {
  return (
    <motion.span
      data-slot="counter-fixed"
      layout="position"
      key={dep}
      style={{ display: 'inline-flex' }}
    >
      {children}
    </motion.span>
  );
});

const Mark = memo(function Mark({ char, shift }) {
  return (
    <motion.span
      data-slot="counter-mark"
      layout="position"
      transition={shift}
      style={{ display: 'inline-flex' }}
    >
      {char}
    </motion.span>
  );
});

const Digit = memo(function Digit({ digit, reduced }) {
  const targetOffset = -digit * LINE;

  const animatedY = useSpring(targetOffset, {
    stiffness: 120,
    damping: 18,
    mass: 0.5,
  });

  const transformY = useTransform(animatedY, (val) => `${val}em`);

  if (reduced) {
    return (
      <span style={{ display: 'inline-grid', placeItems: 'center' }}>
        {digit}
      </span>
    );
  }

  return (
    <motion.span
      data-slot="counter-digit"
      layout="position"
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        overflow: 'hidden',
        height: `${LINE}em`,
        maskImage: FADE,
        WebkitMaskImage: FADE,
      }}
    >
      {SIZER}
      <motion.span
        style={{
          gridArea: '1/1',
          display: 'flex',
          flexDirection: 'column',
          y: transformY,
        }}
      >
        {STACK}
      </motion.span>
    </motion.span>
  );
});

export default function AnimatedCounter({
  value = 0,
  decimals = 0,
  duration = 0.6,
  padStart = 1,
  separator = ',',
  decimalSeparator = '.',
  prefix,
  suffix,
  className,
  ...props
}) {
  const reduced = useReducedMotion() ?? false;
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  const shape = measure(numValue, decimals, padStart, duration);
  const chars = format(shape, separator, decimalSeparator);
  const cells = toCells(chars, shape.width);
  const negative = shape.amount < 0 && shape.scaled > 0;

  const shift = useMemo(
    () => (reduced ? { duration: 0 } : spring(shape.pace)),
    [reduced, shape.pace]
  );

  return (
    <span
      data-slot="animated-counter"
      className={cn('inline-flex items-center tabular-nums', className)}
      {...props}
    >
      {prefix != null && <Fixed dep={chars.length}>{prefix}</Fixed>}

      <span className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        {negative ? '-' : ''}
        {chars}
      </span>

      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}>
        {negative && <Fixed dep={chars.length}>-</Fixed>}
        <AnimatePresence mode="popLayout" initial={false}>
          {cells.map((cell) =>
            cell.kind === 'digit' ? (
              <Digit
                key={cell.key}
                digit={cell.digit}
                duration={shape.pace}
                reduced={reduced}
                shift={shift}
              />
            ) : (
              <Mark key={cell.key} char={cell.char} shift={shift} />
            )
          )}
        </AnimatePresence>
      </span>

      {suffix != null && <Fixed dep={chars.length}>{suffix}</Fixed>}
    </span>
  );
}
