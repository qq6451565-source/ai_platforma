/**
 * ═══════════════════════════════════════════════════════════════
 * SEKTSIYA KARTASI / SECTION CARD
 * Sahifa bo'limlari uchun standart karta
 * Standard card for page sections
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { Card } from '../Card';
import './SectionCard.css';

interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  loading?: boolean;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  children,
  title,
  subtitle,
  icon,
  actions,
  noPadding = false,
  loading = false,
  className = '',
  hoverable = false,
  onClick,
}) => {
  return (
    <Card
      className={`section-card ${className}`}
      hoverable={hoverable}
      onClick={onClick}
      hasBeam={hoverable}
    >
      {/* Karta sarlavhasi / Card header */}
      {(title || icon || actions) && (
        <div className="section-card-header">
          <div className="section-card-header-content">
            {icon && <div className="section-card-icon">{icon}</div>}
            <div className="section-card-title-wrapper">
              {title && <h3 className="section-card-title">{title}</h3>}
              {subtitle && <p className="section-card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="section-card-actions">{actions}</div>}
        </div>
      )}

      {/* Karta tanasi / Card body */}
      <div className={`section-card-body ${noPadding ? 'no-padding' : ''} ${loading ? 'loading' : ''}`}>
        {children}
      </div>
    </Card>
  );
};

export default SectionCard;
