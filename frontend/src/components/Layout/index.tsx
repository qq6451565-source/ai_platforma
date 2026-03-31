import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  items: any[];
  onLogout: () => void;
  title: string;
}

function buildMenuItems(groups: any[]): MenuProps['items'] {
  return groups.map((group, idx) => ({
    key: `group-${idx}`,
    label: group.label,
    type: 'group' as const,
    children: group.children.map((item: any) => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    })),
  }));
}

export const ResponsiveLayout: React.FC<LayoutProps> = ({
  children,
  user,
  items,
  onLogout,
  title,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const selectedKey = location.pathname.startsWith('/app/')
    ? location.pathname.replace('/app/', '')
    : '';

  const menuItems = buildMenuItems(items);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('nav.profile'),
      onClick: () => navigate(`/app/${user?.role}/profile`),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('common.logout'),
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 16px',
          fontWeight: 700,
          fontSize: collapsed ? 18 : 16,
          color: token.colorPrimary,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          letterSpacing: '0.02em',
        }}>
          {collapsed ? 'U' : 'University LMS'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ border: 'none', marginTop: 8 }}
          onClick={({ key }) => navigate(`/app/${key}`)}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <span style={{ fontWeight: 600, fontSize: 15, color: token.colorText }}>
              {title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LanguageSwitcher />
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
                <span style={{ fontSize: 14, color: token.colorText }}>
                  {user?.first_name || user?.username}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ padding: 24, overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
