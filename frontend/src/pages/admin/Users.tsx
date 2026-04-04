import {
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";

import { AdminUser } from "../../api/admin";
import AdminPassportModal from "./components/AdminPassportModal";
import AdminStudentPlacementModal from "./components/AdminStudentPlacementModal";
import AdminTeacherWorkloadDrawer from "./components/AdminTeacherWorkloadDrawer";
import AdminTeacherWorkloadModal from "./components/AdminTeacherWorkloadModal";
import AdminUserFormModal from "./components/AdminUserFormModal";
import AdminUserProfileDrawer from "./components/AdminUserProfileDrawer";
import { useAdminUsersController } from "./hooks/useAdminUsersController";

const UsersPage = () => {
  const controller = useAdminUsersController();

  const columns = [
    {
      title: "Foydalanuvchi",
      key: "user",
      render: (_: unknown, user: AdminUser) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
            {`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username}
          </span>
          <span style={{ color: "var(--color-text-secondary)" }}>{user.username}</span>
        </Space>
      ),
    },
    {
      title: "Aloqa",
      key: "contact",
      render: (_: unknown, user: AdminUser) => (
        <Space direction="vertical" size={0}>
          <span>{user.email || "-"}</span>
          <span style={{ color: "var(--color-text-secondary)" }}>{user.phone || "-"}</span>
        </Space>
      ),
    },
    {
      title: "Rol",
      key: "role",
      render: (_: unknown, user: AdminUser) => (
        <Select
          size="small"
          value={user.role}
          style={{ minWidth: 140 }}
          onChange={(role) =>
            controller.changeRole(user.id, role as "student" | "teacher" | "admin")
          }
          options={[
            { value: "student", label: "Talaba" },
            { value: "teacher", label: "O'qituvchi" },
            { value: "admin", label: "Admin" },
          ]}
        />
      ),
    },
    {
      title: "Academic holat",
      key: "academic",
      render: (_: unknown, user: AdminUser) => {
        if (user.role === "student") {
          const profile = controller.profileByUser.get(user.id);
          if (!profile) return <Tag color="red">Profil yo'q</Tag>;
          return (
            <Space wrap>
              <Tag color={profile.group ? "green" : "gold"}>
                {profile.group
                  ? controller.groupMap.get(profile.group) || "Guruh biriktirilgan"
                  : "Guruh tanlanmagan"}
              </Tag>
              <Tag>{profile.status || "active"}</Tag>
            </Space>
          );
        }

        if (user.role === "teacher") {
          const assignmentCount = (controller.assignmentsByTeacher.get(user.id) || []).length;
          return assignmentCount ? (
            <Tag color="blue">{assignmentCount} ta mapping</Tag>
          ) : (
            <Tag color="gold">Workload yo'q</Tag>
          );
        }

        return <Tag>System admin</Tag>;
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, user: AdminUser) =>
        user.is_active ? <Tag color="green">faol</Tag> : <Tag color="red">blok</Tag>,
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_: unknown, user: AdminUser) => (
        <Space>
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              controller.openProfile(user);
            }}
          >
            Tahrirlash
          </Button>
          <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => controller.removeUser(user.id)}>
            <Button
              size="small"
              danger
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              O'chirish
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Foydalanuvchilar"
      extra={
        <Button type="primary" onClick={controller.openCreate}>
          Yangi foydalanuvchi
        </Button>
      }
    >
      <Tabs
        activeKey={controller.roleFilter || "all"}
        onChange={controller.setRoleFromTab}
        items={[
          { key: "all", label: `Barchasi (${controller.roleCounts.all})` },
          { key: "admin", label: `Adminlar (${controller.roleCounts.admin})` },
          { key: "teacher", label: `O'qituvchilar (${controller.roleCounts.teacher})` },
          { key: "student", label: `Talabalar (${controller.roleCounts.student})` },
        ]}
        style={{ marginBottom: 'var(--space-3)' }}
      />

      <Input
        placeholder="Qidirish: login, ism, email, telefon, guruh yoki fan"
        value={controller.search}
        onChange={(event) => controller.setSearch(event.target.value)}
        style={{ maxWidth: 360, marginBottom: 'var(--space-3)' }}
      />

      <Table
        rowKey="id"
        loading={controller.isLoading}
        dataSource={controller.filteredUsers}
        columns={columns}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 980 }}
      />

      <AdminUserFormModal
        editing={controller.editing}
        form={controller.form}
        loading={controller.userFormLoading}
        open={controller.modalOpen}
        onCancel={controller.closeUserModal}
        onSubmit={controller.submitUserForm}
      />

      <AdminUserProfileDrawer
        directionMap={controller.directionMap}
        groupMap={controller.groupMap}
        onClose={controller.closeProfile}
        onDeletePassport={controller.deletePassport}
        onEditUser={() => {
          if (controller.selectedUser) {
            controller.openEdit(controller.selectedUser);
          }
        }}
        onOpenPassportEditor={controller.openPassportEditor}
        onOpenWorkflow={controller.openWorkflow}
        open={controller.drawerOpen}
        passport={controller.selectedPassport}
        studentProfile={controller.selectedStudentProfile}
        subjectMap={controller.subjectMap}
        teacherAssignments={controller.selectedTeacherAssignments}
        user={controller.selectedUser}
      />

      <AdminPassportModal
        form={controller.passportForm}
        open={controller.passportModalOpen}
        passport={controller.selectedPassport}
        onBackFileChange={controller.setPassportBackFile}
        onCancel={controller.closePassportModal}
        onFrontFileChange={controller.setPassportFrontFile}
        onSave={controller.savePassport}
        onSelfieFileChange={controller.setPassportSelfieFile}
      />

      <AdminStudentPlacementModal
        availableGroups={controller.availablePlacementGroups}
        directions={controller.directions}
        form={controller.placementForm}
        loading={controller.placementLoading}
        open={controller.placementModalOpen}
        selectedUser={controller.selectedUser}
        onCancel={controller.closePlacementModal}
        onSubmit={controller.submitPlacement}
      />

      <AdminTeacherWorkloadDrawer
        assignments={controller.selectedTeacherAssignments}
        deleteLoading={controller.workloadDeleteLoading}
        groupMap={controller.groupEntityMap}
        open={controller.workloadDrawerOpen}
        selectedTeacher={controller.selectedUser}
        subjectMap={controller.subjectEntityMap}
        onClose={controller.closeWorkloadDrawer}
        onCreate={controller.openWorkloadCreateModal}
        onDelete={controller.deleteWorkload}
        onEdit={controller.openWorkloadEditModal}
      />

      <AdminTeacherWorkloadModal
        availableGroups={controller.availableWorkloadGroups}
        editingAssignment={controller.editingWorkloadAssignment}
        form={controller.workloadForm}
        loading={controller.workloadSaveLoading}
        open={controller.workloadModalOpen}
        selectedTeacher={controller.selectedUser}
        subjects={controller.subjects}
        onCancel={controller.closeWorkloadModal}
        onSubmit={controller.submitWorkload}
      />
    </Card>
  );
};

export default UsersPage;

