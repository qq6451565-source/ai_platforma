import React, { useState } from 'react';
import './styles.css';

interface Tab {
  key: string;
  label: React.ReactNode;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  variant?: 'line' | 'card' | 'pill';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultActiveKey,
  onChange,
  variant = 'line',
}) => {
  const [activeKey, setActiveKey] = useState(defaultActiveKey || tabs[0]?.key);

  const handleTabClick = (key: string, disabled?: boolean) => {
    if (disabled) return;
    setActiveKey(key);
    onChange?.(key);
  };

  const activeTab = tabs.find((tab) => tab.key === activeKey);

  return (
    <div className="tabs-container">
      <div className={`tabs-header tabs-${variant}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeKey === tab.key ? 'active' : ''} ${
              tab.disabled ? 'disabled' : ''
            }`}
            onClick={() => handleTabClick(tab.key, tab.disabled)}
            disabled={tab.disabled}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
        {variant === 'line' && (
          <div
            className="tab-indicator"
            style={{
              transform: `translateX(${tabs.findIndex((t) => t.key === activeKey) * 100}%)`,
              width: `${100 / tabs.length}%`,
            }}
          />
        )}
      </div>
      <div className="tabs-content animate-fade-in">{activeTab?.children}</div>
    </div>
  );
};
