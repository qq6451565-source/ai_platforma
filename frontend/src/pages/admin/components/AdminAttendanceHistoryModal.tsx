import { Empty, Modal, Table } from "antd";

import type { AttendanceOverrideLog } from "../../../api/attendance";
import type { AdminAttendanceController } from "../hooks/useAdminAttendanceController";

type Props = {
  controller: AdminAttendanceController;
};

const AdminAttendanceHistoryModal = ({ controller }: Props) => (
  <Modal
    title={`Override tarixi${controller.historyTarget ? `: ${controller.historyTarget.studentName}` : ""}`}
    open={!!controller.historyTarget}
    onCancel={controller.closeHistory}
    footer={null}
    width={760}
  >
    {controller.loadingOverrideHistory ? (
      <Empty description="Yuklanmoqda..." />
    ) : !controller.overrideHistory.length ? (
      <Empty description="Override tarixi yo'q" />
    ) : (
      <Table<AttendanceOverrideLog>
        rowKey="id"
        pagination={false}
        dataSource={controller.overrideHistory}
        columns={[
          {
            title: "Vaqt",
            dataIndex: "created_at",
            key: "created_at",
            render: (value: string | undefined) => (value ? new Date(value).toLocaleString() : "-"),
          },
          {
            title: "Kim",
            dataIndex: "changed_by_name",
            key: "changed_by_name",
            render: (value: string | null | undefined) => value || "-",
          },
          {
            title: "Holat",
            key: "status_change",
            render: (_: unknown, row: AttendanceOverrideLog) => `${row.previous_status || "-"} -> ${row.new_status}`,
          },
          {
            title: "Sabab",
            dataIndex: "reason",
            key: "reason",
          },
        ]}
      />
    )}
  </Modal>
);

export default AdminAttendanceHistoryModal;
