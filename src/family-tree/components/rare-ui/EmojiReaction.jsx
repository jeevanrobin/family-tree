import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils.js';

const REACTIONS = {
  heart: '❤️',
  thumbs: '👍',
  laugh: '😂',
  fire: '🔥',
  star: '⭐',
  memory: '📸',
  celebration: '🎉',
};

const SPRING = { type: 'spring', stiffness: 400, damping: 25, mass: 0.5 };

function ReactionCounter({ emoji, count, isActive, onToggle, disabled, size = 'md' }) {
  const reduced = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

  const scale = useReducedMotion() ? 1 : isActive ? 1.15 : isHovered ? 1.05 : 1;

  return (
    <motion.button
      type="button"
      data-slot="reaction-counter"
      data-active={isActive}
      disabled={disabled}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'lg' && 'text-base px-3 py-1.5',
        isActive
          ? 'ft-reaction-active border-opacity-60'
          : 'ft-reaction-inactive',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      animate={{ scale }}
      transition={reduced ? { duration: 0 } : SPRING}
      whileTap={reduced ? {} : { scale: 0.95 }}
    >
      <motion.span
        animate={isActive && !reduced ? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="leading-none"
        style={{ fontSize: size === 'lg' ? '1.1em' : 'inherit' }}
      >
        {emoji}
      </motion.span>
      <span
        className={cn('tabular-nums font-medium', size === 'sm' && 'text-xs')}
        style={{ color: 'var(--ft-text-secondary)' }}
      >
        {count > 0 ? count : ''}
      </span>
    </motion.button>
  );
}

export default function EmojiReaction({
  reactions = {},
  userReactions = [],
  onReact,
  onUnreact,
  disabled = false,
  showCounts = true,
  size = 'md',
  className,
  ...props
}) {
  const activeReactions = new Set(userReactions);

  const handleToggle = (reactionKey) => {
    if (disabled) return;

    if (activeReactions.has(reactionKey)) {
      onUnreact?.(reactionKey);
    } else {
      onReact?.(reactionKey);
    }
  };

  return (
    <div
      data-slot="emoji-reaction"
      className={cn('inline-flex flex-wrap items-center gap-2', className)}
      {...props}
    >
      {Object.entries(REACTIONS).map(([key, emoji]) => {
        const count = reactions[key] || 0;
        const isActive = activeReactions.has(key);

        if (!showCounts && count === 0 && !isActive) return null;

        return (
          <ReactionCounter
            key={key}
            emoji={emoji}
            count={count}
            isActive={isActive}
            onToggle={() => handleToggle(key)}
            disabled={disabled}
            size={size}
          />
        );
      })}
    </div>
  );
}

export { REACTIONS };
