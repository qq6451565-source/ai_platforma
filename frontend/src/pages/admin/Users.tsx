import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
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

  const profileByUser = useMemo(
    () => new Map((studentProfiles || []).map((profile) => [profile.user, profile])),
    [studentProfiles],
  );
  const passportByUser = useMemo(
    () => new Map((passports || []).map((passport) => [passport.user, passport])),
    [passports],
  );
  const assignmentsByTeacher = useMemo(() => {
    const grouped = new Map<number, TeacherSubject[]>();
    (teacherSubjects || []).forEach((item) => {
      const existing = grouped.get(item.teacher) || [];
      existing.push(item);
      grouped.set(item.teacher, existing);
    });
    return grouped;
  }, [teacherSubjects]);
  const directionMap = useMemo(
    () => new Map((directions || []).map((direction) => [direction.id, direction.name])),
    [directions],
  );
  const groupMap = useMemo(
    () => new Map((groups || []).map((group) => [group.id, group.name])),
    [groups],
  );
  const subjectMap = useMemo(
    () => new Map((subjects || []).map((subject) => [subject.id, subject.name])),
    [subjects],
  );

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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users || []).filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (!q) return true;

      const profile = profileByUser.get(user.id);
      const workload = assignmentsByTeacher.get(user.id) || [];
      const directionName = profile?.direction ? directionMap.get(profile.direction) || "" : "";
      const groupName =
        user.group ? groupMap.get(user.group) || "" : profile?.group ? groupMap.get(profile.group) || "" : "";
      const subjectNames = workload
        .map((assignment) => subjectMap.get(assignment.subject) || "")
        .join(" ");

      return (
        user.username.toLowerCase().includes(q) ||
        `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase().includes(q) ||
        (user.email || "").toLowerCase().includes(q) ||
        (user.phone || "").toLowerCase().includes(q) ||
        directionName.toLowerCase().includes(q) ||
        groupName.toLowerCase().includes(q) ||
        subjectNames.toLowerCase().includes(q)
      );
    });
  }, [assignmentsByTeacher, directionMap, groupMap, profileByUser, roleFilter, search, subjectMap, users]);

  const roleCounts = useMemo(() => {
    const data = users || [];
    return {
      all: data.length,
      admin: data.filter((user) => user.role === "admin").length,
      teacher: data.filter((user) => user.role === "teacher").length,
      student: data.filter((user) => user.role === "student").length,
    };
  }, [users]);

  const setRoleFromTab = (key: string) => {
    const params = new URLSearchParams(location.search);
    params.set("tab", "users");
    if (key === "all") {
      params.delete("role");
      setRoleFilter(null);
    } else {
      params.set("role", key);
      setRoleFilter(key);
    }
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

  const closeProfile = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    setPassportModalOpen(false);
  };

  const openWorkflow = (tab: "student-placement" | "teacher-workload", userId: number) => {
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);
    params.set("userId", String(userId));
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
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

      <Modal
        title={editing ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
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

      <Drawer title="Foydalanuvchi profili" open={drawerOpen} onClose={closeProfile} width={460}>
        {selectedUser ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Space wrap>
              <Button size="small" onClick={() => openEdit(selectedUser)}>
                Asosiy ma'lumotlarni tahrirlash
              </Button>
              {selectedUser.role === "student" ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => openWorkflow("student-placement", selectedUser.id)}
                >
                  Placementni ochish
                </Button>
              ) : null}
              {selectedUser.role === "teacher" ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => openWorkflow("teacher-workload", selectedUser.id)}
                >
                  Workloadni ochish
                </Button>
              ) : null}
            </Space>

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

            {selectedUser.role === "student" ? (
              <Card
                size="small"
                title="Student Placement"
                extra={
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => openWorkflow("student-placement", selectedUser.id)}
                  >
                    Workflowga o'tish
                  </Button>
                }
              >
                {selectedStudentProfile ? (
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="Yo'nalish">
                      {selectedStudentProfile.direction
                        ? directionMap.get(selectedStudentProfile.direction) || "-"
                        : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Guruh">
                      {selectedStudentProfile.group
                        ? groupMap.get(selectedStudentProfile.group) || "-"
                        : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Qabul yili">
                      {selectedStudentProfile.admission_year || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      {selectedStudentProfile.status || "-"}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <div>Student profile hali yaratilmagan yoki placement berilmagan.</div>
                )}
              </Card>
            ) : null}

            {selectedUser.role === "teacher" ? (
              <Card
                size="small"
                title="Teacher Workload"
                extra={
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => openWorkflow("teacher-workload", selectedUser.id)}
                  >
                    Workflowga o'tish
                  </Button>
                }
              >
                {selectedTeacherAssignments.length ? (
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    {selectedTeacherAssignments.map((assignment) => (
                      <Descriptions key={assignment.id} size="small" column={1} bordered>
                        <Descriptions.Item label="Fan">
                          {subjectMap.get(assignment.subject) || `Fan #${assignment.subject}`}
                        </Descriptions.Item>
                        <Descriptions.Item label="Guruhlar">
                          {assignment.groups?.length ? (
                            <Space wrap>
                              {assignment.groups.map((groupId) => (
                                <Tag key={groupId}>{groupMap.get(groupId) || `#${groupId}`}</Tag>
                              ))}
                            </Space>
                          ) : (
                            "-"
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    ))}
                  </Space>
                ) : (
                  <div>Teacher uchun hali workload biriktirilmagan.</div>
                )}
              </Card>
            ) : null}

            <Card
              size="small"
              title="Passport ma'lumotlari"
              extra={
                <Space>
                  <Button size="small" onClick={openPassportEditor}>
                    {selectedPassport ? "Tahrirlash" : "Yaratish"}
                  </Button>
                  {selectedPassport ? (
                    <Popconfirm
                      title="Passport ma'lumotlarini o'chirishni tasdiqlaysizmi?"
                      onConfirm={async () => {
                        if (!selectedPassport.id) return;
                        await deletePassportData(selectedPassport.id);
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
              {selectedPassport ? (
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="Seriya">{selectedPassport.passport_series}</Descriptions.Item>
                  <Descriptions.Item label="Raqam">{selectedPassport.passport_number}</Descriptions.Item>
                  <Descriptions.Item label="Tug'ilgan sana">
                    {selectedPassport.birth_date || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="OCR ism-familiya">
                    {selectedPassport.extracted_fullname || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Old tomoni">
                    {selectedPassport.front_image ? (
                      <a href={selectedPassport.front_image} target="_blank" rel="noreferrer">
                        Ko'rish
                      </a>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Orqa tomoni">
                    {selectedPassport.back_image ? (
                      <a href={selectedPassport.back_image} target="_blank" rel="noreferrer">
                        Ko'rish
                      </a>
                    ) : (
                      "-"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Selfi">
                    {selectedPassport.selfie_image ? (
                      <a href={selectedPassport.selfie_image} target="_blank" rel="noreferrer">
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
        title="Passport ma'lumotlarini tahrirlash"
        open={passportModalOpen}
        onCancel={() => setPassportModalOpen(false)}
        onOk={savePassport}
        destroyOnClose
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
            {selectedPassport?.front_image ? (
              <div style={{ marginTop: 8 }}>
                <a href={selectedPassport.front_image} target="_blank" rel="noreferrer">
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
            {selectedPassport?.back_image ? (
              <div style={{ marginTop: 8 }}>
                <a href={selectedPassport.back_image} target="_blank" rel="noreferrer">
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
            {selectedPassport?.selfie_image ? (
              <div style={{ marginTop: 8 }}>
                <a href={selectedPassport.selfie_image} target="_blank" rel="noreferrer">
                  Hozirgi rasm
                </a>
              </div>
            ) : null}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UsersPage;
