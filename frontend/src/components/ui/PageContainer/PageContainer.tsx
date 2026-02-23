/**
 * ═══════════════════════════════════════════════════════════════
 * SAHIFA KONTEYNERI / PAGE CONTAINER
 * Barcha sahifalar uchun standart konteyner
 * Standard container for all pages
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import './PageContainer.css';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  noPadding?: boolean;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  actions,
  maxWidth = 'xl',
  noPadding = false,
  className = '',
}) => {
  return (
    <div className={`page-container ${className}`}>
      {/* Sahifa sarlavhasi / Page header */}
      {(title || actions) && (
        <div className="page-header">
          {title && (
            <div className="page-header-content">
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          )}
          {actions && <div className="page-header-actions">{actions}</div>}
        </div>
      )}

      {/* Asosiy kontent / Main content */}
      <div className={`page-content page-content-${maxWidth} ${noPadding ? 'no-padding' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
