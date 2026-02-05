import { MailOutlined, PhoneOutlined, IdcardOutlined, UserOutlined } from "@ant-design/icons";
import { Form, message, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";
import { Button, Input, Card } from "../components/ui";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    passport_front: UploadFile[];
    passport_back: UploadFile[];
    selfie_image: UploadFile[];
  }) => {
    setLoading(true);
    try {
      await register({
        ...values,
        passport_front: values.passport_front?.[0]?.originFileObj as File | undefined,
        passport_back: values.passport_back?.[0]?.originFileObj as File | undefined,
        selfie_image: values.selfie_image?.[0]?.originFileObj as File | undefined,
      });
      message.success("Ariza qabul qilindi. Admin tasdiqlashi kutilmoqda.");
      navigate("/login");
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Ro'yxatdan o'tish muvaffaqiyatsiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center bg-background p-4 animate-fade-in" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <Card
          className="w-full"
          title="Ro'yxatdan o'tish"
          extra={<Link to="/login" className="body-sm">Kirish</Link>}
        >
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label="Ism"
              name="first_name"
              rules={[{ required: true, message: "Ismni kiriting" }]}
            >
              <Input icon={<UserOutlined />} placeholder="Ismingiz" />
            </Form.Item>
            <Form.Item
              label="Familiya"
              name="last_name"
              rules={[{ required: true, message: "Familiyani kiriting" }]}
            >
              <Input icon={<UserOutlined />} placeholder="Familiyangiz" />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Email kiriting" },
                { type: "email", message: "Email noto'g'ri" },
              ]}
            >
              <Input icon={<MailOutlined />} placeholder="email@example.com" />
            </Form.Item>
            <Form.Item
              label="Telefon"
              name="phone"
              rules={[{ required: true, message: "Telefon raqamini kiriting" }]}
            >
              <Input icon={<PhoneOutlined />} placeholder="+998901234567" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <Form.Item
                label="Passport old tomoni"
                name="passport_front"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={[{ required: true, message: "Passport rasmini yuklang" }]}
              >
                <Upload accept="image/*" beforeUpload={() => false} maxCount={1}>
                  <Button variant="outline" icon={<IdcardOutlined />} block>Yuklash</Button>
                </Upload>
              </Form.Item>

              <Form.Item
                label="Passport orqa tomoni"
                name="passport_back"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={[{ required: true, message: "Passport orqa tomonini yuklang" }]}
              >
                <Upload accept="image/*" beforeUpload={() => false} maxCount={1}>
                  <Button variant="outline" icon={<IdcardOutlined />} block>Yuklash</Button>
                </Upload>
              </Form.Item>

              <Form.Item
                label="Selfie rasmi"
                name="selfie_image"
                valuePropName="fileList"
                getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                rules={[{ required: true, message: "Selfie rasmini yuklang" }]}
              >
                <Upload accept="image/*" beforeUpload={() => false} maxCount={1}>
                  <Button variant="outline" icon={<IdcardOutlined />} block>Yuklash</Button>
                </Upload>
              </Form.Item>
            </div>

            <Button
              type="submit"
              block
              isLoading={loading}
              size="lg"
            >
              Ro'yxatdan o'tish
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
