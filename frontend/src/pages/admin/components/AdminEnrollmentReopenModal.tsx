import { Alert, Form, Input, Modal } from "antd";

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentReopenModal = ({ controller }: Props) => (
  <Modal
    title="Arizani qayta ochish"
    open={controller.reopenOpen}
    onCancel={controller.closeReopen}
    onOk={() => controller.reopenForm.submit()}
    confirmLoading={controller.reopening}
    destroyOnClose
  >
    {controller.selectedApplicant ? (
      <Form layout="vertical" form={controller.reopenForm} onFinish={controller.submitReopen}>
        <Alert
          type="info"
          showIcon
          message="Ariza qayta review bosqichiga o'tadi"
          description="Holat pending bo'ladi. Shundan keyin admin arizani tahrirlashi, AI qayta tekshirishi yoki qayta tasdiqlashi mumkin."
          style={{ marginBottom: 'var(--space-3)' }}
        />
        <Form.Item
          name="reopen_reason"
          label="Qayta ochish sababi"
          rules={[{ required: true, message: "Qayta ochish sababini yozing" }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Masalan: foydalanuvchi yangi selfie yuklashi kerak yoki review qayta o'tkaziladi."
          />
        </Form.Item>
      </Form>
    ) : null}
  </Modal>
);

export default AdminEnrollmentReopenModal;
