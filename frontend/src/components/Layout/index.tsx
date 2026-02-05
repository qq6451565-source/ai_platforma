import React from 'react';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import { DesktopLayout } from './DesktopLayout';
import { MobileLayout } from './MobileLayout';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  items: any[];
  onLogout: () => void;
  title: string;
}

export const ResponsiveLayout: React.FC<LayoutProps> = ({
  children,
  user,
  items,
  onLogout,
  title,
}) => {
  const { isMobile } = useMobileDetect();

  if (isMobile) {
    return (
      <MobileLayout user={user} items={items} onLogout={onLogout} title={title}>
        {children}
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout user={user} items={items} onLogout={onLogout} title={title}>
      {children}
    </DesktopLayout>
  );
};
