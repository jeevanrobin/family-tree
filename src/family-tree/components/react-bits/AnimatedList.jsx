/**
 * AnimatedList Component (React Bits Inspired)
 * Staggered entrance animation for search results and relationship lists.
 */

import React from 'react';

export default function AnimatedList({
  children,
  stagger = 35,
  className = '',
  ...props
}) {
  const items = React.Children.toArray(children);

  return (
    <div className={`rb-animated-list ${className}`} {...props}>
      {items.map((child, index) => (
        <div
          key={child.key || index}
          className="rb-animated-item"
          style={{
            animationDelay: `${index * stagger}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
