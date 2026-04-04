import { Button, Card, Empty, Input, Select, Space, Table, Tag, Typography } from "antd";

import AdminAttendanceDetailsModal from "./components/AdminAttendanceDetailsModal";
import AdminAttendanceHistoryModal from "./components/AdminAttendanceHistoryModal";
import AdminAttendanceOverrideModal from "./components/AdminAttendanceOverrideModal";
import { useAdminAttendanceController } from "./hooks/useAdminAttendanceController";
import { type StudentRow } from "./utils/adminAttendance";

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
          <div style={{ display: "grid", gap: 'var(--space-3)', gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Button onClick={controller.resetDirectionSelection}>Orqaga</Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {controller.selectedDirection.name}
            </Typography.Title>
          </div>
          {controller.subjectCards.length ? (
            <div style={{ display: "grid", gap: 'var(--space-3)', gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Button onClick={controller.clearSelectedSubject}>Orqaga</Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {controller.selectedSubject.name}
            </Typography.Title>
          </div>

          <Space wrap style={{ marginBottom: 'var(--space-3)' }}>
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
      <AdminAttendanceDetailsModal controller={controller} />
      <AdminAttendanceOverrideModal controller={controller} />
      <AdminAttendanceHistoryModal controller={controller} />
    </Card>
  );
};

export default AdminAttendancePage;
