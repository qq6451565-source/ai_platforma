import React from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '../ui';
import { Popconfirm } from 'antd';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className="desktop-layout">
      <header className="desktop-header">
        <div className="desktop-header-left">
          <div className="logo">LMS</div>
          <div className="page-title-header">{title}</div>
        </div>
        <div className="desktop-header-right">
          <LanguageSwitcher />
          <div className="user-info">
            <span className="user-name">{user?.first_name} {user?.last_name}</span>
            <span className="user-role">({user?.role})</span>
          </div>
          <Popconfirm
            title={t('auth.logoutConfirm')}
            onConfirm={onLogout}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button variant="outline" size="sm">{t('common.logout')}</Button>
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
