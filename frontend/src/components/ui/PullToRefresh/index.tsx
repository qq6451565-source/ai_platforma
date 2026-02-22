import React, { useRef, useState } from 'react';
import './styles.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxPullDistance = 80;
  const refreshThreshold = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      e.preventDefault();
      setIsPulling(true);
      setPullDistance(Math.min(distance, maxPullDistance));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= refreshThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(refreshThreshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  const progress = Math.min((pullDistance / refreshThreshold) * 100, 100);

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="pull-to-refresh-indicator"
        style={{
          transform: `translateY(${pullDistance}px)`,
          opacity: isPulling || isRefreshing ? 1 : 0,
        }}
      >
        <div
          className={`pull-to-refresh-spinner ${isRefreshing ? 'spinning' : ''}`}
          style={{
            transform: `rotate(${progress * 3.6}deg)`,
          }}
        >
          {isRefreshing ? '⟳' : '↓'}
        </div>
        <span className="pull-to-refresh-text">
          {isRefreshing
            ? 'Refreshing...'
            : pullDistance >= refreshThreshold
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </span>
      </div>
      <div
        className="pull-to-refresh-content"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
