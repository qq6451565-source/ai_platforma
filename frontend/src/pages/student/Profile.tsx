import { Alert, Avatar, Tabs, Form, Upload, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { updateProfile, changePassword } from "../../api/profile";
import { useMe } from "../../hooks/useMe";
import { Button, Input, Card } from "../../components/ui";

const StudentProfile = () => {
  const qc = useQueryClient();
  const { data: user } = useMe();

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [file, setFile] = useState<File | undefined>(undefined);

  const [profileForm] = Form.useForm();
  const [passForm] = Form.useForm();

  const isPendingStudent = user?.role === "student" && !user?.group;

  useEffect(() => {
    profileForm.setFieldsValue({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user, profileForm]);

  const profileStatusText = useMemo(() => {
    return isPendingStudent ? "Kutilmoqda" : "Faol";
  }, [isPendingStudent]);

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

  const items = [
    {
      key: "profile",
      label: "Shaxsiy ma'lumotlar",
      children: (
        <Card hasBeam>
          <div className="d-flex items-center mb-6 gap-4">
            <Avatar size={80} src={user?.face_image || undefined}>
              {user?.first_name?.[0] || user?.username?.[0] || "U"}
            </Avatar>
            <Upload
              beforeUpload={(f) => {
                setFile(f);
                return false;
              }}
              maxCount={1}
              showUploadList={false}
            >
              <Button variant="outline" size="sm">Rasm yuklash</Button>
            </Upload>
            {file && <span className="caption">{file.name}</span>}
          </div>

          <Form form={profileForm} layout="vertical" onFinish={onSaveProfile}>
            <div
              className="d-grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}
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
            </div>
            <div className="mt-4">
              <Button type="submit" isLoading={loadingProfile}>Saqlash</Button>
            </div>
          </Form>
        </Card>
      ),
    },
    {
      key: "security",
      label: "Xavfsizlik",
      children: (
        <div style={{ maxWidth: "500px", width: "100%" }}>
          <Card hasBeam>
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
              <div className="mt-4">
                <Button type="submit" isLoading={loadingPass}>Parolni yangilash</Button>
              </div>
            </Form>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <h1 className="mb-6">Profil sozlamalari</h1>

      {isPendingStudent && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Arizangiz qabul qilindi"
          description="Admin tasdiqlaguncha hisob kutish rejimida. Hozircha faqat profil sahifasi faol."
        />
      )}

      <Card hasBeam style={{ marginBottom: 16 }}>
        <div className="d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          <div><strong>Login:</strong> {user?.username || "-"}</div>
          <div><strong>Holat:</strong> {profileStatusText}</div>
          <div><strong>Rol:</strong> {user?.role || "-"}</div>
          <div><strong>Guruh:</strong> {user?.group ? String(user.group) : "Birikmagan"}</div>
        </div>
      </Card>

      <Tabs items={items} />
    </div>
  );
};

export default StudentProfile;
