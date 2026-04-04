import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, message } from "antd";
import {
  AuthGroup,
  PermissionItem,
  createAuthGroup,
  deleteAuthGroup,
  updateAuthGroup,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AuthGroupsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: groups, isLoading } = useQuery(adminQueryOptions.authGroups());
  const { data: permissions } = useQuery(adminQueryOptions.permissions());
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AuthGroup | null>(null);
  const [editForm] = Form.useForm();

  const permOptions = useMemo(
    () =>
      (permissions || []).map((p: PermissionItem) => ({
        value: p.id,
        label: `${p.app_label}.${p.codename} - ${p.name}`,
      })),
    [permissions]
  );

  const createMut = useMutation({
    mutationFn: (vals: any) => createAuthGroup(vals),
    onSuccess: async () => {
      message.success("Guruh qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.authGroups });
    },
    onError: () => message.error(t('common.saveError')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AuthGroup> }) => updateAuthGroup(id, payload),
    onSuccess: async () => {
      message.success("Guruh yangilandi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.authGroups });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAuthGroup(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.authGroups });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  const openEdit = (g: AuthGroup) => {
    setEditing(g);
    editForm.setFieldsValue({ name: g.name, permissions: g.permissions || [] });
    setEditOpen(true);
  };

  return (
    <Card title="Auth guruhlari" style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-4)' }}>
        <Form.Item name="name" label={t('form.name')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="permissions" label="Ruxsatlar">
          <Select mode="multiple" options={permOptions} placeholder="Ruxsatlarni tanlang" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.add')}
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={groups || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: t('form.name'), dataIndex: "name" },
          {
            title: "Ruxsatlar",
            dataIndex: "permissions",
            render: (v: number[]) => (v?.length ? `${v.length} ta` : "0"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: AuthGroup) => (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>
                  {t('common.edit')}
                </Button>
                <Popconfirm title={t('common.confirmDelete')} onConfirm={() => deleteMut.mutate(r.id)}>
                  <Button size="small" danger>
                    {t('common.delete')}
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="Auth guruhni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isPending}
      >
        <Form
          layout="vertical"
          form={editForm}
          onFinish={(vals) => {
            if (!editing) return;
            updateMut.mutate({ id: editing.id, payload: vals });
          }}
        >
          <Form.Item name="name" label={t('form.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="permissions" label="Ruxsatlar">
            <Select mode="multiple" options={permOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AuthGroupsPage;
