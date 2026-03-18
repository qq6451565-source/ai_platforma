import { Button, Card, Empty, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";

import type { AttendanceOverrideLog } from "../../api/attendance";
import { useAdminAttendanceController } from "./hooks/useAdminAttendanceController";
import {
  formatAttendanceRatio,
  type AbsentLesson,
  type StudentRow,
} from "./utils/adminAttendance";

const AdminAttendancePage = () => {
  const controller = useAdminAttendanceController();

  const columns = [
    {
      title: "Talaba",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Guruh",
      dataIndex: "groupName",
      key: "groupName",
    },
    {
      title: "Davomat",
      key: "attendance",
      render: (_: unknown, row: StudentRow) => (
        <Button type="link" onClick={() => controller.selectStudent(row)}>
          {row.absentCount > 0 ? "Yoq" : "Bor"}
        </Button>
      ),
    },
    {
      title: "Davomat soni",
      dataIndex: "absentCount",
      key: "absentCount",
      render: (value: number) => <Tag color={value > 0 ? "red" : "green"}>{value}</Tag>,
    },
  ];

  return (
    <Card title="Davomat">
      {!controller.selectedDirection ? (
        controller.loadingDirections ? (
          <Empty description="Yuklanmoqda..." />
        ) : controller.directions.length ? (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {controller.directions.map((direction) => (
              <Card key={direction.id} hoverable onClick={() => controller.selectDirection(direction)}>
                <Typography.Text strong>{direction.name}</Typography.Text>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="Yo'nalishlar yo'q" />
        )
      ) : !controller.selectedSubject ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Button onClick={controller.resetDirectionSelection}>Orqaga</Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {controller.selectedDirection.name}
            </Typography.Title>
          </div>
          {controller.subjectCards.length ? (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {controller.subjectCards.map((subject) => (
                <Card key={subject.id} hoverable onClick={() => controller.selectSubject(subject)}>
                  <Typography.Text strong>{subject.name}</Typography.Text>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="Fanlar yo'q" />
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Button onClick={controller.clearSelectedSubject}>Orqaga</Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {controller.selectedSubject.name}
            </Typography.Title>
          </div>

          <Space wrap style={{ marginBottom: 12 }}>
            <Select
              allowClear
              placeholder="Guruh"
              style={{ width: 200 }}
              value={controller.groupFilter ?? undefined}
              onChange={(value) => controller.setGroupFilter(value ?? null)}
              options={controller.groupOptions}
            />
            <Input
              placeholder="Qidirish"
              style={{ width: 220 }}
              value={controller.search}
              onChange={(event) => controller.setSearch(event.target.value)}
            />
          </Space>

          {controller.loadingAttendance ? (
            <Empty description="Yuklanmoqda..." />
          ) : controller.rows.length ? (
            <Table rowKey="studentId" columns={columns} dataSource={controller.rows} pagination={{ pageSize: 10 }} />
          ) : (
            <Empty description="Ma'lumot yo'q" />
          )}
        </>
      )}

      <Modal
        title="Davomat tafsilotlari"
        open={!!controller.selectedStudent}
        onCancel={controller.closeStudentDetails}
        footer={null}
      >
        {controller.selectedStudent && controller.selectedStudent.absentLessons.length === 0 ? (
          <Empty description="Qoldirilgan dars yo'q" />
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
                title: "Fan/Guruh",
                key: "subject",
                render: (_: unknown, row: AbsentLesson) => `${row.subject} / ${row.group}`,
              },
              {
                title: "Vaqt",
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
                      { value: "present", label: "Bor" },
                      { value: "absent", label: "Yoq" },
                    ]}
                  />
                ),
              },
              {
                title: "Final",
                key: "finalized",
                render: (_: unknown, row: AbsentLesson) => (
                  <Tag color={row.finalized ? "green" : "gold"}>{row.finalized ? "Yakunlangan" : "Jarayonda"}</Tag>
                ),
              },
              {
                title: "Override",
                key: "override",
                render: (_: unknown, row: AbsentLesson) =>
                  row.manualOverride ? (
                    <Tag
                      color="blue"
                      title={`${row.overrideReason || "Sabab yo'q"}${row.overriddenByName ? ` | ${row.overriddenByName}` : ""}${
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
    </Card>
  );
};

export default AdminAttendancePage;
