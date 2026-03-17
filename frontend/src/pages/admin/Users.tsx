import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AdminUser,
  TeacherSubject,
  createAdminUser,
  createPassportData,
  deleteAdminUser,
  deletePassportData,
  fetchDirections,
  fetchGroupsAdmin,
  fetchPassportData,
  fetchStudentProfiles,
  fetchSubjectsAdmin,
  fetchTeacherSubjects,
  fetchUsers,
  setUserRole,
  updateAdminUser,
  updatePassportData,
} from "../../api/admin";
import AdminPassportModal from "./components/AdminPassportModal";
import AdminUserFormModal from "./components/AdminUserFormModal";
import AdminUserProfileDrawer from "./components/AdminUserProfileDrawer";
import {
  buildAssignmentsByTeacher,
  buildDirectionNameMap,
  buildGroupNameMap,
  buildProfileByUser,
  buildSubjectNameMap,
  filterAdminUsers,
  getAdminUserRoleCounts,
} from "./utils/adminRegistry";
import { updateAdminHubSearch } from "./utils/workflowRouting";

const UsersPage = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
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
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["admin-teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: passports } = useQuery({
    queryKey: ["admin-passports"],
    queryFn: fetchPassportData,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [passportFrontFile, setPassportFrontFile] = useState<File | null>(null);
  const [passportBackFile, setPassportBackFile] = useState<File | null>(null);
  const [passportSelfieFile, setPassportSelfieFile] = useState<File | null>(null);
  const [form] = Form.useForm();
  const [passportForm] = Form.useForm();

  const profileByUser = useMemo(() => buildProfileByUser(studentProfiles || []), [studentProfiles]);
  const passportByUser = useMemo(
    () => new Map((passports || []).map((passport) => [passport.user, passport])),
    [passports],
  );
  const assignmentsByTeacher = useMemo(
    () => buildAssignmentsByTeacher(teacherSubjects || []),
    [teacherSubjects],
  );
  const directionMap = useMemo(() => buildDirectionNameMap(directions || []), [directions]);
  const groupMap = useMemo(() => buildGroupNameMap(groups || []), [groups]);
  const subjectMap = useMemo(() => buildSubjectNameMap(subjects || []), [subjects]);

  const selectedStudentProfile = useMemo(() => {
    if (!selectedUser) return null;
    return profileByUser.get(selectedUser.id) || null;
  }, [profileByUser, selectedUser]);
  const selectedTeacherAssignments = useMemo(() => {
    if (!selectedUser) return [];
    return assignmentsByTeacher.get(selectedUser.id) || [];
  }, [assignmentsByTeacher, selectedUser]);
  const selectedPassport = useMemo(() => {
    if (!selectedUser) return null;
    return passportByUser.get(selectedUser.id) || null;
  }, [passportByUser, selectedUser]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get("role");
    if (role === "admin" || role === "teacher" || role === "student") {
      setRoleFilter(role);
      return;
    }
    setRoleFilter(null);
  }, [location.search]);

  useEffect(() => {
    if (!selectedUser) return;
    const freshUser = (users || []).find((user) => user.id === selectedUser.id);
    if (freshUser) {
      setSelectedUser(freshUser);
      return;
    }
    setDrawerOpen(false);
    setSelectedUser(null);
  }, [selectedUser?.id, users]);

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "student" | "teacher" | "admin" }) =>
      setUserRole(id, role),
    onSuccess: async (_response, variables) => {
      message.success("Rol yangilandi");
      if (selectedUser?.id === variables.id) {
        setSelectedUser((current) => (current ? { ...current, role: variables.role } : current));
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "student-placement"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "teacher-workload"] }),
        qc.invalidateQueries({ queryKey: ["admin-student-profiles"] }),
        qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] }),
      ]);
    },
    onError: () => message.error("Rolni yangilashda xato"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminUser(payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error("Foydalanuvchi qo'shishda xato"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateAdminUser(id, payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "student-placement"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "teacher-workload"] }),
      ]);
      if (selectedUser) {
        setDrawerOpen(false);
        setSelectedUser(null);
      }
    },
    onError: () => message.error("O'chirishda xato"),
  });

  const filteredUsers = useMemo(
    () =>
      filterAdminUsers({
        assignmentsByTeacher,
        directionMap,
        groupNameMap: groupMap,
        profileByUser,
        roleFilter,
        search,
        subjectNameMap: subjectMap,
        users: users || [],
      }),
    [assignmentsByTeacher, directionMap, groupMap, profileByUser, roleFilter, search, subjectMap, users],
  );

  const roleCounts = useMemo(() => getAdminUserRoleCounts(users || []), [users]);

  const setRoleFromTab = (key: string) => {
    const nextRole = key === "all" ? null : key;
    setRoleFilter(nextRole);
    navigate(
      {
        pathname: location.pathname,
        search: updateAdminHubSearch(location.search, {
          tab: "users",
          role: nextRole,
        }),
      },
      { replace: true },
    );
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    form.setFieldsValue({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active ?? true,
    });
    setModalOpen(true);
  };

  const openProfile = (user: AdminUser) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const closeProfile = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    setPassportModalOpen(false);
  };

  const openWorkflow = (tab: "student-placement" | "teacher-workload", userId: number) => {
    navigate(
      {
        pathname: location.pathname,
        search: updateAdminHubSearch(location.search, { tab, userId }),
      },
      { replace: true },
    );
  };

  const openPassportEditor = () => {
    if (!selectedUser) return;
    passportForm.resetFields();
    passportForm.setFieldsValue({
      passport_series: selectedPassport?.passport_series,
      passport_number: selectedPassport?.passport_number,
      birth_date: selectedPassport?.birth_date,
      extracted_fullname: selectedPassport?.extracted_fullname,
    });
    setPassportFrontFile(null);
    setPassportBackFile(null);
    setPassportSelfieFile(null);
    setPassportModalOpen(true);
  };

  const savePassport = async () => {
    if (!selectedUser) return;
    try {
      const values = await passportForm.validateFields();
      if (!selectedPassport && (!passportFrontFile || !passportBackFile)) {
        message.warning("Passport rasm(lar)i kerak: old va orqa tomoni");
        return;
      }

      const payload = new FormData();
      if (!selectedPassport?.id) {
        payload.append("user", String(selectedUser.id));
      }
      payload.append("passport_series", values.passport_series);
      payload.append("passport_number", values.passport_number);
      if (values.birth_date) payload.append("birth_date", values.birth_date);
      if (values.extracted_fullname) payload.append("extracted_fullname", values.extracted_fullname);
      if (passportFrontFile) payload.append("front_image", passportFrontFile);
      if (passportBackFile) payload.append("back_image", passportBackFile);
      if (passportSelfieFile) payload.append("selfie_image", passportSelfieFile);

      if (selectedPassport?.id) {
        await updatePassportData(selectedPassport.id, payload);
      } else {
        await createPassportData(payload);
      }

      message.success("Passport ma'lumotlari saqlandi");
      await qc.invalidateQueries({ queryKey: ["admin-passports"] });
      setPassportModalOpen(false);
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error("Passport ma'lumotlarini saqlashda xato");
      }
    }
  };

  const onSubmit = (values: Record<string, unknown>) => {
    const payload = { ...values };
    if (!payload.password) {
      delete payload.password;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const columns = [
    {
      title: "Foydalanuvchi",
      key: "user",
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
      title: "Aloqa",
      key: "contact",
      render: (_: unknown, user: AdminUser) => (
        <Space direction="vertical" size={0}>
          <span>{user.email || "-"}</span>
          <span style={{ color: "#64748b" }}>{user.phone || "-"}</span>
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
            roleMutation.mutate({ id: user.id, role: role as "student" | "teacher" | "admin" })
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
          const profile = profileByUser.get(user.id);
          if (!profile) return <Tag color="red">Profil yo'q</Tag>;
          return (
            <Space wrap>
              <Tag color={profile.group ? "green" : "gold"}>
                {profile.group ? groupMap.get(profile.group) || "Guruh biriktirilgan" : "Guruh tanlanmagan"}
              </Tag>
              <Tag>{profile.status || "active"}</Tag>
            </Space>
          );
        }
        if (user.role === "teacher") {
          const assignmentCount = (assignmentsByTeacher.get(user.id) || []).length;
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
              openEdit(user);
            }}
          >
            Tahrirlash
          </Button>
          <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMutation.mutate(user.id)}>
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
        <Button type="primary" onClick={openCreate}>
          Yangi foydalanuvchi
        </Button>
      }
    >
      <Tabs
        activeKey={roleFilter || "all"}
        onChange={setRoleFromTab}
        items={[
          { key: "all", label: `Barchasi (${roleCounts.all})` },
          { key: "admin", label: `Adminlar (${roleCounts.admin})` },
          { key: "teacher", label: `O'qituvchilar (${roleCounts.teacher})` },
          { key: "student", label: `Talabalar (${roleCounts.student})` },
        ]}
        style={{ marginBottom: 12 }}
      />

      <Input
        placeholder="Qidirish: login, ism, email, telefon, guruh yoki fan"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ maxWidth: 360, marginBottom: 12 }}
      />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={filteredUsers}
        columns={columns}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 980 }}
        onRow={(record) => ({
          onClick: () => openProfile(record),
        })}
      />

      <AdminUserFormModal
        editing={editing}
        form={form}
        loading={createMutation.isPending || updateMutation.isPending}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onSubmit={onSubmit}
      />

      <AdminUserProfileDrawer
        directionMap={directionMap}
        groupMap={groupMap}
        onClose={closeProfile}
        onDeletePassport={async () => {
          if (!selectedPassport?.id) return;
          await deletePassportData(selectedPassport.id);
          message.success("Passport ma'lumotlari o'chirildi");
          await qc.invalidateQueries({ queryKey: ["admin-passports"] });
        }}
        onEditUser={() => {
          if (selectedUser) {
            openEdit(selectedUser);
          }
        }}
        onOpenPassportEditor={openPassportEditor}
        onOpenWorkflow={openWorkflow}
        open={drawerOpen}
        passport={selectedPassport}
        studentProfile={selectedStudentProfile}
        subjectMap={subjectMap}
        teacherAssignments={selectedTeacherAssignments}
        user={selectedUser}
      />

      <AdminPassportModal
        form={passportForm}
        open={passportModalOpen}
        passport={selectedPassport}
        onBackFileChange={setPassportBackFile}
        onCancel={() => setPassportModalOpen(false)}
        onFrontFileChange={setPassportFrontFile}
        onSave={savePassport}
        onSelfieFileChange={setPassportSelfieFile}
      />
    </Card>
  );
};

export default UsersPage;
