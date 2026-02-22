import React from 'react';
import './styles.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
}) => {
  return (
    <span
      className={`badge badge-${variant} badge-${size} ${dot ? 'badge-dot' : ''} ${
        pulse ? 'badge-pulse' : ''
      } ${className}`}
    >
      {children}
    </span>
  );
};
