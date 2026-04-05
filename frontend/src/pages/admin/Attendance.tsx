import { Button, Card, Empty, Input, Select, Space, Table, Tag, Typography } from "antd";
import { useTranslation } from 'react-i18next';

import AdminAttendanceDetailsModal from "./components/AdminAttendanceDetailsModal";
import AdminAttendanceHistoryModal from "./components/AdminAttendanceHistoryModal";
import AdminAttendanceOverrideModal from "./components/AdminAttendanceOverrideModal";
import { useAdminAttendanceController } from "./hooks/useAdminAttendanceController";
import { type StudentRow } from "./utils/adminAttendance";

const AdminAttendancePage = () => {
  const { t } = useTranslation();
  const controller = useAdminAttendanceController();

  const columns = [
    {
      title: t('adminAttendance.studentCol'),
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: t('adminAttendance.groupCol'),
      dataIndex: "groupName",
      key: "groupName",
    },
    {
      title: t('adminAttendance.attendanceCol'),
      key: "attendance",
      render: (_: unknown, row: StudentRow) => (
        <Button type="link" onClick={() => controller.selectStudent(row)}>
          {row.absentCount > 0 ? t('adminAttendance.absent') : t('adminAttendance.present')}
        </Button>
      ),
    },
    {
      title: t('adminAttendance.absentCount'),
      dataIndex: "absentCount",
      key: "absentCount",
      render: (value: number) => <Tag color={value > 0 ? "red" : "green"}>{value}</Tag>,
    },
  ];

  return (
    <Card title={t('adminAttendance.pageTitle')}>
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
          <Empty description={t('adminAttendance.noDirections')} />
        )
      ) : !controller.selectedSubject ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Button onClick={controller.resetDirectionSelection}>{t('common.back')}</Button>
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
            <Empty description={t('adminAttendance.noSubjects')} />
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Button onClick={controller.clearSelectedSubject}>{t('common.back')}</Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {controller.selectedSubject.name}
            </Typography.Title>
          </div>

          <Space wrap style={{ marginBottom: 'var(--space-3)' }}>
            <Select
              allowClear
              placeholder={t('adminAttendance.groupPlaceholder')}
              style={{ width: 200 }}
              value={controller.groupFilter ?? undefined}
              onChange={(value) => controller.setGroupFilter(value ?? null)}
              options={controller.groupOptions}
            />
            <Input
              placeholder={t('adminAttendance.searchPlaceholder')}
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
            <Empty description={t('common.noData')} />
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
