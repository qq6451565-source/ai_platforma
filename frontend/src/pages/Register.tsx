import { MailOutlined, PhoneOutlined, IdcardOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Typography, message, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { register } from "../api/auth";
import { saveTokens } from "../utils/token";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    passport_image: UploadFile[];
    selfie_image: UploadFile[];
  }) => {
    setLoading(true);
    try {
      const tokens = await register({
        ...values,
        passport_image: values.passport_image?.[0]?.originFileObj as File | undefined,
        selfie_image: values.selfie_image?.[0]?.originFileObj as File | undefined,
      });
      saveTokens(tokens.access, tokens.refresh);
      message.success("Ro'yxatdan o'tdingiz");
      navigate("/app");
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Ro'yxatdan o'tish muvaffaqiyatsiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Ro'yxatdan o'tish"
      extra={
        <Typography.Text>
          Hisob bor? <Link to="/login">Kirish</Link>
        </Typography.Text>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          label="Ism"
          name="first_name"
          rules={[{ required: true, message: "Ismni kiriting" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Ismingiz" />
        </Form.Item>
        <Form.Item
          label="Familiya"
          name="last_name"
          rules={[{ required: true, message: "Familiyani kiriting" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Familiyangiz" />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Email kiriting" },
            { type: "email", message: "Email noto'g'ri" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="email@example.com" />
        </Form.Item>
        <Form.Item
          label="Telefon"
          name="phone"
          rules={[{ required: true, message: "Telefon raqamini kiriting" }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="+998901234567" />
        </Form.Item>
        <Form.Item
          label="Passport surati"
          name="passport_image"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          rules={[{ required: true, message: "Passport rasmini yuklang" }]}
        >
          <Upload accept="image/*" beforeUpload={() => false} maxCount={1}>
            <Button icon={<IdcardOutlined />}>Passport rasmini yuklash</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          label="Selfie / yuz rasmlari"
          name="selfie_image"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          rules={[{ required: true, message: "Selfie rasmini yuklang" }]}
        >
          <Upload accept="image/*" beforeUpload={() => false} maxCount={1}>
            <Button icon={<IdcardOutlined />}>Selfie yuklash</Button>
          </Upload>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            disabled={
              !form.isFieldsTouched(true) ||
              form.getFieldsError().some(({ errors }) => errors.length)
            }
          >
            Ro'yxatdan o'tish
          </Button>
        </Form.Item>
      </Form>
    </AuthLayout>
  );
};

export default RegisterPage;
