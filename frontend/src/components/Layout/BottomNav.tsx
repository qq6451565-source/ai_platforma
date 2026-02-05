import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

interface BottomNavProps {
  items: any[];
}

export const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  // We only show top-level items or first few children for bottom nav
  const navItems = items.flatMap(group => group.children).slice(0, 5);

  return (
    <nav className="bottom-nav safe-area-bottom">
      {navItems.map((item: any) => (
        <NavLink
          key={item.key}
          to={`/app/${item.key}`}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
