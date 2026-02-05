import React from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '../ui';
import { Popconfirm } from 'antd';
import './DesktopLayout.css';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  items: any[];
  onLogout: () => void;
  title: string;
}

export const DesktopLayout: React.FC<LayoutProps> = ({
  children,
  user,
  items,
  onLogout,
  title,
}) => {
  return (
    <div className="desktop-layout">
      <header className="desktop-header">
        <div className="desktop-header-left">
          <div className="logo">LMS</div>
          <div className="page-title-header">{title}</div>
        </div>
        <div className="desktop-header-right">
          <div className="user-info">
            <span className="user-name">{user?.first_name} {user?.last_name}</span>
            <span className="user-role">({user?.role})</span>
          </div>
          <Popconfirm
            title="Chiqishni tasdiqlaysizmi?"
            onConfirm={onLogout}
            okText="Ha"
            cancelText="Yo'q"
          >
            <Button variant="outline" size="sm">Chiqish</Button>
          </Popconfirm>
        </div>
      </header>
      <div className="desktop-container">
        <Sidebar items={items} />
        <main className="desktop-content">
          {children}
        </main>
      </div>
    </div>
  );
};
