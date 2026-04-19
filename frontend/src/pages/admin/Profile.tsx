import { Avatar, Button, Card, Col, Form, Input, Row, Upload, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { updateProfile, changePassword } from "../../api/profile";
import { useMe } from "../../hooks/useMe";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import { getApiError } from "../../utils/getApiError";

const AdminProfile = () => {
  usePageTitle('nav.profile');
  const { t } = useTranslation();
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
      message.success(t('adminProfile.profileUpdated'));
      setFile(undefined);
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
    } finally {
      setLoadingProfile(false);
    }
  };

  const onChangePassword = async (values: any) => {
    setLoadingPass(true);
    try {
      await changePassword(values);
      message.success(t('adminProfile.passwordUpdated'));
      passForm.resetFields();
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div className="admin-page">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={t('adminProfile.profileInfo')}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}>
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
                <Button size="small">{t('adminProfile.newPhoto')}</Button>
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
              <Form.Item label={t('adminProfile.firstName')} name="first_name" rules={[{ required: true, message: t('profile.firstNameRequired') }]}>
                <Input />
              </Form.Item>
              <Form.Item label={t('adminProfile.lastName')} name="last_name" rules={[{ required: true, message: t('profile.lastNameRequired') }]}>
                <Input />
              </Form.Item>
              <Form.Item label={t('adminProfile.email')} name="email" rules={[{ type: 'email', message: t('profile.emailInvalid') }]}>
                <Input type="email" />
              </Form.Item>
              <Form.Item label={t('adminProfile.phone')} name="phone">
                <Input />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loadingProfile}>{t('common.save')}</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={t('adminProfile.changePassword')}>
            <Form form={passForm} layout="vertical" onFinish={onChangePassword}>
              <Form.Item
                label={t('adminProfile.oldPassword')}
                name="old_password"
                rules={[{ required: true, message: t('profile.oldPasswordRequired') }]}
              >
                <Input type="password" />
              </Form.Item>
              <Form.Item
                label={t('adminProfile.newPassword')}
                name="new_password"
                rules={[{ required: true, message: t('profile.newPasswordRequired') }, { min: 8, message: t('profile.newPasswordMin') }]}
              >
                <Input type="password" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loadingPass}>{t('adminProfile.changeButton')}</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminProfile;
