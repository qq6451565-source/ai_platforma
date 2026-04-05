import { Empty, Modal, Select, Table, Tag } from "antd";
import { useTranslation } from 'react-i18next';

import type { AdminAttendanceController } from "../hooks/useAdminAttendanceController";
import { formatAttendanceRatio, type AbsentLesson } from "../utils/adminAttendance";

type Props = {
  controller: AdminAttendanceController;
};

const AdminAttendanceDetailsModal = ({ controller }: Props) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminAttendanceDetails.title')}
    open={!!controller.selectedStudent}
    onCancel={controller.closeStudentDetails}
    footer={null}
  >
    {controller.selectedStudent && controller.selectedStudent.absentLessons.length === 0 ? (
      <Empty description={t('adminAttendanceDetails.noAbsent')} />
    ) : (
      <Table
        rowKey={(row) => `${row.lessonId}-${row.status}`}
        pagination={false}
        dataSource={controller.selectedStudent?.absentLessons || []}
        columns={[
          {
            title: "Dars",
            dataIndex: "topic",
            key: "topic",
          },
          {
            title: t('adminAttendanceDetails.subjectGroup'),
            key: "subject",
            render: (_: unknown, row: AbsentLesson) => `${row.subject} / ${row.group}`,
          },
          {
            title: t('adminAttendanceDetails.time'),
            dataIndex: "startTime",
            key: "startTime",
            render: (value: string | undefined) => (value ? new Date(value).toLocaleString() : "-"),
          },
          {
            title: "Holat",
            key: "status",
            render: (_: unknown, row: AbsentLesson) => (
              <Select
                value={row.status}
                style={{ width: 110 }}
                onChange={(value) => {
                  if (!controller.selectedStudent) return;
                  controller.openOverrideModal({
                    lesson: row.lessonId,
                    student: controller.selectedStudent.studentId,
                    status: value,
                    studentName: controller.selectedStudent.studentName,
                  });
                }}
                options={[
                  { value: "present", label: t('adminAttendanceDetails.present') },
                  { value: "absent", label: t('adminAttendanceDetails.absent') },
                ]}
              />
            ),
          },
          {
            title: "Final",
            key: "finalized",
            render: (_: unknown, row: AbsentLesson) => (
              <Tag color={row.finalized ? "green" : "gold"}>{row.finalized ? t('adminAttendanceDetails.finalized') : t('adminAttendanceDetails.inProgress')}</Tag>
            ),
          },
          {
            title: "Override",
            key: "override",
            render: (_: unknown, row: AbsentLesson) =>
              row.manualOverride ? (
                <Tag
                  color="blue"
                  title={`${row.overrideReason || t('adminAttendanceDetails.noReason')}${row.overriddenByName ? ` | ${row.overriddenByName}` : ""}${
                    row.overriddenAt ? ` | ${new Date(row.overriddenAt).toLocaleString()}` : ""
                  }`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (!controller.selectedStudent) return;
                    controller.openHistory({
                      lesson: row.lessonId,
                      student: controller.selectedStudent.studentId,
                      studentName: controller.selectedStudent.studentName,
                    });
                  }}
                >
                  Manual
                </Tag>
              ) : (
                "-"
              ),
          },
          {
            title: "Qatnashuv",
            key: "joinedRatio",
            render: (_: unknown, row: AbsentLesson) => formatAttendanceRatio(row.joinedRatio),
          },
          {
            title: "Face ratio",
            key: "faceVerifiedRatio",
            render: (_: unknown, row: AbsentLesson) => formatAttendanceRatio(row.faceVerifiedRatio),
          },
        ]}
      />
    )}
  </Modal>
  );
};

export default AdminAttendanceDetailsModal;
