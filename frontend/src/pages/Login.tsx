import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Typography, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { login } from "../api/auth";
import { fetchMe } from "../api/user";
import { clearTokens, saveTokens } from "../utils/token";
import { getDefaultRedirect } from "../utils/roleRedirect";
import { Button, Input, Card } from "../components/ui";

const LoginPage = () => {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      message.error("Iltimos barcha maydonlarni to'ldiring");
      return;
    }

    setLoading(true);
    try {
      const tokens = await login(formData);
      saveTokens(tokens.access, tokens.refresh);
      const me = await fetchMe();
      if (me.role === "admin") {
        clearTokens();
        message.error("Admin uchun alohida kirish sahifasidan foydalaning");
        return;
      }
      qc.setQueryData(["me", tokens.access], me);
      message.success("Muvaffaqiyatli kirdingiz");
      window.location.href = getDefaultRedirect(me.role);
    } catch (err: any) {
      clearTokens();
      message.error(err?.response?.data?.detail || "Login muvaffaqiyatsiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center h-screen bg-background p-4 animate-fade-in">
      <Card
        className="w-full"
        style={{ maxWidth: '420px' }}
        title="Kirish"
        extra={<Link to="/register" className="body-sm">Ro'yxatdan o'tish</Link>}
      >
        <form onSubmit={handleSubmit} className="d-flex flex-direction-column gap-4" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
          <Input
            label="Username"
            icon={<UserOutlined />}
            placeholder="username"
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <Input
            label="Parol"
            type="password"
            icon={<LockOutlined />}
            placeholder="••••••"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <Button
            type="submit"
            block
            isLoading={loading}
            size="lg"
            className="mt-2"
          >
            Kirish
          </Button>
          <div className="text-center mt-2">
            <Link to="/admin-login" className="caption">Admin sifatida kirish</Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
