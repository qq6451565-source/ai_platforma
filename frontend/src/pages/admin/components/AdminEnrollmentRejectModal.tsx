import { Alert, Form, Input, Modal } from "antd";

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentRejectModal = ({ controller }: Props) => (
  <Modal
    title="Arizani rad etish"
    open={controller.rejectOpen}
    onCancel={controller.closeReject}
    onOk={() => controller.rejectForm.submit()}
    confirmLoading={controller.rejecting}
    destroyOnClose
  >
    {controller.selectedApplicant ? (
      <Form layout="vertical" form={controller.rejectForm} onFinish={controller.submitReject}>
        <Alert
          type="warning"
          showIcon
          message="Rad etilgan ariza history'da saqlanadi"
          description="Applicant record va audit izi qoladi, lekin agar vaqtinchalik user bo'lsa, account o'chiriladi."
          style={{ marginBottom: 12 }}
        />
        <Form.Item
          name="reject_reason"
          label="Rad etish sababi"
          rules={[{ required: true, message: "Rad etish sababini yozing" }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Masalan: passport rasmi sifatsiz yoki shaxs tasdiqlanmadi."
          />
        </Form.Item>
      </Form>
    ) : null}
  </Modal>
);

export default AdminEnrollmentRejectModal;
