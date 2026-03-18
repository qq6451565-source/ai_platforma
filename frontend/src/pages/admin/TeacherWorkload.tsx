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

import { AdminUser } from "../../api/admin";
import AdminTeacherWorkloadDrawer from "./components/AdminTeacherWorkloadDrawer";
import AdminTeacherWorkloadModal from "./components/AdminTeacherWorkloadModal";
import { useTeacherWorkloadController } from "./hooks/useTeacherWorkloadController";

const TeacherWorkloadPage = () => {
  const controller = useTeacherWorkloadController();

  const columns = [
    {
      title: "O'qituvchi",
      key: "teacher",
      render: (_: unknown, teacher: AdminUser) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>
            {`${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() || teacher.username}
          </span>
          <span style={{ color: "#64748b" }}>{teacher.username}</span>
        </Space>
      ),
    },
    {
      title: "Workload",
      key: "workload",
      render: (_: unknown, teacher: AdminUser) => {
        const items = controller.assignmentsByTeacher.get(teacher.id) || [];
        if (!items.length) {
          return <Tag color="gold">Fan biriktirilmagan</Tag>;
        }
        return (
          <Space wrap>
            {items.map((item) => (
              <Tag key={item.id} color="blue">
                {controller.subjectMap.get(item.subject)?.name || `Fan #${item.subject}`}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Amal",
      key: "actions",
      render: (_: unknown, teacher: AdminUser) => (
        <Space>
          <Button size="small" onClick={() => controller.openDrawer(teacher)}>
            Ko'rish
          </Button>
          <Button size="small" type="primary" onClick={() => controller.openCreateModal(teacher)}>
            Fan biriktirish
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Teacher Workload">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space size="large" wrap>
          <Statistic title="O'qituvchilar" value={controller.stats.total} />
          <Statistic title="Workload bor" value={controller.stats.withWorkload} />
          <Statistic title="Workload yo'q" value={controller.stats.withoutWorkload} />
          <Statistic title="Jami mapping" value={controller.stats.mappings} />
        </Space>

        <Input
          placeholder="O'qituvchi yoki fan bo'yicha qidirish"
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
          <Empty description="O'qituvchilar topilmadi" />
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
