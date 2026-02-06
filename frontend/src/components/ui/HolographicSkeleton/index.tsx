import React from 'react';
import './styles.css';

interface HolographicSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: true;
}

export const HolographicSkeleton: React.FC<HolographicSkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  animation = true,
}) => {
  const baseClasses = ['holographic-shimmer-block'];
  
  if (animation) {
    baseClasses.push('animate-holographic-shimmer');
  }

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const variantClasses: Record<string, string> = {
    text: 'holographic-skeleton-text',
    circular: 'holographic-skeleton-circular',
    rectangular: 'holographic-skeleton-rectangular',
  };

  return (
    <div
      className={`${baseClasses.join(' ')} ${variantClasses[variant]} ${className}`.trim()}
      style={style}
    />
  );
};

interface HolographicCardSkeletonProps {
  className?: string;
}

export const HolographicCardSkeleton: React.FC<HolographicCardSkeletonProps> = ({
  className = '',
}) => {
  return (
    <div className={`holographic-card-skeleton ${className}`.trim()}>
      <div className="holographic-card-skeleton-header">
        <HolographicSkeleton variant="circular" width={40} height={40} />
        <div className="holographic-card-skeleton-header-text">
          <HolographicSkeleton variant="text" width="60%" height={16} />
          <HolographicSkeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <div className="holographic-card-skeleton-body">
        <HolographicSkeleton variant="rectangular" width="100%" height={150} />
        <div className="holographic-card-skeleton-content">
          <HolographicSkeleton variant="text" width="100%" height={16} />
          <HolographicSkeleton variant="text" width="80%" height={12} />
          <HolographicSkeleton variant="text" width="90%" height={12} />
        </div>
      </div>
    </div>
  );
};

interface HolographicTableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const HolographicTableSkeleton: React.FC<HolographicTableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => {
  return (
    <div className={`holographic-table-skeleton ${className}`.trim()}>
      <div className="holographic-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <HolographicSkeleton key={`header-${i}`} variant="text" height={20} />
        ))}
      </div>
      <div className="holographic-table-body">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="holographic-table-row">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <HolographicSkeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface HolographicListSkeletonProps {
  items?: number;
  className?: string;
}

export const HolographicListSkeleton: React.FC<HolographicListSkeletonProps> = ({
  items = 5,
  className = '',
}) => {
  return (
    <div className={`holographic-list-skeleton ${className}`.trim()}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="holographic-list-item">
          <HolographicSkeleton variant="circular" width={48} height={48} />
          <div className="holographic-list-item-content">
            <HolographicSkeleton variant="text" width="70%" height={16} />
            <HolographicSkeleton variant="text" width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
};
