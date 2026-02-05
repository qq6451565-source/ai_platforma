import React from 'react';
import { MobileNav } from '../MobileNav';
import { BottomNav } from './BottomNav';
import './MobileLayout.css';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  items: any[];
  onLogout: () => void;
  title: string;
}

export const MobileLayout: React.FC<LayoutProps> = ({
  children,
  user,
  items,
  onLogout,
  title,
}) => {
  return (
    <div className="mobile-layout">
      <MobileNav title={title} items={items} user={user} onLogout={onLogout} />
      <main className="mobile-content">
        {children}
      </main>
      <BottomNav items={items} />
    </div>
  );
};
