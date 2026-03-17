import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";

import {
  AdminUser,
  assignStudentPlacement,
  fetchDirections,
  fetchGroupsAdmin,
  fetchStudentProfiles,
  fetchUsers,
} from "../../api/admin";

const StudentPlacementPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", "student-placement"],
    queryFn: () => fetchUsers("student"),
  });
  const { data: studentProfiles } = useQuery({
    queryKey: ["admin-student-profiles"],
    queryFn: fetchStudentProfiles,
  });
  const { data: directions } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: {
        direction_id?: number | null;
        group_id?: number | null;
        admission_year?: number;
        status?: "active" | "academic_leave" | "expelled" | "graduated";
      };
    }) => assignStudentPlacement(userId, payload),
    onSuccess: async () => {
      message.success("Talaba placement saqlandi");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "student-placement"] }),
        qc.invalidateQueries({ queryKey: ["admin-student-profiles"] }),
      ]);
      setModalOpen(false);
      setSelectedUser(null);
      form.resetFields();
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.group_id?.[0] ||
        error?.response?.data?.group?.[0] ||
        error?.response?.data?.detail ||
        "Placementni saqlashda xato";
      message.error(detail);
    },
  });

  const directionMap = useMemo(
    () => new Map((directions || []).map((direction) => [direction.id, direction.name])),
    [directions],
  );
  const groupMap = useMemo(
    () => new Map((groups || []).map((group) => [group.id, group])),
    [groups],
  );
  const profileByUser = useMemo(
    () => new Map((studentProfiles || []).map((profile) => [profile.user, profile])),
    [studentProfiles],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter((user) => {
      const profile = profileByUser.get(user.id);
      const groupName = profile?.group ? groupMap.get(profile.group)?.name || "" : "";
      const directionName = profile?.direction ? directionMap.get(profile.direction) || "" : "";
      if (!q) return true;
      return (
        user.username.toLowerCase().includes(q) ||
        `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().includes(q) ||
        (user.email || "").toLowerCase().includes(q) ||
        (user.phone || "").toLowerCase().includes(q) ||
        groupName.toLowerCase().includes(q) ||
        directionName.toLowerCase().includes(q)
      );
    });
  }, [directionMap, groupMap, profileByUser, search, users]);

  const selectedDirectionId = Form.useWatch("direction_id", form);
  const availableGroups = useMemo(() => {
    if (!selectedDirectionId) return groups || [];
    return (groups || []).filter((group) => group.direction === selectedDirectionId);
  }, [groups, selectedDirectionId]);

  const stats = useMemo(() => {
    const allUsers = users || [];
    const placed = allUsers.filter((user) => {
      const profile = profileByUser.get(user.id);
      return Boolean(profile?.group);
    }).length;
    const missingGroup = allUsers.filter((user) => {
      const profile = profileByUser.get(user.id);
      return !profile?.group;
    }).length;
    return {
      total: allUsers.length,
      placed,
      missingGroup,
    };
  }, [profileByUser, users]);

  const openPlacement = (user: AdminUser) => {
    const profile = profileByUser.get(user.id);
    const fallbackDirectionId = profile?.direction ?? (profile?.group ? groupMap.get(profile.group)?.direction : undefined);
    setSelectedUser(user);
    form.setFieldsValue({
      direction_id: fallbackDirectionId,
      group_id: profile?.group,
      admission_year: profile?.admission_year,
      status: profile?.status || "active",
    });
    setModalOpen(true);
  };

  const columns = [
    {
      title: "Talaba",
      key: "student",
      render: (_: unknown, user: AdminUser) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>
            {`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username}
          </span>
          <span style={{ color: "#64748b" }}>{user.username}</span>
        </Space>
      ),
    },
    {
      title: "Yo'nalish",
      key: "direction",
      render: (_: unknown, user: AdminUser) => {
        const profile = profileByUser.get(user.id);
        return profile?.direction ? directionMap.get(profile.direction) || "-" : "-";
      },
    },
    {
      title: "Guruh",
      key: "group",
      render: (_: unknown, user: AdminUser) => {
        const profile = profileByUser.get(user.id);
        return profile?.group ? groupMap.get(profile.group)?.name || "-" : "-";
      },
    },
    {
      title: "Status",
      key: "placement_status",
      render: (_: unknown, user: AdminUser) => {
        const profile = profileByUser.get(user.id);
        if (!profile) return <Tag color="red">Profil yo'q</Tag>;
        if (!profile.group) return <Tag color="gold">Guruh tanlanmagan</Tag>;
        return <Tag color="green">{profile.status || "active"}</Tag>;
      },
    },
    {
      title: "Amal",
      key: "actions",
      render: (_: unknown, user: AdminUser) => (
        <Button size="small" type="primary" onClick={() => openPlacement(user)}>
          {profileByUser.get(user.id)?.group ? "Placementni tahrirlash" : "Placement berish"}
        </Button>
      ),
    },
  ];

  return (
    <Card title="Student Placement">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space size="large" wrap>
          <Statistic title="Studentlar" value={stats.total} />
          <Statistic title="Joylashtirilgan" value={stats.placed} />
          <Statistic title="Guruhsiz" value={stats.missingGroup} />
        </Space>

        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Input
            placeholder="Talaba qidirish"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ maxWidth: 320 }}
          />
        </Space>

        {filteredUsers.length ? (
          <Table
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={filteredUsers}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description="Studentlar topilmadi" />
        )}
      </Space>

      <Modal
        title="Student Placement"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedUser(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        {selectedUser ? (
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) =>
              saveMutation.mutate({
                userId: selectedUser.id,
                payload: values,
              })
            }
          >
            <Form.Item label="Talaba">
              <Input
                disabled
                value={`${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || selectedUser.username}
              />
            </Form.Item>
            <Form.Item name="direction_id" label="Yo'nalish" rules={[{ required: true }]}>
              <Select
                showSearch
                options={(directions || []).map((direction) => ({
                  value: direction.id,
                  label: direction.name,
                }))}
              />
            </Form.Item>
            <Form.Item name="group_id" label="Guruh" rules={[{ required: true }]}>
              <Select
                showSearch
                options={availableGroups.map((group) => ({
                  value: group.id,
                  label: group.name,
                }))}
              />
            </Form.Item>
            <Form.Item name="admission_year" label="Qabul yili" rules={[{ required: true }]}>
              <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "active", label: "Active" },
                  { value: "academic_leave", label: "Academic leave" },
                  { value: "expelled", label: "Expelled" },
                  { value: "graduated", label: "Graduated" },
                ]}
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </Card>
  );
};

export default StudentPlacementPage;
