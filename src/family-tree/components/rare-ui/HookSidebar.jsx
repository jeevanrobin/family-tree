import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils.js';

const CORNER = 6;
const DASH = 'repeating-linear-gradient(to top, transparent 0 2px, currentColor 2px 4px)';

const ACCENT = '#E56515';

const Rail = ({ from = 0, y, visible, color, dashed, className }) => {
  const reduced = useReducedMotion();
  const travel = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.7 };

  return (
    <motion.span
      aria-hidden
      initial={false}
      style={{ color }}
      animate={{ opacity: visible && y !== null ? 1 : 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2 }}
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      <motion.span
        initial={false}
        animate={{ top: from, height: Math.max(0, (y ?? 0) - CORNER - from) }}
        transition={travel}
        style={dashed ? { backgroundImage: DASH } : { backgroundColor: 'currentColor' }}
        className="absolute left-0.5 w-px"
      />
      <motion.svg
        initial={false}
        animate={{ top: (y ?? 0) - CORNER }}
        transition={travel}
        width="12"
        height="7"
        viewBox="0 0 12 7"
        fill="none"
        className="absolute left-0.5"
      >
        <path
          d="M0.5 0a6 6 0 0 0 6 6H12"
          stroke="currentColor"
          strokeDasharray={dashed ? '2 2' : undefined}
        />
      </motion.svg>
    </motion.span>
  );
};

export default function HookSidebar({
  familyId,
  items,
  label,
  color = ACCENT,
  dashed = true,
  className,
  ...props
}) {
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);

  const toItem = (item) => (typeof item === 'string' ? { label: item } : item);

  const hrefOf = (item) => {
    const navItem = toItem(item);
    return navItem.href ? `/app/family/${familyId}${navItem.href}` : undefined;
  };

  const labelOf = (item) => toItem(item).label;

  useEffect(() => {
    const matchedIndex = items.findIndex((item) => {
      const href = hrefOf(item);
      if (!href) return false;
      return location.pathname === href || location.pathname.startsWith(href + '/');
    });
    setActiveIndex(matchedIndex >= 0 ? matchedIndex : -1);
  }, [location.pathname, items, familyId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () =>
      setCenters(itemRefs.current.map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0)));

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items.length]);

  const activeY = activeIndex < 0 ? null : centers[activeIndex] ?? null;
  const hoverY = hoverIndex === null ? null : centers[hoverIndex] ?? null;

  const hoverFrom =
    activeY !== null && hoverY !== null && hoverY <= activeY
      ? Math.max(0, hoverY - CORNER)
      : activeY ?? 0;

  return (
    <nav
      data-slot="hook-sidebar"
      aria-label={label}
      className={cn('flex flex-col', className)}
      {...props}
    >
      {label && (
        <span
          data-slot="hook-sidebar-label"
          className="pb-3 pl-0.5 pr-2 font-sans text-sm font-medium uppercase tracking-wide ft-hook-sidebar-label"
        >
          {label}
        </span>
      )}

      <div
        ref={listRef}
        onMouseLeave={() => setPointerInside(false)}
        className="relative flex flex-col gap-0.5"
      >
        <Rail
          from={hoverFrom}
          y={hoverY}
          visible={(pointerInside || focusInside) && hoverIndex !== activeIndex}
          dashed={dashed}
          className="ft-hook-sidebar-rail-hover"
        />
        <Rail y={activeY} visible={activeY !== null} color={color} dashed={dashed} />

        {items.map((item, index) => {
          const text = labelOf(item);
          const href = hrefOf(item);
          const isActive = index === activeIndex;

          const setRef = (el) => {
            itemRefs.current[index] = el;
          };

          const rowProps = {
            'data-slot': 'hook-sidebar-item',
            'data-active': isActive,
            onMouseEnter: () => {
              setHoverIndex(index);
              setPointerInside(true);
            },
            onFocus: () => {
              setHoverIndex(index);
              setFocusInside(true);
            },
            onBlur: () => setFocusInside(false),
            className: cn(
              'rounded-lg py-1.5 pl-5 pr-2 text-left text-sm transition-colors duration-200 motion-reduce:transition-none',
              isActive
                ? 'ft-hook-sidebar-active'
                : 'ft-hook-sidebar-inactive',
            ),
          };

          return href ? (
            <Link
              key={`${index}-${text}`}
              {...rowProps}
              ref={setRef}
              to={href}
              aria-current={isActive ? 'page' : undefined}
            >
              {text}
            </Link>
          ) : (
            <button
              key={`${index}-${text}`}
              {...rowProps}
              ref={setRef}
              type="button"
              aria-current={isActive ? 'true' : undefined}
            >
              {text}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
