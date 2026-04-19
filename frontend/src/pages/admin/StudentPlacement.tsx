import {
  Button,
  Card,
  Empty,
  Input,
  Space,
  Statistic,
  Table,
  Tag,
} from "antd";

import { AdminUser } from "../../api/admin";
import AdminStudentPlacementModal from "./components/AdminStudentPlacementModal";
import { useStudentPlacementController } from "./hooks/useStudentPlacementController";

const StudentPlacementPage = () => {
  const controller = useStudentPlacementController();

  const columns = [
    {
      title: "Talaba",
      key: "student",
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
      title: "Yo'nalish",
      key: "direction",
      render: (_: unknown, user: AdminUser) => {
        const profile = controller.profileByUser.get(user.id);
        return profile?.direction ? controller.directionMap.get(profile.direction) || "-" : "-";
      },
    },
    {
      title: "Guruh",
      key: "group",
      render: (_: unknown, user: AdminUser) => {
        const profile = controller.profileByUser.get(user.id);
        return profile?.group ? controller.groupMap.get(profile.group)?.name || "-" : "-";
      },
    },
    {
      title: "Status",
      key: "placement_status",
      render: (_: unknown, user: AdminUser) => {
        const profile = controller.profileByUser.get(user.id);
        if (!profile) return <Tag color="red">Profil yo'q</Tag>;
        if (!profile.group) return <Tag color="gold">Guruh tanlanmagan</Tag>;
        return <Tag color="green">{profile.status || "active"}</Tag>;
      },
    },
    {
      title: "Amal",
      key: "actions",
      render: (_: unknown, user: AdminUser) => (
        <Button size="small" type="primary" onClick={() => controller.openPlacement(user)}>
          {controller.profileByUser.get(user.id)?.group ? "Placementni tahrirlash" : "Placement berish"}
        </Button>
      ),
    },
  ];

  return (
    <Card title="Student Placement">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space size="large" wrap>
          <Statistic title="Studentlar" value={controller.stats.total} />
          <Statistic title="Joylashtirilgan" value={controller.stats.placed} />
          <Statistic title="Guruhsiz" value={controller.stats.missingGroup} />
        </Space>

        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Input
            placeholder="Talaba qidirish"
            value={controller.search}
            onChange={(event) => controller.setSearch(event.target.value)}
            style={{ maxWidth: 320 }}
          />
        </Space>

        {controller.filteredUsers.length ? (
          <Table
            rowKey="id"
            loading={controller.isLoading}
            columns={columns}
            dataSource={controller.filteredUsers}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <Empty description="Studentlar topilmadi" />
        )}
      </Space>

      <AdminStudentPlacementModal
        availableGroups={controller.availableGroups}
        directions={controller.directions}
        form={controller.form}
        loading={controller.savePending}
        open={controller.modalOpen}
        onCancel={controller.closePlacement}
        onSubmit={controller.submitPlacement}
        selectedUser={controller.selectedUser}
      />
    </Card>
  );
};

export default StudentPlacementPage;
