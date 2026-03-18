import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  message,
} from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AdminUser,
  assignStudentPlacement,
  fetchDirections,
  fetchGroupsAdmin,
  fetchStudentProfiles,
  fetchUsers,
} from "../../api/admin";
import {
  buildDirectionNameMap,
  buildGroupEntityMap,
  buildProfileByUser,
  filterStudentPlacementUsers,
  getStudentPlacementStats,
} from "./utils/adminRegistry";
import AdminStudentPlacementModal from "./components/AdminStudentPlacementModal";
import { clearRequestedUserIdSearch, getRequestedUserId } from "./utils/workflowRouting";

const StudentPlacementPage = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
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

  const requestedUserId = useMemo(() => getRequestedUserId(location.search), [location.search]);

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
      navigate(
        { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
        { replace: true },
      );
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

  const directionMap = useMemo(() => buildDirectionNameMap(directions || []), [directions]);
  const groupMap = useMemo(() => buildGroupEntityMap(groups || []), [groups]);
  const profileByUser = useMemo(() => buildProfileByUser(studentProfiles || []), [studentProfiles]);

  const filteredUsers = useMemo(
    () =>
      filterStudentPlacementUsers({
        directionMap,
        groupMap,
        profileByUser,
        search,
        users: users || [],
      }),
    [directionMap, groupMap, profileByUser, search, users],
  );

  const selectedDirectionId = Form.useWatch("direction_id", form);
  const availableGroups = useMemo(() => {
    if (!selectedDirectionId) return groups || [];
    return (groups || []).filter((group) => group.direction === selectedDirectionId);
  }, [groups, selectedDirectionId]);

  const stats = useMemo(
    () => getStudentPlacementStats(users || [], profileByUser),
    [profileByUser, users],
  );

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

  useEffect(() => {
    if (!requestedUserId || !users?.length || modalOpen) return;
    const matchedUser = users.find((user) => user.id === requestedUserId);
    if (matchedUser) {
      openPlacement(matchedUser);
      return;
    }
    navigate(
      { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
      { replace: true },
    );
  }, [location.pathname, location.search, modalOpen, navigate, requestedUserId, users]);

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

      <AdminStudentPlacementModal
        availableGroups={availableGroups}
        directions={directions || []}
        form={form}
        loading={saveMutation.isPending}
        open={modalOpen}
        onCancel={() => {
          navigate(
            { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
            { replace: true },
          );
          setModalOpen(false);
          setSelectedUser(null);
          form.resetFields();
        }}
        onSubmit={(values) => {
          if (!selectedUser) return;
          saveMutation.mutate({
            userId: selectedUser.id,
            payload: values,
          });
        }}
        selectedUser={selectedUser}
      />
    </Card>
  );
};

export default StudentPlacementPage;
