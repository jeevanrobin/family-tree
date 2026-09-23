import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils.js';
import './rareUi.css';

const themes = {
  amber: {
    backFill: '#1A1410',
    backInsetColor: '0 0 0 0 1 0 0 0 0 0.6 0 0 0 0 0.15 0 0 0 0.35 0',
    backInsetShadow: 'inset 0 0 8px 2px rgba(229, 101, 21, 0.28)',
    flapFill: '#2E1D13',
    flapFillOpacity: 0.85,
    flapStroke: '#E56515',
    flapInsetColor: '0 0 0 0 1 0 0 0 0 0.65 0 0 0 0 0.2 0 0 0 0.2 0',
    cardFill: '#231B16',
    cardStroke: '#3E2A1E',
    cardLineFill: '#E56515',
  },
  black: {
    backFill: '#15191E',
    backInsetColor: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0',
    backInsetShadow: 'inset 0 0 6px 2px rgba(255,255,255,0.12)',
    flapFill: '#1E252C',
    flapFillOpacity: 0.85,
    flapStroke: '#38424C',
    flapInsetColor: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0',
    cardFill: '#1A1E22',
    cardStroke: '#2B333B',
    cardLineFill: '#46515C',
  },
  light: {
    backFill: '#FFFFFF',
    backInsetColor: '0 0 0 0 0.7 0 0 0 0 0.7 0 0 0 0 0.7 0 0 0 0.2 0',
    backInsetShadow: 'inset 0 0 6px 2px rgba(21, 25, 30, 0.08)',
    flapFill: '#F7F7F5',
    flapFillOpacity: 0.95,
    flapStroke: '#E3E3DE',
    flapInsetColor: '0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0.1 0',
    cardFill: '#FFFFFF',
    cardStroke: '#EDEDE8',
    cardLineFill: '#E56515',
  },
};

const sizeScales = {
  sm: 0.58,
  md: 0.85,
  lg: 1.1,
};

const BASE_WIDTH = 321;
const BASE_HEIGHT = 241;

const FLAP_PATH =
  'M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z';

function ArchivalCard({ id, theme, previewItem }) {
  const filterId = `filter0_i_card_${id}`;
  return (
    <div
      data-slot="folder-card"
      style={{
        width: 164,
        height: 214,
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
    >
      {previewItem?.imageUrl ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            src={previewItem.imageUrl}
            alt={previewItem.title || 'Archival record'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)',
            }}
          />
          {previewItem.year && (
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                left: 10,
                fontSize: '0.65rem',
                fontFamily: 'var(--ft-font-mono)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {previewItem.year}
            </span>
          )}
        </div>
      ) : (
        <svg
          width="164"
          height="214"
          viewBox="0 0 164 214"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter={`url(#${filterId})`}>
            <rect width="163.078" height="213.262" rx="20" fill={theme.cardFill} />
          </g>
          <rect
            x="0.5"
            y="0.5"
            width="162.078"
            height="212.262"
            rx="19.5"
            stroke={theme.cardStroke}
          />
          <rect
            x="14"
            y="30"
            width="135"
            height="18"
            rx="5"
            fill={theme.cardLineFill}
            fillOpacity="0.25"
          />
          <rect
            x="14"
            y="56"
            width="90"
            height="10"
            rx="3"
            fill={theme.cardLineFill}
            fillOpacity="0.18"
          />
          <rect
            x="14"
            y="76"
            width="135"
            height="110"
            rx="10"
            fill={theme.cardStroke}
            fillOpacity="0.3"
          />
        </svg>
      )}
    </div>
  );
}

export default function FolderComponent({
  color = 'amber',
  size = 'md',
  previews = [],
  onClick,
  className,
  ...props
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const theme = themes[color] ?? themes.amber;
  const scale = sizeScales[size] || sizeScales.md;
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e) => {
    setIsOpen((o) => !o);
    onClick?.(e);
  };

  return (
    <div
      data-slot="folder"
      className={cn('relative flex items-center justify-center', className)}
      {...props}
    >
      <div
        className="relative cursor-pointer select-none"
        style={{
          width: BASE_WIDTH * scale,
          height: BASE_HEIGHT * scale,
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsOpen(false);
        }}
        onClick={handleClick}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
            perspective: 800 * scale,
          }}
        >
          {/* Back folder body */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: BASE_WIDTH,
              height: BASE_HEIGHT,
              borderRadius: 25,
              backgroundColor: theme.backFill,
              boxShadow: theme.backInsetShadow,
              border: `1px solid ${theme.flapStroke}`,
            }}
          />

          {/* Fanning Cards */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Card 1 (Right fan) */}
            <motion.div
              style={{ position: 'absolute' }}
              animate={
                reducedMotion
                  ? { y: isOpen ? -60 : isHovered ? -15 : 0 }
                  : {
                      y: isOpen ? -145 : isHovered ? -26 : -8,
                      x: isOpen ? 60 : 32,
                      rotate: isOpen ? 16 : isHovered ? 12 : 8,
                    }
              }
              transition={{
                type: 'spring',
                stiffness: 140,
                damping: 14,
                delay: isOpen ? 0.08 : 0,
              }}
            >
              <ArchivalCard id={1} theme={theme} previewItem={previews[0]} />
            </motion.div>

            {/* Card 2 (Center card) */}
            <motion.div
              style={{ position: 'absolute' }}
              animate={
                reducedMotion
                  ? { y: isOpen ? -75 : isHovered ? -20 : -5 }
                  : {
                      y: isOpen ? -160 : isHovered ? -32 : -16,
                      x: isOpen ? 0 : 2,
                      rotate: isOpen ? -2 : isHovered ? -1 : 1,
                    }
              }
              transition={{
                type: 'spring',
                stiffness: 140,
                damping: 14,
                delay: isOpen ? 0.04 : 0,
              }}
            >
              <ArchivalCard id={2} theme={theme} previewItem={previews[1]} />
            </motion.div>

            {/* Card 3 (Left fan) */}
            <motion.div
              style={{ position: 'absolute' }}
              animate={
                reducedMotion
                  ? { y: isOpen ? -60 : isHovered ? -15 : 0 }
                  : {
                      y: isOpen ? -150 : isHovered ? -38 : -18,
                      x: isOpen ? -55 : -32,
                      rotate: isOpen ? -12 : isHovered ? -8 : -4,
                    }
              }
              transition={{
                type: 'spring',
                stiffness: 140,
                damping: 14,
              }}
            >
              <ArchivalCard id={3} theme={theme} previewItem={previews[2]} />
            </motion.div>
          </div>

          {/* 3D Tilted Front Flap */}
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginTop: '16px',
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
              width: 321,
              height: 241,
            }}
            animate={
              reducedMotion
                ? { opacity: isOpen ? 0.4 : 1 }
                : { rotateX: isOpen ? -50 : isHovered ? -38 : -12 }
            }
            transition={{ type: 'spring', stiffness: 140, damping: 15 }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                clipPath: `path('${FLAP_PATH}')`,
                WebkitClipPath: `path('${FLAP_PATH}')`,
              }}
            />
            <svg
              width="321"
              height="241"
              viewBox="0 0 321 241"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ position: 'absolute', inset: 0 }}
            >
              <path
                d={FLAP_PATH}
                fill={theme.flapFill}
                fillOpacity={theme.flapFillOpacity}
              />
              <path
                d="M25 0.5H136.084C142.905 0.5 149.417 3.3431 154.054 8.3457L177.713 33.874C182.539 39.0808 189.317 42.04 196.416 42.04H296C309.531 42.04 320.5 53.0092 320.5 66.54V216C320.5 229.531 309.531 240.5 296 240.5H25C11.469 240.5 0.5 229.531 0.5 216V25C0.5 11.469 11.469 0.5 25 0.5Z"
                stroke={theme.flapStroke}
                strokeWidth="1.5"
              />
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
