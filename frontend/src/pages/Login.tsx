import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login } from "../api/auth";
import { fetchMe } from "../api/user";
import { clearTokens, saveTokens } from "../utils/token";
import { getDefaultRedirect } from "../utils/roleRedirect";
import { Button, Input, Card } from "../components/ui";

const LoginPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      message.error(t("auth.loginError"));
      return;
    }

    setLoading(true);
    try {
      const tokens = await login(formData);
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
    } finally {
      setLoading(false);
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
        background:
          "radial-gradient(ellipse at 30% 10%, rgba(0,255,255,0.07) 0%, transparent 55%), radial-gradient(ellipse at 70% 90%, rgba(255,0,255,0.07) 0%, transparent 50%), var(--color-background)",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <Card
          title={t("common.login")}
          extra={
            <Link to="/register" className="body-sm">
              {t("register.title")}
            </Link>
          }
          hasBeam
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <Input
              label="Username"
              icon={<UserOutlined />}
              placeholder="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Input
              label={t("auth.password")}
              type="password"
              icon={<LockOutlined />}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <Button
              type="submit"
              block
              isLoading={loading}
              size="lg"
              style={{ marginTop: "0.25rem" }}
            >
              {t("common.login")}
            </Button>
            <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
              <Link to="/admin-login" className="caption" style={{ opacity: 0.6 }}>
                {t("auth.adminLogin")}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
