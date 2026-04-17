import { LockOutlined, UserOutlined, BookOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../hooks/usePageTitle";
import { login } from "../api/auth";
import { fetchMe } from "../api/user";
import { clearTokens, saveTokens } from "../utils/token";
import { getApiError } from "../utils/getApiError";
import { getDefaultRedirect } from "../utils/roleRedirect";
import "./Login.css";

const LoginPage = () => {
  const { t } = useTranslation();
  usePageTitle('auth.login');
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const handleFinish = async (values: { username: string; password: string }) => {
    try {
      const tokens = await login(values);
      saveTokens(tokens.access, tokens.refresh);
      const me = await fetchMe();
      if (me.role === "admin") {
        clearTokens();
        message.error(t("auth.adminSeparateLogin"));
        return;
      }
      qc.setQueryData(["me", tokens.access], me);
      message.success(t("auth.loginSuccess"));
      window.location.href = getDefaultRedirect(me.role, me.role === "student" && !me.group);
    } catch (err: unknown) {
      clearTokens();
      message.error(getApiError(err, t("auth.loginError")));
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* ── Brand ── */}
        <div className="login-brand">
          <div className="login-logo">
            <BookOutlined />
          </div>
          <h1 className="login-brand-title">LMS Platform</h1>
          <p className="login-brand-subtitle">{t("auth.brandSubtitle", "O'quv boshqaruv tizimi")}</p>
        </div>

        {/* ── Card ── */}
        <Card className="login-card" bordered={false}>
          <p className="login-form-title">{t("common.login")}</p>
          <p className="login-form-subtitle">{t("auth.loginSubtitle", "Hisobingizga kiring")}</p>

          <Form form={form} layout="vertical" onFinish={handleFinish} size="large">
            <Form.Item
              name="username"
              label={t("auth.username")}
              rules={[{ required: true, message: t("auth.usernameRequired") }]}
            >
              <Input prefix={<UserOutlined />} placeholder={t("auth.usernamePlaceholder")} autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="password"
              label={t("auth.password")}
              rules={[{ required: true, message: t("auth.passwordRequired") }]}
              style={{ marginBottom: 'var(--space-5)' }}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block size="large">
              {t("common.login")}
            </Button>
          </Form>

          <hr className="login-divider" />

          <div className="login-footer">
            <Link to="/admin-login" className="login-footer-link">
              {t("auth.adminLogin")}
            </Link>
            <Link to="/register" className="login-register-link">
              {t("register.title")} →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
