import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import {
  AdminUser,
  createAdminUser,
  deleteAdminUser,
  fetchUsers,
  setUserRole,
  updateAdminUser,
} from "../../api/admin";

const UsersPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();

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
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchText && matchRole;
    });
  }, [data, search, roleFilter]);

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
      role: user.role,
      is_active: user.is_active ?? true,
      is_staff: user.is_staff ?? false,
      is_superuser: user.is_superuser ?? false,
    });
    setModalOpen(true);
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
          style={{ minWidth: 120 }}
          onChange={(val) => roleMut.mutate({ id: r.id, role: val })}
          options={[
            { value: "student", label: "student" },
            { value: "teacher", label: "teacher" },
            { value: "admin", label: "admin" },
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
          <Button size="small" onClick={() => openEdit(r)}>
            Tahrirlash
          </Button>
          <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger>
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
      <Space style={{ marginBottom: 12, width: "100%" }}>
        <Input
          placeholder="Qidirish (username, email)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <Select
          allowClear
          placeholder="Rol bo'yicha"
          style={{ width: 180 }}
          value={roleFilter}
          onChange={(v) => setRoleFilter(v)}
          options={[
            { value: "student", label: "student" },
            { value: "teacher", label: "teacher" },
            { value: "admin", label: "admin" },
          ]}
        />
      </Space>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={filtered}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMut.isLoading || updateMut.isLoading}
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
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "student", label: "student" },
                { value: "teacher", label: "teacher" },
                { value: "admin", label: "admin" },
              ]}
            />
          </Form.Item>
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_staff" label="Staff" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_superuser" label="Superuser" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default UsersPage;
