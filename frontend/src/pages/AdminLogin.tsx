import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login } from "../api/auth";
import { saveTokens, clearTokens } from "../utils/token";
import { fetchMe } from "../api/user";
import { Button, Input, Card } from "../components/ui";

const AdminLoginPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tokens = await login(formData);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center h-screen bg-background p-4 animate-fade-in">
      <div style={{ maxWidth: "420px", width: "100%" }}>
        <Card
          className="w-full"
          title={t("adminLogin.title")}
          extra={<Link to="/login" className="body-sm">{t("adminLogin.backToUserLogin")}</Link>}
        >
          <form onSubmit={handleSubmit} className="d-flex flex-direction-column" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Input
              label={t("auth.username")}
              icon={<UserOutlined />}
              placeholder={t("adminLogin.usernamePlaceholder")}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Input
              label={t("auth.password")}
              type="password"
              icon={<LockOutlined />}
              placeholder="********"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Button
              type="submit"
              block
              isLoading={loading}
              size="lg"
              className="mt-2"
            >
              {t("adminLogin.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminLoginPage;
