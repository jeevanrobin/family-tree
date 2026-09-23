import React, { useState, useRef, useEffect } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react';
import { cn } from '../../lib/utils.js';
import './rareUi.css';

export default function DeleteButton({
  onConfirm,
  onCancel,
  title = 'Delete item',
  confirmTitle = 'Confirm delete',
  cancelTitle = 'Cancel',
  size = 32,
  className,
  ...props
}) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close confirmation if clicked outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        onCancel?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onCancel]);

  const handleConfirmClick = (e) => {
    e.stopPropagation();
    setOpen(false);
    onConfirm?.();
  };

  const handleCancelClick = (e) => {
    e.stopPropagation();
    setOpen(false);
    onCancel?.();
  };

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      data-slot="delete-button"
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.button
            key="trash-trigger"
            type="button"
            className="ft-delete-btn-tile"
            onClick={handleTriggerClick}
            title={title}
            aria-label={title}
            style={{ width: size, height: size }}
            whileHover={reduced ? undefined : { scale: 1.08 }}
            whileTap={reduced ? undefined : { scale: 0.92 }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </motion.button>
        ) : (
          <motion.div
            key="confirm-panel"
            className="ft-delete-btn-panel"
            initial={{ opacity: 0, scale: 0.85, x: 4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 4 }}
            transition={{ duration: 0.16 }}
          >
            <button
              type="button"
              className="ft-delete-btn-circle ft-delete-btn-circle--confirm"
              onClick={handleConfirmClick}
              title={confirmTitle}
              aria-label={confirmTitle}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              type="button"
              className="ft-delete-btn-circle ft-delete-btn-circle--cancel"
              onClick={handleCancelClick}
              title={cancelTitle}
              aria-label={cancelTitle}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
