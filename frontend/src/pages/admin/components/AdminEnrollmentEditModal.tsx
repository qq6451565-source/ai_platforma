import { Form, Input, Modal, Select } from "antd";
import { useTranslation } from 'react-i18next';

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentEditModal = ({ controller }: Props) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminEditModal.title')}
    open={controller.editOpen}
    onCancel={controller.closeEdit}
    onOk={() => controller.editForm.submit()}
    confirmLoading={controller.updating}
    destroyOnClose
  >
    {controller.selectedApplicant ? (
      <Form layout="vertical" form={controller.editForm} onFinish={controller.submitEdit}>
        <Form.Item name="full_name" label={t('form.fullName')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label={t('form.phone')}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label={t('form.email')}>
          <Input />
        </Form.Item>
        <Form.Item name="direction_choice" label={t('form.direction')}>
          <Select
            allowClear
            options={controller.directions.map((direction) => ({ value: direction.id, label: direction.name }))}
            placeholder={t('adminEditModal.selectDirection')}
          />
        </Form.Item>
      </Form>
    ) : null}
  </Modal>
  );
};

export default AdminEnrollmentEditModal;
