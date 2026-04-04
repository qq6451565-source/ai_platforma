import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Space, Typography } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../hooks/usePageTitle";
import { login } from "../api/auth";
import { fetchMe } from "../api/user";
import { clearTokens, saveTokens } from "../utils/token";
import { getDefaultRedirect } from "../utils/roleRedirect";

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
    } catch (err: any) {
      clearTokens();
      message.error(err?.response?.data?.detail || t("auth.loginError"));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "var(--bg-elevated-3)",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <Card
          title={<Typography.Title level={4} style={{ margin: 0 }}>{t("common.login")}</Typography.Title>}
          extra={<Link to="/register">{t("register.title")}</Link>}
        >
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item
              name="username"
              label={t("auth.username")}
              rules={[{ required: true, message: t("auth.usernameRequired") }]}
            >
              <Input prefix={<UserOutlined />} placeholder={t("auth.usernamePlaceholder")} size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              label={t("auth.password")}
              rules={[{ required: true, message: t("auth.passwordRequired") }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="********" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 'var(--space-2)' }}>
              <Button type="primary" htmlType="submit" block size="large">
                {t("common.login")}
              </Button>
            </Form.Item>
            <div style={{ textAlign: "center" }}>
              <Link to="/admin-login"><Typography.Text type="secondary">{t("auth.adminLogin")}</Typography.Text></Link>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
