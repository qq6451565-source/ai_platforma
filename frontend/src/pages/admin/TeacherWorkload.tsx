import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Space,
  Statistic,
  Table,
  Tag,
} from "antd";
import { useTranslation } from 'react-i18next';

import { AdminUser } from "../../api/admin";
import AdminTeacherWorkloadDrawer from "./components/AdminTeacherWorkloadDrawer";
import AdminTeacherWorkloadModal from "./components/AdminTeacherWorkloadModal";
import { useTeacherWorkloadController } from "./hooks/useTeacherWorkloadController";

const TeacherWorkloadPage = () => {
  const { t } = useTranslation();
  const controller = useTeacherWorkloadController();

  const columns = [
    {
      title: t('adminWorkload.teacher'),
      key: "teacher",
      render: (_: unknown, teacher: AdminUser) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
            {`${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() || teacher.username}
          </span>
          <span style={{ color: "var(--color-text-secondary)" }}>{teacher.username}</span>
        </Space>
      ),
    },
    {
      title: t('adminWorkload.workload'),
      key: "workload",
      render: (_: unknown, teacher: AdminUser) => {
        const items = controller.assignmentsByTeacher.get(teacher.id) || [];
        if (!items.length) {
          return <Tag color="gold">{t('adminWorkload.noSubjectAssigned')}</Tag>;
        }
        return (
          <Space wrap>
            {items.map((item) => (
              <Tag key={item.id} color="blue">
                {controller.subjectMap.get(item.subject)?.name || t('adminWorkload.subjectNumber', { id: item.subject })}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: t('common.actions'),
      key: "actions",
      render: (_: unknown, teacher: AdminUser) => (
        <Space>
          <Button size="small" onClick={() => controller.openDrawer(teacher)}>
            {t('common.view')}
          </Button>
          <Button size="small" type="primary" onClick={() => controller.openCreateModal(teacher)}>
            {t('adminWorkload.assignSubject')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title={t('adminWorkload.pageTitle')}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space size="large" wrap>
          <Statistic title={t('adminWorkload.teachers')} value={controller.stats.total} />
          <Statistic title={t('adminWorkload.withWorkload')} value={controller.stats.withWorkload} />
          <Statistic title={t('adminWorkload.withoutWorkload')} value={controller.stats.withoutWorkload} />
          <Statistic title={t('adminWorkload.totalMappings')} value={controller.stats.mappings} />
        </Space>

        <Input
          placeholder={t('adminWorkload.searchPlaceholder')}
          value={controller.search}
          onChange={(event) => controller.setSearch(event.target.value)}
          style={{ maxWidth: 320 }}
        />

        {controller.filteredTeachers.length ? (
          <Table
            rowKey="id"
            loading={controller.isLoading}
            columns={columns}
            dataSource={controller.filteredTeachers}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description={t('adminWorkload.noTeachersFound')} />
        )}
      </Space>

      <AdminTeacherWorkloadDrawer
        assignments={
          controller.selectedTeacher
            ? controller.assignmentsByTeacher.get(controller.selectedTeacher.id) || []
            : []
        }
        deleteLoading={controller.deletePending}
        groupMap={controller.groupMap}
        open={controller.drawerOpen}
        onClose={controller.closeDrawer}
        onCreate={controller.openCreateModal}
        onDelete={controller.deleteAssignment}
        onEdit={controller.openEditModal}
        selectedTeacher={controller.selectedTeacher}
        subjectMap={controller.subjectMap}
      />

      <AdminTeacherWorkloadModal
        availableGroups={controller.availableGroups}
        editingAssignment={controller.editingAssignment}
        form={controller.form}
        loading={controller.savePending}
        open={controller.modalOpen}
        onCancel={controller.closeModal}
        onSubmit={controller.submitWorkload}
        selectedTeacher={controller.selectedTeacher}
        subjects={controller.subjects}
      />
    </Card>
  );
};

export default TeacherWorkloadPage;
