import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { cn } from '../../lib/utils.js';

const SPRING = { type: 'spring', stiffness: 200, damping: 28, mass: 1 };
const NECK_BREAK = 0.22;
const NECK_H = 100;

const FADE_IN = 'transition-colors duration-[400ms]';
const FADE_OUT = 'transition-colors duration-0';

const SIZES = {
  sm: {
    label: 'gap-1.5 px-3 py-1.5 text-xs leading-4',
    radius: 10,
    separation: 16,
  },
  md: {
    label: 'gap-2 px-4 py-2 text-sm leading-5',
    radius: 12,
    separation: 20,
  },
};

const SURFACE = 'ft-gooey-surface';
const ACCENT = '#E56515';

function neckPath(gap, span) {
  if (!Number.isFinite(gap) || !Number.isFinite(span) || gap <= 0 || span <= 0) {
    return '';
  }
  const waist = NECK_H * (1 - gap / (span * NECK_BREAK));
  if (waist <= 0) return '';
  const start = span - gap;
  const mid = start + gap / 2;
  return `M${start} 0 Q${mid} ${NECK_H - waist} ${span} 0 L${span} ${NECK_H} Q${mid} ${waist} ${start} ${NECK_H} Z`;
}

function Segment({ gap, span, hasSeam, leftFill, rightFill, reduced, radii, className, style, children }) {
  const marginLeft = useSpring(gap, SPRING);
  const gradientId = `gooey-neck-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    if (reduced) marginLeft.jump(gap);
    else marginLeft.set(gap);
  }, [gap, marginLeft, reduced]);

  const d = useTransform(marginLeft, (g) => neckPath(g, span));

  return (
    <motion.li
      data-slot="gooey-nav-segment"
      className={cn('relative', className)}
      style={{ ...style, marginLeft }}
      initial={false}
      animate={radii}
      transition={reduced ? { duration: 0 } : SPRING}
    >
      {hasSeam && (
        <svg
          aria-hidden
          width={span}
          viewBox={`0 0 ${span} ${NECK_H}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-0 right-full h-full ft-gooey-neck-text"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1">
              <stop offset="0" stopColor={leftFill} />
              <stop offset="1" stopColor={rightFill} />
            </linearGradient>
          </defs>
          <motion.path d={d} fill={`url(#${gradientId})`} />
        </svg>
      )}
      {children}
    </motion.li>
  );
}

function NavLabel({ label, href, isActive, size, activeLabelColor, onSelect }) {
  const props = {
    'data-slot': 'gooey-nav-item',
    'data-active': isActive,
    'aria-current': isActive ? (href ? 'page' : true) : undefined,
    className: cn(
      'flex cursor-pointer items-center whitespace-nowrap font-medium',
      isActive ? FADE_IN : FADE_OUT,
      SIZES[size].label,
      !isActive && 'ft-gooey-nav-inactive',
    ),
    style: isActive ? { color: activeLabelColor } : undefined,
    onClick: onSelect,
  };

  return href ? (
    <Link to={href} {...props}>
      {label}
    </Link>
  ) : (
    <button type="button" {...props}>
      {label}
    </button>
  );
}

export default function GooeyNav({
  familyId,
  size = 'sm',
  activeColor = ACCENT,
  activeLabelColor = '#ffffff',
  separation,
  radius,
  className,
  ...props
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;

  const navItems = [
    { label: 'Tree', href: `/app/family/${familyId}` },
    { label: 'Timeline', href: `/app/family/${familyId}/timeline` },
    { label: 'Memories', href: `/app/family/${familyId}/memories` },
    { label: 'Archive', href: `/app/family/${familyId}/archive` },
    { label: 'Insights', href: `/app/family/${familyId}/insights` },
  ];

  const getActiveIndex = () => {
    const pathname = location.pathname;
    if (pathname.includes('/insights')) return 4;
    if (pathname.includes('/archive')) return 3;
    if (pathname.includes('/memories')) return 2;
    if (pathname.includes('/timeline')) return 1;
    return 0;
  };

  const [active, setActive] = useState(getActiveIndex);
  const span = separation ?? SIZES[size].separation;
  const corner = radius ?? SIZES[size].radius;

  useEffect(() => {
    setActive(getActiveIndex());
  }, [location.pathname]);

  const open = (seam) =>
    seam === 0 || seam === navItems.length || seam - 1 === active || seam === active;

  const fill = (i) => (i === active ? activeColor : 'currentColor');

  const handleSelect = (index) => {
    navigate(navItems[index].href);
  };

  return (
    <nav data-slot="gooey-nav" className={cn('inline-block', className)} {...props}>
      <ul className="flex items-center">
        {navItems.map((item, i) => {
          const isActive = i === active;

          return (
            <Segment
              key={`${i}-${item.label}`}
              gap={i === 0 ? 0 : open(i) ? span : -1}
              span={span}
              hasSeam={i > 0}
              leftFill={fill(i - 1)}
              rightFill={fill(i)}
              reduced={reduced}
              radii={{
                borderTopLeftRadius: open(i) ? corner : 0,
                borderBottomLeftRadius: open(i) ? corner : 0,
                borderTopRightRadius: open(i + 1) ? corner : 0,
                borderBottomRightRadius: open(i + 1) ? corner : 0,
              }}
              className={cn(SURFACE, isActive ? FADE_IN : FADE_OUT)}
              style={{ backgroundColor: isActive ? activeColor : undefined }}
            >
              <NavLabel
                {...item}
                isActive={isActive}
                size={size}
                activeLabelColor={activeLabelColor}
                onSelect={() => handleSelect(i)}
              />
            </Segment>
          );
        })}
      </ul>
    </nav>
  );
}
