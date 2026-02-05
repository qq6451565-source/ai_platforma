import React, { useState } from 'react';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { Button } from './ui';
import { Sidebar } from './Layout/Sidebar';
import './MobileNav.css';

interface MobileNavProps {
  title: string;
  items: any[];
  user: any;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ title, items, user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="mobile-header safe-area-top">
        <Button
          variant="ghost"
          icon={<MenuOutlined />}
          onClick={() => setIsOpen(true)}
          className="mobile-menu-toggle"
        />
        <div className="mobile-header-title">{title}</div>
        <div className="mobile-header-user">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
      </header>

      {isOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsOpen(false)}>
          <div className="mobile-sidebar-container" onClick={e => e.stopPropagation()}>
            <div className="mobile-sidebar-header">
              <div className="h4 m-0">Menu</div>
              <Button variant="ghost" icon={<CloseOutlined />} onClick={() => setIsOpen(false)} />
            </div>
            <Sidebar items={items} onItemClick={() => setIsOpen(false)} />
            <div className="mobile-sidebar-footer">
              <Button variant="outline" block onClick={onLogout}>
                Chiqish
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
