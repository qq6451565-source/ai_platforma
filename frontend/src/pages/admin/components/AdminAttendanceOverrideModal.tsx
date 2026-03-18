import { Input, Modal, Typography } from "antd";

import type { AdminAttendanceController } from "../hooks/useAdminAttendanceController";

type Props = {
  controller: AdminAttendanceController;
};

const AdminAttendanceOverrideModal = ({ controller }: Props) => (
  <Modal
    title="Davomat override"
    open={!!controller.overrideDraft}
    onCancel={controller.closeOverrideModal}
    onOk={controller.submitOverride}
    okText="Saqlash"
    confirmLoading={controller.overrideSaving}
  >
    <Typography.Paragraph style={{ marginBottom: 12 }}>
      {controller.overrideDraft?.studentName} uchun davomatni{" "}
      <strong>{controller.overrideDraft?.status === "present" ? "Bor" : "Yoq"}</strong> deb belgilaysiz.
    </Typography.Paragraph>
    <Input.TextArea
      rows={4}
      value={controller.overrideReason}
      onChange={(event) => controller.setOverrideReason(event.target.value)}
      placeholder="Override sababi"
      maxLength={500}
    />
  </Modal>
);

export default AdminAttendanceOverrideModal;
