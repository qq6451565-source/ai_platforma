import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';

interface SidebarProps {
  items: any[];
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, onItemClick }) => {
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {items.map((group, idx) => (
          <div key={idx} className="sidebar-group">
            {group.label && <div className="sidebar-group-label">{group.label}</div>}
            <nav className="sidebar-nav">
              {group.children.map((item: any) => (
                <NavLink
                  key={item.key}
                  to={`/app/${item.key}`}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onItemClick}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-text">{t(`nav.${item.key}`)}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};
