import React, { useMemo, useState, useEffect } from 'react';
import { Avatar, Dropdown, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  HomeOutlined,
  RightOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import type { MenuProps } from 'antd';
import './HemisLayout.css';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  items: MenuProps['items'];
  onLogout: () => void;
  title: string;
}

/* ── helpers ───────────────────────────────────────────── */
const flatItems = (items: MenuProps['items']): any[] => {
  if (!items) return [];
  const flat: any[] = [];
  for (const item of items) {
    if (!item) continue;
    if ('children' in item && Array.isArray((item as any).children)) {
      flat.push(...(item as any).children);
    } else {
      flat.push(item);
    }
  }
  return flat;
};

export const ResponsiveLayout: React.FC<LayoutProps> = ({
  children,
  user,
  items,
  onLogout,
  title,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', String(collapsed)); } catch {}
  }, [collapsed]);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const selectedKey = location.pathname.startsWith('/app/')
    ? location.pathname.replace('/app/', '')
    : '';

  /* breadcrumb from route */
  const breadcrumb = useMemo(() => {
    const all = flatItems(items);
    const found = all.find((i) => i?.key === selectedKey);
    return found?.label || 'Dashboard';
  }, [items, selectedKey]);

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

  /* render sidebar nav items */
  const renderNavItems = (navItems: MenuProps['items'], onItemClick?: () => void) => {
    if (!navItems) return null;
    return navItems.map((item: any) => {
      if (!item) return null;
      if ('children' in item && Array.isArray(item.children)) {
        const groupLabel = (
          <div className="hemis-nav-group-label">
            {item.icon && <span className="hemis-nav-icon">{item.icon}</span>}
            {!collapsed && <span>{item.label}</span>}
          </div>
        );
        return (
          <div key={item.key} className="hemis-nav-group">
            {collapsed ? (
              <Tooltip title={item.label} placement="right">{groupLabel}</Tooltip>
            ) : groupLabel}
            {item.children.map((child: any) => {
              const childEl = (
                <NavLink
                  key={child.key}
                  to={`/app/${child.key}`}
                  className={({ isActive }) => `hemis-nav-item ${isActive ? 'active' : ''}`}
                  onClick={onItemClick}
                >
                  <span className="hemis-nav-icon">{child.icon}</span>
                  {!collapsed && <span className="hemis-nav-label">{child.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={child.key} title={child.label} placement="right">{childEl}</Tooltip>
              ) : childEl;
            })}
          </div>
        );
      }
      const navEl = (
        <NavLink
          key={item.key}
          to={`/app/${item.key}`}
          className={({ isActive }) => `hemis-nav-item ${isActive ? 'active' : ''}`}
          onClick={onItemClick}
        >
          <span className="hemis-nav-icon">{item.icon}</span>
          {!collapsed && <span className="hemis-nav-label">{item.label}</span>}
        </NavLink>
      );
      return collapsed ? (
        <Tooltip key={item.key} title={item.label} placement="right">{navEl}</Tooltip>
      ) : navEl;
    });
  };

  /* bottom nav items (mobile) — first 5 */
  const bottomItems = useMemo(() => flatItems(items).slice(0, 5), [items]);

  return (
    <div className={`hemis-layout ${collapsed ? 'hemis-collapsed' : ''}`}>
      {/* ── SIDEBAR (Desktop) ───────────────────────────── */}
      <aside className={`hemis-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="hemis-sidebar-header">
          {collapsed ? (
            <button type="button" className="hemis-collapse-btn hemis-collapse-center" onClick={() => setCollapsed(false)}>
              <MenuUnfoldOutlined />
            </button>
          ) : (
            <>
              <div className="hemis-logo" role="button" tabIndex={0} onClick={() => navigate(`/app/${user?.role}/dashboard`)}>
                <div className="hemis-logo-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="hemis-logo-text">
                  <span className="hemis-logo-title">HEMIS</span>
                  <span className="hemis-logo-subtitle">{title}</span>
                </div>
              </div>
              <button type="button" className="hemis-collapse-btn" onClick={() => setCollapsed(true)}>
                <MenuFoldOutlined />
              </button>
            </>
          )}
        </div>

        <nav className="hemis-sidebar-nav">
          {renderNavItems(items)}
        </nav>

        <div className="hemis-sidebar-footer">
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="topRight">
            <div className="hemis-user-card">
              <Avatar
                size={36}
                icon={<UserOutlined />}
                className="hemis-user-avatar"
              />
              {!collapsed && (
                <div className="hemis-user-info">
                  <span className="hemis-user-name">
                    {user?.first_name} {user?.last_name}
                  </span>
                  <span className="hemis-user-role">{title}</span>
                </div>
              )}
            </div>
          </Dropdown>
        </div>
      </aside>

      {/* ── MAIN AREA ───────────────────────────────────── */}
      <div className="hemis-main">
        {/* ── HEADER ─────────────────────────────────────── */}
        <header className="hemis-header">
          <div className="hemis-header-left">
            {/* Mobile hamburger */}
            <button type="button" className="hemis-mobile-toggle" onClick={() => setMobileOpen(true)}>
              <MenuOutlined />
            </button>
            <nav className="hemis-breadcrumb">
              <HomeOutlined className="hemis-breadcrumb-home" />
              <RightOutlined className="hemis-breadcrumb-sep" />
              <span className="hemis-breadcrumb-current">{breadcrumb}</span>
            </nav>
          </div>

          <div className="hemis-header-right">
            <LanguageSwitcher />
            <button type="button" className="hemis-notification-btn">
              <BellOutlined />
            </button>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <div className="hemis-header-user">
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  className="hemis-user-avatar"
                />
                <span className="hemis-header-username">
                  {user?.first_name || user?.username}
                </span>
              </div>
            </Dropdown>
          </div>
        </header>

        {/* ── CONTENT ────────────────────────────────────── */}
        <main className="hemis-content">
          {children}
        </main>
      </div>

      {/* ── MOBILE OVERLAY SIDEBAR ──────────────────────── */}
      {mobileOpen && (
        <div className="hemis-mobile-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="hemis-mobile-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="hemis-sidebar-header">
              <div className="hemis-logo" role="button" tabIndex={0} onClick={() => { navigate(`/app/${user?.role}/dashboard`); setMobileOpen(false); }}>
                <div className="hemis-logo-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="hemis-logo-text">
                  <span className="hemis-logo-title">HEMIS</span>
                  <span className="hemis-logo-subtitle">{title}</span>
                </div>
              </div>
              <button type="button" className="hemis-collapse-btn" onClick={() => setMobileOpen(false)}>
                <CloseOutlined />
              </button>
            </div>

            <nav className="hemis-sidebar-nav">
              {renderNavItems(items, () => setMobileOpen(false))}
            </nav>

            <div className="hemis-sidebar-footer">
              <button type="button" className="hemis-logout-btn" onClick={() => { onLogout(); setMobileOpen(false); }}>
                <LogoutOutlined />
                <span>{t('common.logout')}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── BOTTOM NAV (Mobile) ─────────────────────────── */}
      <nav className="hemis-bottom-nav">
        {bottomItems.map((item: any) => (
          <NavLink
            key={item.key}
            to={`/app/${item.key}`}
            className={({ isActive }) => `hemis-bottom-item ${isActive ? 'active' : ''}`}
          >
            <span className="hemis-bottom-icon">{item.icon}</span>
            <span className="hemis-bottom-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
