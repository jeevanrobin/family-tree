import { useId, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cn } from '../../lib/utils.js';

const REVEAL = {
  fade: ({ progress }) => ({ opacity: progress }),
  scale: ({ progress, start = 0.8 }) => ({ opacity: progress, scale: start + progress * 0.2 }),
  slide: ({ progress, direction = 'up' }) => {
    const offset = (1 - progress) * 50;
    const y = direction === 'up' ? offset : direction === 'down' ? -offset : 0;
    const x = direction === 'left' ? offset : direction === 'right' ? -offset : 0;
    return { opacity: progress, y, x };
  },
  flip: ({ progress, axis = 'Y' }) => ({
    opacity: progress,
    rotateX: axis === 'X' ? (1 - progress) * 90 : 0,
    rotateY: axis === 'Y' ? (1 - progress) * 90 : 0,
  }),
  blur: ({ progress }) => ({
    opacity: progress,
    filter: `blur(${(1 - progress) * 10}px)`,
  }),
};

function GridCell({
  children,
  reveal = 'fade',
  index = 0,
  stagger = 0.05,
  className,
  style,
  onClick,
  ...props
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [isInView, setIsInView] = useState(false);

  const revealFn = typeof reveal === 'function' ? reveal : REVEAL[reveal] || REVEAL.fade;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const delay = index * stagger;
  const revealStyle = revealFn({ progress: progress.get(), index, delay });

  return (
    <motion.div
      ref={ref}
      data-slot="grid-cell"
      initial={{ opacity: 0 }}
      animate={isInView ? revealStyle : { opacity: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              duration: 0.6,
              delay,
              ease: [0.21, 0.47, 0.32, 0.98],
            }
      }
      className={cn('relative', className)}
      style={{ perspective: 1000, ...style }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default function GridReveal({
  items,
  columns = 3,
  gap = 16,
  reveal = 'fade',
  stagger = 0.05,
  renderItem,
  className,
  cellClassName,
  ...props
}) {
  const gridId = `grid-reveal-${useId().replace(/:/g, '')}`;

  return (
    <div
      data-slot="grid-reveal"
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
      }}
      {...props}
    >
      {items.map((item, index) => (
        <GridCell
          key={`${gridId}-${index}`}
          reveal={reveal}
          index={index}
          stagger={stagger}
          className={cellClassName}
        >
          {renderItem ? renderItem(item, index) : item}
        </GridCell>
      ))}
    </div>
  );
}

export { GridCell, REVEAL };
