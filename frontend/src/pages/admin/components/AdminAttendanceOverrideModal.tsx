import { Input, Modal, Typography } from "antd";
import { useTranslation } from 'react-i18next';

import type { AdminAttendanceController } from "../hooks/useAdminAttendanceController";

type Props = {
  controller: AdminAttendanceController;
};

const AdminAttendanceOverrideModal = ({ controller }: Props) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminAttendanceOverride.title')}
    open={!!controller.overrideDraft}
    onCancel={controller.closeOverrideModal}
    onOk={controller.submitOverride}
    okText={t('common.save')}
    confirmLoading={controller.overrideSaving}
  >
    <Typography.Paragraph style={{ marginBottom: 'var(--space-3)' }}>
      {controller.overrideDraft?.studentName} {t('adminAttendanceOverride.setAttendance')}{" "}
      <strong>{controller.overrideDraft?.status === "present" ? t('adminAttendanceOverride.present') : t('adminAttendanceOverride.absent')}</strong> {t('adminAttendanceOverride.markAs')}.
    </Typography.Paragraph>
    <Input.TextArea
      rows={4}
      value={controller.overrideReason}
      onChange={(event) => controller.setOverrideReason(event.target.value)}
      placeholder={t('adminAttendanceOverride.reasonPlaceholder')}
      maxLength={500}
    />
  </Modal>
  );
};

export default AdminAttendanceOverrideModal;
