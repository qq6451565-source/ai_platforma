import React, { useEffect, useRef, useState } from 'react';
import './styles.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // percentage heights
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [90, 50],
}) => {
  const [currentSnap, setCurrentSnap] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!sheetRef.current) return;
    
    const deltaY = e.changedTouches[0].clientY - startY;
    sheetRef.current.style.transform = '';
    
    if (deltaY > 100) {
      if (currentSnap < snapPoints.length - 1) {
        setCurrentSnap(currentSnap + 1);
      } else {
        onClose();
      }
    } else if (deltaY < -100 && currentSnap > 0) {
      setCurrentSnap(currentSnap - 1);
    }
    
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div
        ref={sheetRef}
        className="bottom-sheet animate-slide-up"
        style={{ height: `${snapPoints[currentSnap]}%` }}
      >
        <div
          className="bottom-sheet-handle-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bottom-sheet-handle" />
        </div>
        {title && (
          <div className="bottom-sheet-header">
            <h3 className="bottom-sheet-title">{title}</h3>
            <button type="button" className="bottom-sheet-close" onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </>
  );
};
