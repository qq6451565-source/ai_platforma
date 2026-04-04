import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../hooks/usePageTitle";
import { login } from "../api/auth";
import { saveTokens, clearTokens } from "../utils/token";
import { fetchMe } from "../api/user";

const AdminLoginPage = () => {
  const { t } = useTranslation();
  usePageTitle('adminLogin.title');
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const handleFinish = async (values: { username: string; password: string }) => {
    try {
      const tokens = await login(values);
      saveTokens(tokens.access, tokens.refresh);
      const me = await fetchMe();
      if (me.role !== "admin") {
        clearTokens();
        message.error(t("adminLogin.onlyAdmin"));
        return;
      }
      qc.setQueryData(["me", tokens.access], me);
      message.success(t("adminLogin.success"));
      window.location.href = "/app/admin/dashboard";
    } catch (err: any) {
      clearTokens();
      message.error(err?.response?.data?.detail || t("adminLogin.failed"));
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "var(--bg-elevated-3)" }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <Card
          title={<Typography.Title level={4} style={{ margin: 0 }}>{t("adminLogin.title")}</Typography.Title>}
          extra={<Link to="/login">{t("adminLogin.backToUserLogin")}</Link>}
        >
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item
              name="username"
              label={t("auth.username")}
              rules={[{ required: true }]}
            >
              <Input prefix={<UserOutlined />} placeholder={t("adminLogin.usernamePlaceholder")} size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              label={t("auth.password")}
              rules={[{ required: true }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="********" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 'var(--space-2)' }}>
              <Button type="primary" htmlType="submit" block size="large">
                {t("adminLogin.submit")}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default AdminLoginPage;
