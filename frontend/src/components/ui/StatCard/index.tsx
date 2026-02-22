import React from 'react';
import './styles.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  className = '',
}) => {
  return (
    <div className={`stat-card stat-card-${color} ${className} animate-scale-in`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <div className="stat-card-icon">{icon}</div>}
      </div>
      <div className="stat-card-value">{value}</div>
      {trend && (
        <div className={`stat-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
          <span className="stat-card-trend-icon">
            {trend.isPositive ? '↑' : '↓'}
          </span>
          <span className="stat-card-trend-value">
            {Math.abs(trend.value)}%
          </span>
        </div>
      )}
    </div>
  );
};
