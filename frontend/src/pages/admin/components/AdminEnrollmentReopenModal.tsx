import { Alert, Form, Input, Modal } from "antd";
import { useTranslation } from 'react-i18next';

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentReopenModal = ({ controller }: Props) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminReopenModal.title')}
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
          message={t('adminReopenModal.alertMessage')}
          description={t('adminReopenModal.alertDescription')}
          style={{ marginBottom: 'var(--space-3)' }}
        />
        <Form.Item
          name="reopen_reason"
          label={t('adminReopenModal.reasonLabel')}
          rules={[{ required: true, message: t('adminReopenModal.reasonRequired') }]}
        >
          <Input.TextArea
            rows={4}
            placeholder={t('adminReopenModal.reasonPlaceholder')}
          />
        </Form.Item>
      </Form>
    ) : null}
  </Modal>
  );
};

export default AdminEnrollmentReopenModal;
