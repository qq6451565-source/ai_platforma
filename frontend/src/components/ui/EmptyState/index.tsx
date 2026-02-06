import React from 'react';
import './styles.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  illustration?: 'no-data' | 'no-results' | 'no-notifications' | 'no-connection' | 'custom';
}

const Illustrations: Record<string, React.ReactNode> = {
  'no-data': (
    <div className="empty-state-illustration no-data">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="55" stroke="url(#noDataGradient)" strokeWidth="2" fill="none" opacity="0.5"/>
        <rect x="35" y="35" width="50" height="50" rx="4" stroke="url(#noDataGradient)" strokeWidth="2" fill="none"/>
        <path d="M45 45h40M45 55h40M45 65h40M45 75h20" stroke="url(#noDataGradient)" strokeWidth="2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="noDataGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffff"/>
            <stop offset="100%" stopColor="#ff00ff"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  ),
  'no-results': (
    <div className="empty-state-illustration no-results">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="55" stroke="url(#noResultsGradient)" strokeWidth="2" fill="none" opacity="0.5"/>
        <circle cx="50" cy="50" r="20" stroke="url(#noResultsGradient)" strokeWidth="2" fill="none"/>
        <path d="M65 65l20 20" stroke="url(#noResultsGradient)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="42" y1="42" x2="58" y2="58" stroke="url(#noResultsGradient)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="58" y1="42" x2="42" y2="58" stroke="url(#noResultsGradient)" strokeWidth="2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="noResultsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffff"/>
            <stop offset="100%" stopColor="#ff00ff"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  ),
  'no-notifications': (
    <div className="empty-state-illustration no-notifications">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="55" stroke="url(#noNotifGradient)" strokeWidth="2" fill="none" opacity="0.5"/>
        <path d="M60 25c-19.3 0-35 15.7-35 35v5l-5 10v5h80v-5l-5-10v-5c0-19.3-15.7-35-35-35z" stroke="url(#noNotifGradient)" strokeWidth="2" fill="none"/>
        <path d="M50 80c0 5.5 4.5 10 10 10s10-4.5 10-10" stroke="url(#noNotifGradient)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="60" cy="50" r="3" fill="url(#noNotifGradient)"/>
        <defs>
          <linearGradient id="noNotifGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffff"/>
            <stop offset="100%" stopColor="#ff00ff"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  ),
  'no-connection': (
    <div className="empty-state-illustration no-connection">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="55" stroke="url(#noConnGradient)" strokeWidth="2" fill="none" opacity="0.5"/>
        <path d="M60 30v20M60 70v20M30 60h20M70 60h20M40 40l14 14M66 66l14 14M40 80l14-14M66 54l14-14" stroke="url(#noConnGradient)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="60" cy="60" r="5" fill="url(#noConnGradient)"/>
        <defs>
          <linearGradient id="noConnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ffff"/>
            <stop offset="100%" stopColor="#ff00ff"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  ),
  'custom': null,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No data found',
  description = 'There is no data to display at the moment.',
  action,
  className = '',
  illustration = 'no-data',
}) => {
  const displayIcon = icon || Illustrations[illustration];

  return (
    <div className={`empty-state ${className}`.trim()}>
      <div className="empty-state-illustration-wrapper animate-float">
        {displayIcon}
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
