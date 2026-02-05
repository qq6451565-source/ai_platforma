import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { login } from "../api/auth";
import { saveTokens, clearTokens } from "../utils/token";
import { fetchMe } from "../api/user";
import { Button, Input, Card } from "../components/ui";

const AdminLoginPage = () => {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tokens = await login(formData);
      saveTokens(tokens.access, tokens.refresh);
      const me = await fetchMe();
      if (me.role !== "admin") {
        clearTokens();
        message.error("Faqat admin uchun");
        return;
      }
      qc.setQueryData(["me", tokens.access], me);
      message.success("Admin sifatida kirdingiz");
      window.location.href = "/app/admin/dashboard";
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
        title="Admin tizimi"
        extra={<Link to="/login" className="body-sm">Oddiy kirish</Link>}
      >
        <form onSubmit={handleSubmit} className="d-flex flex-direction-column" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Username"
            icon={<UserOutlined />}
            placeholder="admin_username"
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
            Admin bo'lib kirish
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
