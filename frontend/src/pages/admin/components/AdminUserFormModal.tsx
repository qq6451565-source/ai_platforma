import { Form, Input, Modal, Select, Switch } from "antd";
import type { FormInstance } from "antd/es/form";

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
}: AdminUserFormModalProps) => (
  <Modal
    title={editing ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
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
        label="Parol"
        rules={editing ? [] : [{ required: true, message: "Parol kiriting" }]}
      >
        <Input.Password />
      </Form.Item>
      <Form.Item name="first_name" label="Ism">
        <Input />
      </Form.Item>
      <Form.Item name="last_name" label="Familiya">
        <Input />
      </Form.Item>
      <Form.Item name="email" label="Email">
        <Input />
      </Form.Item>
      <Form.Item name="phone" label="Telefon">
        <Input />
      </Form.Item>
      <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
        <Select
          options={[
            { value: "student", label: "Talaba" },
            { value: "teacher", label: "O'qituvchi" },
            { value: "admin", label: "Admin" },
          ]}
        />
      </Form.Item>
      <Form.Item name="is_active" label="Faol" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Form>
  </Modal>
);

export default AdminUserFormModal;
