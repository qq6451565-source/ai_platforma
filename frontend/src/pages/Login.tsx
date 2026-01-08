import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Typography, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { login } from "../api/auth";
import { fetchMe } from "../api/user";
import { clearTokens, saveTokens } from "../utils/token";
import { getDefaultRedirect } from "../utils/roleRedirect";

const LoginPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const tokens = await login(values);
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
    <AuthLayout
      title="Foydalanuchi"
      extra={
        <Typography.Text>
          Yangi hisob? <Link to="/register">Ro'yxatdan o'tish</Link>
        </Typography.Text>
      }
    >
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "Username kiriting" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="username" />
        </Form.Item>
        <Form.Item
          label="Parol"
          name="password"
          rules={[{ required: true, message: "Parol kiriting" }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Kirish
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
};

export default LoginPage;
