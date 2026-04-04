import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, message } from "antd";
import {
  createTestOption,
  deleteTestOption,
  updateTestOption,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const TestOptionsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: options, isLoading } = useQuery(adminQueryOptions.testOptions());
  const { data: questions } = useQuery(adminQueryOptions.testQuestions());

  const questionOptions = useMemo(
    () =>
      (questions || []).map((q) => ({
        value: q.id,
        label: `#${q.id} - ${q.text.slice(0, 60)}`,
      })),
    [questions]
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm] = Form.useForm();

  const createMut = useMutation({
    mutationFn: (vals: any) => createTestOption(vals),
    onSuccess: async () => {
      message.success("Variant qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testOptions });
    },
    onError: () => message.error(t('common.saveError')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateTestOption(id, payload),
    onSuccess: async () => {
      message.success("Variant yangilandi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testOptions });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTestOption(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testOptions });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  const openEdit = (row: any) => {
    setEditing(row);
    editForm.setFieldsValue({
      question: row.question,
      text: row.text,
      is_correct: row.is_correct,
    });
    setEditOpen(true);
  };

  return (
    <Card title="Test variantlari" style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="question" label="Savol" rules={[{ required: true }]}>
          <Select options={questionOptions} placeholder="Savol tanlang" />
        </Form.Item>
        <Form.Item name="text" label="Variant matni" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="is_correct" label="To'g'ri javob" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.add')}
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={options || []}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "Savol",
            dataIndex: "question",
            render: (v: number) => questionOptions.find((q) => q.value === v)?.label || v,
          },
          { title: "Matn", dataIndex: "text" },
          {
            title: "To'g'ri",
            dataIndex: "is_correct",
            render: (v: boolean) => (v ? "ha" : "yo'q"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: any) => (
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
        title="Variantni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isPending}
      >
        <Form layout="vertical" form={editForm} onFinish={(vals) => updateMut.mutate({ id: editing.id, payload: vals })}>
          <Form.Item name="question" label="Savol" rules={[{ required: true }]}>
            <Select options={questionOptions} />
          </Form.Item>
          <Form.Item name="text" label="Variant matni" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="is_correct" label="To'g'ri javob" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TestOptionsPage;
