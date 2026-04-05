import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message } from "antd";
import { createTestQuestion, deleteTestQuestion, updateTestQuestion } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const TestQuestionsPage = () => {
  const { t } = useTranslation();
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
      message.success(t('common.saved'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testQuestions });
    },
    onError: () => message.error(t('common.saveError')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateTestQuestion(id, payload),
    onSuccess: async () => {
      message.success(t('common.updated'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testQuestions });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteTestQuestion(id),
    onSuccess: async () => {
      message.success(t('common.deleted'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.testQuestions });
    },
    onError: () => message.error(t('common.deleteError')),
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
    <Card title={t('adminTestQuestions.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="test" label={t('studentTests.test')} rules={[{ required: true }]}>
          <Select options={testOptions} placeholder={t('adminTestQuestions.selectTest')} />
        </Form.Item>
        <Form.Item name="text" label={t('adminTestQuestions.questionText')} rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Space style={{ display: "flex" }}>
          <Form.Item name="order" label={t('adminTestQuestions.order')} rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="points" label={t('form.score')} rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.add')}
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={questions || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: t('studentTests.test'), dataIndex: "test", render: (v: number) => testOptions.find((t) => t.value === v)?.label || v },
          { title: t('adminTestQuestions.question'), dataIndex: "text" },
          { title: t('adminTestQuestions.order'), dataIndex: "order" },
          { title: t('form.score'), dataIndex: "points" },
          {
            title: t('common.actions'),
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
        title={t('adminTestQuestions.editTitle')}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isPending}
      >
        <Form layout="vertical" form={editForm} onFinish={(vals) => updateMut.mutate({ id: editing.id, payload: vals })}>
          <Form.Item name="test" label={t('studentTests.test')} rules={[{ required: true }]}>
            <Select options={testOptions} />
          </Form.Item>
          <Form.Item name="text" label={t('adminTestQuestions.questionText')} rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ display: "flex" }}>
            <Form.Item name="order" label={t('adminTestQuestions.order')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="points" label={t('form.score')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default TestQuestionsPage;
