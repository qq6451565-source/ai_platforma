import React, { useMemo, useState, useEffect } from 'react';
import { Avatar, Dropdown, Tooltip, Modal, Form, Input, Upload, message, Divider } from 'antd';
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
  CameraOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import LanguageSwitcher from '../LanguageSwitcher';
import type { MenuProps } from 'antd';
import { updateProfile, changePassword } from '../../api/profile';
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();

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
      onClick: () => {
        form.setFieldsValue({
          first_name: user?.first_name,
          last_name: user?.last_name,
          email: user?.email,
          phone: user?.phone,
        });
        setAvatarPreview(null);
        setAvatarFile(null);
        setProfileOpen(true);
      },
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

  const isAdmin = user?.role === 'admin';

  const handleProfileSave = async () => {
    try {
      const values = await form.validateFields(['old_password', 'new_password', 'confirm_password']);
      setProfileLoading(true);

      // Save profile info (admin only) or just avatar
      const profilePayload: any = {};
      if (isAdmin) {
        const fields = form.getFieldsValue(['first_name', 'last_name', 'email', 'phone']);
        Object.assign(profilePayload, fields);
      }
      if (avatarFile) profilePayload.face_image = avatarFile;

      if (Object.keys(profilePayload).length > 0) {
        await updateProfile(profilePayload);
        await qc.invalidateQueries({ queryKey: ['me'] });
      }

      // Change password if filled
      if (values.old_password && values.new_password) {
        if (values.new_password !== values.confirm_password) {
          message.error(t('profile.confirmPasswordMismatch'));
          setProfileLoading(false);
          return;
        }
        await changePassword({ old_password: values.old_password, new_password: values.new_password });
        form.resetFields(['old_password', 'new_password', 'confirm_password']);
        message.success(t('profile.passwordUpdated'));
      } else {
        message.success(t('profile.updated'));
      }

      setProfileOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.old_password?.[0]
        || err?.response?.data?.detail
        || err?.response?.data?.non_field_errors?.[0]
        || t('profile.updateError');
      message.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  /* render sidebar nav items */
  const renderNavItems = (navItems: MenuProps['items'], onItemClick?: () => void) => {
    if (!navItems) return null;
    return navItems.map((item: any) => {
      if (!item) return null;
      if ('children' in item && Array.isArray(item.children)) {
        return (
          <div key={item.key} className="hemis-nav-group">
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
                <span className="hemis-logo-title">MTP</span>
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
                  src={user?.face_image || undefined}
                  icon={<UserOutlined />}
                  className="hemis-user-avatar"
                />
                <span className="hemis-header-username">
                  {user?.first_name && user?.last_name && user.first_name !== user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.first_name || user?.username}
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

      {/* ── PROFILE MODAL ───────────────────────────────── */}
      <Modal
        open={profileOpen}
        title={t('nav.profile')}
        onCancel={() => setProfileOpen(false)}
        onOk={handleProfileSave}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={profileLoading}
        width={440}
        centered
      >
        {/* Avatar upload */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              setAvatarFile(file);
              setAvatarPreview(URL.createObjectURL(file));
              return false; // prevent auto-upload
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}>
              <Avatar
                size={80}
                src={avatarPreview || user?.face_image || undefined}
                icon={<UserOutlined />}
                style={{ border: '3px solid var(--accent)' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 12,
                }}
              >
                <CameraOutlined />
              </div>
            </div>
          </Upload>
          <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
            {t('profile.clickToChangeAvatar')}
          </div>
        </div>

        <Form form={form} layout="vertical">
          {/* Profile info — admin only */}
          <Form.Item name="first_name" label={t('profile.firstName')}>
            <Input disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="last_name" label={t('profile.lastName')}>
            <Input disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="email" label={t('profile.email')}>
            <Input type="email" disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="phone" label={t('profile.phone')}>
            <Input disabled={!isAdmin} />
          </Form.Item>

          {/* Password change — all roles */}
          <Divider style={{ margin: '12px 0' }}>
            <LockOutlined style={{ marginRight: 6 }} />
            {t('profile.changePassword')}
          </Divider>
          <Form.Item name="old_password" label={t('profile.oldPassword')}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="new_password" label={t('profile.newPassword')}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="confirm_password" label={t('profile.confirmPassword')}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
