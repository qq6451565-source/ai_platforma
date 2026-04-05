import { Form, Input, Modal, Select, Switch } from "antd";
import type { FormInstance } from "antd/es/form";
import { useTranslation } from 'react-i18next';

import type { AdminUser } from "../../../api/admin";

type AdminUserFormModalProps = {
  editing: AdminUser | null;
  form: FormInstance;
  loading: boolean;
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
};

const AdminUserFormModal = ({
  editing,
  form,
  loading,
  open,
  onCancel,
  onSubmit,
}: AdminUserFormModalProps) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={editing ? t('adminUserForm.editTitle') : t('adminUserForm.createTitle')}
    open={open}
    onCancel={onCancel}
    onOk={() => form.submit()}
    confirmLoading={loading}
    destroyOnClose
  >
    <Form layout="vertical" form={form} onFinish={onSubmit}>
      <Form.Item name="username" label="Username" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item
        name="password"
        label={t('adminUserForm.password')}
        rules={editing ? [] : [{ required: true, message: t('adminUserForm.passwordRequired') }]}
      >
        <Input.Password />
      </Form.Item>
      <Form.Item name="first_name" label={t('form.firstName')}>
        <Input />
      </Form.Item>
      <Form.Item name="last_name" label={t('form.lastName')}>
        <Input />
      </Form.Item>
      <Form.Item name="email" label={t('form.email')}>
        <Input />
      </Form.Item>
      <Form.Item name="phone" label={t('form.phone')}>
        <Input />
      </Form.Item>
      <Form.Item name="role" label={t('form.role')} rules={[{ required: true }]}>
        <Select
          options={[
            { value: "student", label: t('form.student') },
            { value: "teacher", label: t('form.teacher') },
            { value: "admin", label: t('form.admin') },
          ]}
        />
      </Form.Item>
      <Form.Item name="is_active" label={t('adminUserForm.active')} valuePropName="checked">
        <Switch />
      </Form.Item>
    </Form>
  </Modal>
  );
};

export default AdminUserFormModal;
