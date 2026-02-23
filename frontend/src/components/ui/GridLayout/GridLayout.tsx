/**
 * ═══════════════════════════════════════════════════════════════
 * GRID LAYOUT / GRID JOYLASHTIRISH
 * Responsive grid layout komponenti
 * Responsive grid layout component
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import './GridLayout.css';

interface GridLayoutProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 6 | 'auto';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  minColumnWidth?: string;
  className?: string;
}

export const GridLayout: React.FC<GridLayoutProps> = ({
  children,
  columns = 'auto',
  gap = 'md',
  minColumnWidth = '280px',
  className = '',
}) => {
  const getGridTemplate = () => {
    if (columns === 'auto') {
      return `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))`;
    }
    return `repeat(${columns}, 1fr)`;
  };

  return (
    <div
      className={`grid-layout grid-gap-${gap} ${className}`}
      style={{
        gridTemplateColumns: getGridTemplate(),
      }}
    >
      {children}
    </div>
  );
};

export default GridLayout;
