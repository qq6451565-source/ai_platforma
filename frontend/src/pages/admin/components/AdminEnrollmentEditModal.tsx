import { Form, Input, Modal, Select } from "antd";

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentEditModal = ({ controller }: Props) => (
  <Modal
    title="Arizani tahrirlash"
    open={controller.editOpen}
    onCancel={controller.closeEdit}
    onOk={() => controller.editForm.submit()}
    confirmLoading={controller.updating}
    destroyOnClose
  >
    {controller.selectedApplicant ? (
      <Form layout="vertical" form={controller.editForm} onFinish={controller.submitEdit}>
        <Form.Item name="full_name" label="F.I.Sh" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Telefon">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input />
        </Form.Item>
        <Form.Item name="direction_choice" label="Yo'nalish">
          <Select
            allowClear
            options={controller.directions.map((direction) => ({ value: direction.id, label: direction.name }))}
            placeholder="Yo'nalish tanlang"
          />
        </Form.Item>
      </Form>
    ) : null}
  </Modal>
);

export default AdminEnrollmentEditModal;
