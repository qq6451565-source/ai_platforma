import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message } from "antd";
import { createTestQuestion, deleteTestQuestion, updateTestQuestion } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const TestQuestionsPage = () => {
  const qc = useQueryClient();
  const { data: questions, isLoading } = useQuery(adminQueryOptions.testQuestions());
  const { data: tests } = useQuery(adminQueryOptions.tests());

  const testOptions = useMemo(
    () => (tests || []).map((t: any) => ({ value: t.id, label: t.title })),
    [tests]
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm] = Form.useForm();

  const createMut = useMutation({
    mutationFn: (vals: any) => createTestQuestion(vals),
    onSuccess: async () => {
      message.success("Savol qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testQuestions });
    },
    onError: () => message.error("Saqlashda xato"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateTestQuestion(id, payload),
    onSuccess: async () => {
      message.success("Savol yangilandi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testQuestions });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTestQuestion(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testQuestions });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  const openEdit = (row: any) => {
    setEditing(row);
    editForm.setFieldsValue({
      test: row.test,
      text: row.text,
      order: row.order,
      points: row.points,
    });
    setEditOpen(true);
  };

  return (
    <Card title="Test savollari" style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="test" label="Test" rules={[{ required: true }]}>
          <Select options={testOptions} placeholder="Test tanlang" />
        </Form.Item>
        <Form.Item name="text" label="Savol matni" rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Space style={{ display: "flex" }}>
          <Form.Item name="order" label="Tartib" rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="points" label="Ball" rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          Qo'shish
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={questions || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "Test", dataIndex: "test", render: (v: number) => testOptions.find((t) => t.value === v)?.label || v },
          { title: "Savol", dataIndex: "text" },
          { title: "Tartib", dataIndex: "order" },
          { title: "Ball", dataIndex: "points" },
          {
            title: "Amallar",
            render: (_: unknown, r: any) => (
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
        ]}
      />

      <Modal
        title="Savolni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isPending}
      >
        <Form layout="vertical" form={editForm} onFinish={(vals) => updateMut.mutate({ id: editing.id, payload: vals })}>
          <Form.Item name="test" label="Test" rules={[{ required: true }]}>
            <Select options={testOptions} />
          </Form.Item>
          <Form.Item name="text" label="Savol matni" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ display: "flex" }}>
            <Form.Item name="order" label="Tartib" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="points" label="Ball" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default TestQuestionsPage;
