import { Alert, Form, Input, Modal } from "antd";
import { useTranslation } from 'react-i18next';

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentRejectModal = ({ controller }: Props) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminRejectModal.title')}
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
          message={t('adminRejectModal.alertMessage')}
          description={t('adminRejectModal.alertDescription')}
          style={{ marginBottom: 'var(--space-3)' }}
        />
        <Form.Item
          name="reject_reason"
          label={t('adminRejectModal.reasonLabel')}
          rules={[{ required: true, message: t('adminRejectModal.reasonRequired') }]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t('adminRejectModal.reasonPlaceholder')}
          />
        </Form.Item>
      </Form>
    ) : null}
  </Modal>
  );
};

export default AdminEnrollmentRejectModal;
