import React from 'react';
import './styles.css';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
  animated?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  striped = false,
  animated = false,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="progress-container">
      {(showLabel || label) && (
        <div className="progress-label">
          {label || `${Math.round(percentage)}%`}
        </div>
      )}
      <div className={`progress progress-${size} progress-${variant}`}>
        <div
          className={`progress-bar ${striped ? 'progress-striped' : ''} ${
            animated ? 'progress-animated' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
