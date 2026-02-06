import { Avatar, Col, Form, Input, Row, Upload, Typography, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { updateProfile, changePassword } from "../../api/profile";
import { useMe } from "../../hooks/useMe";
import { Card, Button } from "../../components/ui";

const TeacherProfile = () => {
  const qc = useQueryClient();
  const { data: user } = useMe();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [file, setFile] = useState<File | undefined>(undefined);

  const [profileForm] = Form.useForm();
  const [passForm] = Form.useForm();

  const onSaveProfile = async (values: any) => {
    setLoadingProfile(true);
    try {
      await updateProfile({ ...values, face_image: file });
      message.success("Profil yangilandi");
      setFile(undefined);
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setLoadingProfile(false);
    }
  };

  const onChangePassword = async (values: any) => {
    setLoadingPass(true);
    try {
      await changePassword(values);
      message.success("Parol yangilandi");
      passForm.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Profil</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Profil ma'lumotlari" hasBeam>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <Avatar size={64} src={user?.face_image || undefined}>
                {user?.first_name?.[0]}
              </Avatar>
              <Upload
                beforeUpload={(f) => {
                  setFile(f);
                  return false;
                }}
                maxCount={1}
              >
                <Button variant="outline" size="sm">Yangi rasm</Button>
              </Upload>
            </div>
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{
                first_name: user?.first_name,
                last_name: user?.last_name,
                email: user?.email,
                phone: user?.phone,
              }}
              onFinish={onSaveProfile}
            >
              <Form.Item label="Ism" name="first_name">
                <Input />
              </Form.Item>
              <Form.Item label="Familiya" name="last_name">
                <Input />
              </Form.Item>
              <Form.Item label="Email" name="email">
                <Input type="email" />
              </Form.Item>
              <Form.Item label="Telefon" name="phone">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="submit" isLoading={loadingProfile}>Saqlash</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Parolni almashtirish" hasBeam>
            <Form form={passForm} layout="vertical" onFinish={onChangePassword}>
              <Form.Item
                label="Eski parol"
                name="old_password"
                rules={[{ required: true, message: "Eski parolni kiriting" }]}
              >
                <Input type="password" />
              </Form.Item>
              <Form.Item
                label="Yangi parol"
                name="new_password"
                rules={[{ required: true, message: "Yangi parolni kiriting", min: 6 }]}
              >
                <Input type="password" />
              </Form.Item>
              <Form.Item>
                <Button type="submit" isLoading={loadingPass}>Almashtirish</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherProfile;
