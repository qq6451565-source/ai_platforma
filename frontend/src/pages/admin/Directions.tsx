import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty, Popconfirm, Modal } from "antd";
import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { createDirection, deleteDirection, updateDirection } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const DirectionsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: directions, isLoading } = useQuery(adminQueryOptions.directions());
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: { name: string; language?: string }) => createDirection(vals),
    onSuccess: async () => {
      message.success(t('adminDirections.added'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.directions });
    },
    onError: () => message.error(t('adminDirections.addError')),
  });

  return (
    <Card title={t('adminDirections.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="name" rules={[{ required: true, message: t('form.name') }]}>
          <Input placeholder={t('adminDirections.namePlaceholder')} />
        </Form.Item>
        <Form.Item name="language">
          <Input placeholder={t('adminDirections.languagePlaceholder')} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isPending}>
            {t('common.add')}
          </Button>
        </Form.Item>
      </Form>

      <List
        loading={isLoading}
        dataSource={directions || []}
        locale={{ emptyText: <Empty description={t('common.noData')} /> }}
        renderItem={(d) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(d);
                  editForm.setFieldsValue({ name: d.name, language: d.language });
                  setEditOpen(true);
                }}
              >
                {t('common.edit')}
              </Button>,
              <Popconfirm
                title={t('common.confirmDelete')}
                onConfirm={() =>
                  deleteDirection(d.id)
                    .then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.directions }))
                    .catch(() => message.error(t('common.deleteError')))
                }
              >
                <Button danger type="link">
                  {t('common.delete')}
                </Button>
              </Popconfirm>,
            ]}
          >
            {d.name} {d.language ? `(${d.language})` : ""}
          </List.Item>
        )}
      />

      <Modal
        title={t('adminDirections.editTitle')}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateDirection(editItem.id, vals);
            message.success(t('common.updated'));
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.directions });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="name" label={t('form.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="language" label={t('adminDirections.languageLabel')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DirectionsPage;
