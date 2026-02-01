import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
  Upload,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AdminUser,
  createAdminUser,
  deleteAdminUser,
  deletePassportData,
  fetchDirections,
  fetchGroupsAdmin,
  fetchPassportData,
  fetchStudentProfiles,
  fetchSubjectsAdmin,
  fetchTeacherSubjects,
  fetchUsers,
  createStudentProfile,
  createPassportData,
  createTeacherSubject,
  setUserRole,
  updatePassportData,
  updateStudentProfile,
  updateTeacherSubject,
  updateAdminUser,
  deleteTeacherSubject,
} from "../../api/admin";

const UsersPage = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
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
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm] = Form.useForm();
  const [savingProfile, setSavingProfile] = useState(false);
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [passportForm] = Form.useForm();
  const [passportSaving, setPassportSaving] = useState(false);
  const [passportFrontFile, setPassportFrontFile] = useState<File | null>(null);
  const [passportBackFile, setPassportBackFile] = useState<File | null>(null);
  const [passportSelfieFile, setPassportSelfieFile] = useState<File | null>(null);
  const [teacherAssignModalOpen, setTeacherAssignModalOpen] = useState(false);
  const [teacherAssignForm] = Form.useForm();
  const [teacherAssignSaving, setTeacherAssignSaving] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [selectedDirectionId, setSelectedDirectionId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "student" | "teacher" | "admin" }) =>
      setUserRole(id, role),
    onSuccess: async () => {
      message.success("Rol yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => message.error("Rolni yangilashda xato"),
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => createAdminUser(payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error("Foydalanuvchi qo'shishda xato"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateAdminUser(id, payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  const filtered = useMemo(() => {
    const list = data || [];
    return list.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchText =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchText && matchRole;
    });
  }, [data, search, roleFilter]);
  const studentsOnly = useMemo(
    () => (data || []).filter((u) => u.role === "student"),
    [data]
  );
  const filteredStudents = useMemo(() => {
    const list = studentsOnly || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      return (
        u.username.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
      );
    });
  }, [studentsOnly, search]);

  const roleCounts = useMemo(() => {
    const list = data || [];
    return {
      all: list.length,
      admin: list.filter((u) => u.role === "admin").length,
      teacher: list.filter((u) => u.role === "teacher").length,
      student: list.filter((u) => u.role === "student").length,
    };
  }, [data]);

  const directionMap = useMemo(
    () => new Map((directions || []).map((d) => [d.id, d.name])),
    [directions]
  );
  const groupMap = useMemo(
    () => new Map((groups || []).map((g) => [g.id, g.name])),
    [groups]
  );
  const subjectMap = useMemo(
    () => new Map((subjects || []).map((s) => [s.id, s.name])),
    [subjects]
  );

  const studentProfile = useMemo(() => {
    if (!selectedUser) return null;
    return (studentProfiles || []).find((p) => p.user === selectedUser.id) || null;
  }, [selectedUser, studentProfiles]);

  const teacherAssignments = useMemo(() => {
    if (!selectedUser) return [];
    return (teacherSubjects || []).filter((t) => t.teacher === selectedUser.id);
  }, [selectedUser, teacherSubjects]);

  const passportData = useMemo(() => {
    if (!selectedUser) return null;
    return (passports || []).find((p) => p.user === selectedUser.id) || null;
  }, [selectedUser, passports]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get("role");
    if (role === "admin" || role === "teacher" || role === "student") {
      setRoleFilter(role);
    } else {
      setRoleFilter(null);
    }
  }, [location.search]);
  useEffect(() => {
    setSelectedDirectionId(null);
    setSelectedGroupId(null);
  }, [roleFilter]);

  const setRoleFromTab = (key: string) => {
    const params = new URLSearchParams(location.search);
    if (key === "all") {
      params.delete("role");
      setRoleFilter(null);
    } else {
      params.set("role", key);
      setRoleFilter(key);
    }
    params.set("tab", "users");
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
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

  const openProfileEditor = () => {
    if (!selectedUser) return;
    profileForm.setFieldsValue({
      direction: studentProfile?.direction,
      group: studentProfile?.group,
      admission_year: studentProfile?.admission_year,
      status: studentProfile?.status,
    });
    setProfileModalOpen(true);
  };

  const saveProfile = async () => {
    if (!selectedUser) return;
    setSavingProfile(true);
    try {
      const vals = await profileForm.validateFields();
      if (studentProfile?.id) {
        await updateStudentProfile(studentProfile.id, vals);
      } else {
        await createStudentProfile({ ...vals, user: selectedUser.id });
      }
      await qc.invalidateQueries({ queryKey: ["admin-student-profiles"] });
      message.success("Profil saqlandi");
      setProfileModalOpen(false);
    } catch (err: any) {
      if (!err?.errorFields) {
        message.error("Profilni saqlashda xato");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const openPassportEditor = () => {
    if (!selectedUser) return;
    passportForm.resetFields();
    passportForm.setFieldsValue({
      passport_series: passportData?.passport_series,
      passport_number: passportData?.passport_number,
      birth_date: passportData?.birth_date,
      extracted_fullname: passportData?.extracted_fullname,
    });
    setPassportFrontFile(null);
    setPassportBackFile(null);
    setPassportSelfieFile(null);
    setPassportModalOpen(true);
  };

  const savePassport = async () => {
    if (!selectedUser) return;
    setPassportSaving(true);
    try {
      const vals = await passportForm.validateFields();
      if (!passportData && (!passportFrontFile || !passportBackFile)) {
        message.warning("Passport rasm(lar)i kerak: old va orqa tomoni");
        return;
      }
      const payload = new FormData();
      if (!passportData?.id) {
        payload.append("user", String(selectedUser.id));
      }
      payload.append("passport_series", vals.passport_series);
      payload.append("passport_number", vals.passport_number);
      if (vals.birth_date) payload.append("birth_date", vals.birth_date);
      if (vals.extracted_fullname) payload.append("extracted_fullname", vals.extracted_fullname);
      if (passportFrontFile) payload.append("front_image", passportFrontFile);
      if (passportBackFile) payload.append("back_image", passportBackFile);
      if (passportSelfieFile) payload.append("selfie_image", passportSelfieFile);
      if (passportData?.id) {
        await updatePassportData(passportData.id, payload);
      } else {
        await createPassportData(payload);
      }
      message.success("Passport ma'lumotlari saqlandi");
      await qc.invalidateQueries({ queryKey: ["admin-passports"] });
      setPassportModalOpen(false);
    } catch (err: any) {
      if (!err?.errorFields) {
        message.error("Passport ma'lumotlarini saqlashda xato");
      }
    } finally {
      setPassportSaving(false);
    }
  };

  const openTeacherAssignment = (assignment?: any) => {
    if (!selectedUser) return;
    setEditingAssignment(assignment || null);
    teacherAssignForm.resetFields();
    if (assignment) {
      teacherAssignForm.setFieldsValue({
        subject: assignment.subject,
        groups: assignment.groups || [],
      });
    }
    setTeacherAssignModalOpen(true);
  };

  const saveTeacherAssignment = async () => {
    if (!selectedUser) return;
    setTeacherAssignSaving(true);
    try {
      const vals = await teacherAssignForm.validateFields();
      const payload = {
        teacher: selectedUser.id,
        subject: vals.subject,
        groups: vals.groups || [],
      };
      if (editingAssignment?.id) {
        await updateTeacherSubject(editingAssignment.id, payload);
      } else {
        await createTeacherSubject(payload);
      }
      message.success("Fan va guruh biriktirildi");
      await qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] });
      setTeacherAssignModalOpen(false);
      setEditingAssignment(null);
    } catch (err: any) {
      if (!err?.errorFields) {
        message.error("Biriktirishda xato");
      }
    } finally {
      setTeacherAssignSaving(false);
    }
  };

  const onSubmit = (values: any) => {
    const payload = { ...values };
    if (!payload.password) {
      delete payload.password;
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const columns = [
    {
      title: "Foydalanuvchi",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Ism",
      key: "full_name",
      render: (_: unknown, r: AdminUser) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "-",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (v: string) => v || "-",
    },
    {
      title: "Rol",
      key: "role",
      render: (_: unknown, r: AdminUser) => (
        <Select
          size="small"
          value={r.role}
          style={{ minWidth: 140 }}
          onChange={(val) =>
            roleMut.mutate({ id: r.id, role: val as "student" | "teacher" | "admin" })
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
      title: "Status",
      key: "status",
      render: (_: unknown, r: AdminUser) =>
        r.is_active ? <Tag color="green">faol</Tag> : <Tag color="red">blok</Tag>,
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_: unknown, r: AdminUser) => (
        <Space>
          <Button size="small" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
            Tahrirlash
          </Button>
          <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger onClick={(e) => e.stopPropagation()}>
              O'chirish
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const studentColumns = [
    {
      title: "Talaba",
      key: "student_name",
      render: (_: unknown, r: AdminUser) =>
        `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.username || `#${r.id}`,
    },
    {
      title: "Login",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Guruh",
      key: "group",
      render: (_: unknown, r: AdminUser) =>
        r.group ? groupMap.get(r.group) || "-" : "-",
    },
    {
      title: "Telefon",
      dataIndex: "phone",
      key: "phone",
      render: (v: string) => v || "-",
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, r: AdminUser) =>
        r.is_active ? <Tag color="green">faol</Tag> : <Tag color="red">blok</Tag>,
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_: unknown, r: AdminUser) => (
        <Space>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
          >
            Tahrirlash
          </Button>
          <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger onClick={(e) => e.stopPropagation()}>
              O'chirish
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const directionCards = useMemo(() => {
    return (directions || [])
      .map((dir) => {
        const dirGroups = (groups || []).filter((g) => g.direction === dir.id);
        const studentCount = studentsOnly.filter((s) => {
          if (!s.group) return false;
          const grp = (groups || []).find((g) => g.id === s.group);
          return grp?.direction === dir.id;
        }).length;
        return {
          id: dir.id,
          name: dir.name,
          language: dir.language,
          groupCount: dirGroups.length,
          studentCount,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [directions, groups, studentsOnly]);
  const groupCards = useMemo(() => {
    if (!selectedDirectionId) return [];
    return (groups || [])
      .filter((g) => g.direction === selectedDirectionId)
      .map((g) => ({
        id: g.id,
        name: g.name,
        language: g.language,
        level: g.level,
        studentCount: studentsOnly.filter((s) => s.group === g.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, selectedDirectionId, studentsOnly]);
  const studentsForGroup = useMemo(() => {
    if (!selectedGroupId) return [];
    return filteredStudents.filter((s) => s.group === selectedGroupId);
  }, [filteredStudents, selectedGroupId]);

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
      {roleFilter !== "student" || selectedGroupId ? (
        <Space style={{ marginBottom: 12, width: "100%" }}>
          <Input
            placeholder="Qidirish (login, email, ism, telefon)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 240 }}
          />
        </Space>
      ) : null}
      {roleFilter === "student" ? (
        !selectedDirectionId ? (
          directionCards.length ? (
            <List
              grid={{ gutter: 12, column: 3 }}
              dataSource={directionCards}
              renderItem={(dir) => (
                <List.Item>
                  <Card hoverable onClick={() => setSelectedDirectionId(dir.id)}>
                    <div style={{ fontWeight: 600 }}>{dir.name}</div>
                    <div style={{ marginTop: 6, color: "#94a3b8" }}>
                      {dir.language?.toUpperCase() || "LANG"} • Guruhlar: {dir.groupCount} • Talabalar:{" "}
                      {dir.studentCount}
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="Yo'nalishlar yo'q" />
          )
        ) : !selectedGroupId ? (
          <>
            <Space style={{ marginBottom: 12 }}>
              <Button onClick={() => setSelectedDirectionId(null)}>Orqaga</Button>
            </Space>
            {groupCards.length ? (
              <List
                grid={{ gutter: 12, column: 3 }}
                dataSource={groupCards}
                renderItem={(group) => (
                  <List.Item>
                    <Card hoverable onClick={() => setSelectedGroupId(group.id)}>
                      <div style={{ fontWeight: 600 }}>{group.name}</div>
                      <div style={{ marginTop: 6, color: "#94a3b8" }}>
                        {group.language?.toUpperCase() || "LANG"} • {group.level || "-"}-bosqich • Talabalar:{" "}
                        {group.studentCount}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Guruhlar yo'q" />
            )}
          </>
        ) : (
          <>
            <Space style={{ marginBottom: 12 }}>
              <Button
                onClick={() => {
                  setSelectedGroupId(null);
                }}
              >
                Orqaga
              </Button>
            </Space>
            <Table
              rowKey="id"
              loading={isLoading}
              dataSource={studentsForGroup}
              columns={studentColumns}
              onRow={(record) => ({
                onClick: () => openProfile(record),
              })}
              pagination={{ pageSize: 10 }}
            />
          </>
        )
      ) : (
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={filtered}
          columns={columns}
          onRow={(record) => ({
            onClick: () => openProfile(record),
          })}
          pagination={{ pageSize: 10 }}
        />
      )}

      <Modal
        title={editing ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
      >
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Parol"
            rules={editing ? [] : [{ required: true, message: "Parol kiriting" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="first_name" label="Ism">
            <Input />
          </Form.Item>
          <Form.Item name="last_name" label="Familiya">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telefon">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "student", label: "Talaba" },
                { value: "teacher", label: "O'qituvchi" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </Form.Item>
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Foydalanuvchi profili"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedUser(null);
          setProfileModalOpen(false);
          setPassportModalOpen(false);
          setTeacherAssignModalOpen(false);
          setEditingAssignment(null);
        }}
        width={420}
      >
        {selectedUser ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Button size="small" onClick={() => openEdit(selectedUser)}>
              Asosiy ma'lumotlarni tahrirlash
            </Button>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Login">{selectedUser.username}</Descriptions.Item>
              <Descriptions.Item label="Ism">{selectedUser.first_name || "-"}</Descriptions.Item>
              <Descriptions.Item label="Familiya">{selectedUser.last_name || "-"}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedUser.email || "-"}</Descriptions.Item>
              <Descriptions.Item label="Telefon">{selectedUser.phone || "-"}</Descriptions.Item>
              <Descriptions.Item label="Guruh">
                {selectedUser.group ? groupMap.get(selectedUser.group) || "-" : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Rol">
                {selectedUser.role === "student"
                  ? "Talaba"
                  : selectedUser.role === "teacher"
                    ? "O'qituvchi"
                    : "Admin"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {selectedUser.is_active ? "Faol" : "Bloklangan"}
              </Descriptions.Item>
            </Descriptions>

            {selectedUser.role === "student" && (
              <Card
                size="small"
                title="Talaba profili"
                extra={
                  <Button size="small" onClick={openProfileEditor}>
                    {studentProfile ? "Tahrirlash" : "Profil yaratish"}
                  </Button>
                }
              >
                {studentProfile ? (
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="Yo'nalish">
                      {studentProfile.direction
                        ? directionMap.get(studentProfile.direction) || "-"
                        : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Guruh">
                      {studentProfile.group ? groupMap.get(studentProfile.group) || "-" : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Qabul yili">
                      {studentProfile.admission_year}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">{studentProfile.status}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <div>Profil hali yaratilmagan.</div>
                )}
              </Card>
            )}

            {selectedUser.role === "teacher" && (
              <Card
                size="small"
                title="O'qituvchi fan va guruhlari"
                extra={
                  <Button size="small" onClick={() => openTeacherAssignment()}>
                    Fan biriktirish
                  </Button>
                }
              >
                {teacherAssignments.length ? (
                  <List
                    dataSource={teacherAssignments}
                    renderItem={(assignment) => (
                      <List.Item
                        actions={[
                          <Button size="small" onClick={() => openTeacherAssignment(assignment)}>
                            Tahrirlash
                          </Button>,
                          <Popconfirm
                            title="Biriktirishni o'chirish?"
                            onConfirm={async () => {
                              await deleteTeacherSubject(assignment.id);
                              message.success("O'chirildi");
                              await qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] });
                            }}
                          >
                            <Button size="small" danger>
                              O'chirish
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <Descriptions size="small" column={1} bordered style={{ width: "100%" }}>
                          <Descriptions.Item label="Fan">
                            {subjectMap.get(assignment.subject) || "-"}
                          </Descriptions.Item>
                          <Descriptions.Item label="Guruhlar">
                            {assignment.groups?.length ? (
                              <Space wrap>
                                {assignment.groups.map((groupId) => (
                                  <Tag key={groupId}>{groupMap.get(groupId) || "-"}</Tag>
                                ))}
                              </Space>
                            ) : (
                              "-"
                            )}
                          </Descriptions.Item>
                        </Descriptions>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div>Fan va guruh biriktirilmagan.</div>
                )}
              </Card>
            )}

            <Card
              size="small"
              title="Passport ma'lumotlari"
              extra={
                <Space>
                  <Button size="small" onClick={openPassportEditor}>
                    {passportData ? "Tahrirlash" : "Yaratish"}
                  </Button>
                  {passportData ? (
                    <Popconfirm
                      title="Passport ma'lumotlarini o'chirishni tasdiqlaysizmi?"
                      onConfirm={async () => {
                        if (!passportData?.id) return;
                        await deletePassportData(passportData.id);
                        message.success("Passport ma'lumotlari o'chirildi");
                        await qc.invalidateQueries({ queryKey: ["admin-passports"] });
                      }}
                    >
                      <Button size="small" danger>
                        O'chirish
                      </Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              }
            >
              {passportData ? (
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="Seriya">{passportData.passport_series}</Descriptions.Item>
                  <Descriptions.Item label="Raqam">{passportData.passport_number}</Descriptions.Item>
                  <Descriptions.Item label="Tug'ilgan sana">
                    {passportData.birth_date || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="OCR ism-familiya">
                    {passportData.extracted_fullname || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Old tomoni">
                    {passportData.front_image ? (
                      <a href={passportData.front_image} target="_blank" rel="noreferrer">
                        Ko'rish
                      </a>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Orqa tomoni">
                    {passportData.back_image ? (
                      <a href={passportData.back_image} target="_blank" rel="noreferrer">
                        Ko'rish
                      </a>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Selfi">
                    {passportData.selfie_image ? (
                      <a href={passportData.selfie_image} target="_blank" rel="noreferrer">
                        Ko'rish
                      </a>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <div>Passport ma'lumotlari yo'q.</div>
              )}
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="Talaba profilini tahrirlash"
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        onOk={saveProfile}
        confirmLoading={savingProfile}
      >
        <Form layout="vertical" form={profileForm}>
          <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh">
            <Select
              showSearch
              allowClear
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
          <Form.Item name="admission_year" label="Qabul yili" rules={[{ required: true }]}>
            <Input type="number" min={2000} max={2100} />
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
      </Modal>

      <Modal
        title="Passport ma'lumotlarini tahrirlash"
        open={passportModalOpen}
        onCancel={() => setPassportModalOpen(false)}
        onOk={savePassport}
        confirmLoading={passportSaving}
      >
        <Form layout="vertical" form={passportForm}>
          <Form.Item name="passport_series" label="Seriya" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="passport_number" label="Raqam" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="birth_date" label="Tug'ilgan sana">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="extracted_fullname" label="OCR ism-familiya">
            <Input />
          </Form.Item>
          <Form.Item label="Passport old tomoni">
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              onChange={(info) => {
                const file = info.fileList[0]?.originFileObj as File | undefined;
                setPassportFrontFile(file || null);
              }}
            >
              <Button icon={<UploadOutlined />}>Yangi rasm tanlash</Button>
            </Upload>
            {passportData?.front_image ? (
              <div style={{ marginTop: 8 }}>
                <a href={passportData.front_image} target="_blank" rel="noreferrer">
                  Hozirgi rasm
                </a>
              </div>
            ) : null}
          </Form.Item>
          <Form.Item label="Passport orqa tomoni">
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              onChange={(info) => {
                const file = info.fileList[0]?.originFileObj as File | undefined;
                setPassportBackFile(file || null);
              }}
            >
              <Button icon={<UploadOutlined />}>Yangi rasm tanlash</Button>
            </Upload>
            {passportData?.back_image ? (
              <div style={{ marginTop: 8 }}>
                <a href={passportData.back_image} target="_blank" rel="noreferrer">
                  Hozirgi rasm
                </a>
              </div>
            ) : null}
          </Form.Item>
          <Form.Item label="Selfi">
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              onChange={(info) => {
                const file = info.fileList[0]?.originFileObj as File | undefined;
                setPassportSelfieFile(file || null);
              }}
            >
              <Button icon={<UploadOutlined />}>Yangi rasm tanlash</Button>
            </Upload>
            {passportData?.selfie_image ? (
              <div style={{ marginTop: 8 }}>
                <a href={passportData.selfie_image} target="_blank" rel="noreferrer">
                  Hozirgi rasm
                </a>
              </div>
            ) : null}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingAssignment ? "Fan biriktirishni tahrirlash" : "Fan biriktirish"}
        open={teacherAssignModalOpen}
        onCancel={() => {
          setTeacherAssignModalOpen(false);
          setEditingAssignment(null);
        }}
        onOk={saveTeacherAssignment}
        confirmLoading={teacherAssignSaving}
      >
        <Form layout="vertical" form={teacherAssignForm}>
          <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="groups" label="Guruhlar">
            <Select
              mode="multiple"
              allowClear
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UsersPage;
