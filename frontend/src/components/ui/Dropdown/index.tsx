import React, { useState, useRef, useEffect } from 'react';
import './styles.css';

interface DropdownItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

interface DropdownProps {
  items: DropdownItem[];
  children: React.ReactNode;
  trigger?: 'click' | 'hover';
  placement?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export const Dropdown: React.FC<DropdownProps> = ({
  items,
  children,
  trigger = 'click',
  placement = 'bottom-left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTrigger = () => {
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false);
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    setIsOpen(false);
  };

  return (
    <div
      className="dropdown"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="dropdown-trigger" onClick={handleTrigger}>
        {children}
      </div>
      {isOpen && (
        <div className={`dropdown-menu dropdown-${placement} animate-scale-in`}>
          {items.map((item) =>
            item.divider ? (
              <div key={item.key} className="dropdown-divider" />
            ) : (
              <button
                key={item.key}
                className={`dropdown-item ${item.danger ? 'dropdown-item-danger' : ''} ${
                  item.disabled ? 'dropdown-item-disabled' : ''
                }`}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
                <span className="dropdown-item-label">{item.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
