import React from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '../ui';
import { Dropdown, Avatar, Menu, Space } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  DownOutlined
} from '@ant-design/icons';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const profileMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('nav.profile'),
      onClick: () => navigate(`/app/${user?.role}/profile`),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('nav.settings'),
      onClick: () => navigate(`/app/${user?.role}/settings`),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <div className="desktop-layout">
      <header className="desktop-header">
        <div className="desktop-header-left">
          <div className="logo">LMS</div>
          <div className="page-title-header">{title}</div>
        </div>
        <div className="desktop-header-right">
          <LanguageSwitcher />
          
          <Dropdown menu={{ items: profileMenuItems }} trigger={['click']} placement="bottomRight">
            <div className="user-profile-trigger">
              <div className="user-info">
                <span className="user-name">{user?.first_name} {user?.last_name}</span>
                <span className="user-role">({user?.role})</span>
              </div>
              <Avatar 
                icon={<UserOutlined />} 
                style={{ backgroundColor: 'var(--neon-cyan)', color: 'var(--color-background)' }}
              />
              <DownOutlined style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }} />
            </div>
          </Dropdown>
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
