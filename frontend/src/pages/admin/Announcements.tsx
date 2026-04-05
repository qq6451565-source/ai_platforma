import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty } from "antd";
import { useTranslation } from 'react-i18next';
import {
  createAnnouncementAdmin,
  deleteAnnouncementAdmin,
  AdminAnnouncement,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminAnnouncementsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminQueryOptions.announcements());

  const createMut = useMutation({
    mutationFn: (vals: { title: string; content: string }) => createAnnouncementAdmin(vals),
    onSuccess: async () => {
      message.success(t('adminAnnouncements.added'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.announcements });
    },
    onError: () => message.error(t('adminAnnouncements.addError')),
  });

  const remove = (id: number) =>
    deleteAnnouncementAdmin(id)
      .then(() => {
        message.success(t('common.deleted'));
        qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.announcements });
      })
      .catch(() => message.error(t('adminAnnouncements.deleteError')));

  return (
    <Card title={t('adminAnnouncements.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="title" label={t('adminAnnouncements.title')} rules={[{ required: true, message: t('adminAnnouncements.titleRequired') }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="content"
          label={t('adminAnnouncements.content')}
          rules={[{ required: true, message: t('adminAnnouncements.contentRequired') }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.save')}
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={data || []}
        locale={{ emptyText: <Empty description={t('common.noData')} /> }}
        renderItem={(a: AdminAnnouncement) => (
          <List.Item
            actions={[
              <Button danger type="link" onClick={() => remove(a.id)}>
                {t('common.delete')}
              </Button>,
            ]}
          >
            <List.Item.Meta title={a.title} description={a.content} />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default AdminAnnouncementsPage;
