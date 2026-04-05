import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Select, Button, List, Empty, Popconfirm, message } from "antd";
import { useTranslation } from 'react-i18next';
import { createLiveRoom, deleteLiveRoom } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminLiveRoomsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rooms, isLoading } = useQuery(adminQueryOptions.liveRooms());
  const { data: lessons } = useQuery(adminQueryOptions.lessons());

  const createMut = useMutation({
    mutationFn: (vals: any) => createLiveRoom(vals.lesson_id),
    onSuccess: async () => {
      message.success(t('adminLive.roomCreated'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.liveRooms });
    },
    onError: () => message.error(t('common.error')),
  });

  return (
    <Card title={t('adminLive.rooms')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="lesson_id" rules={[{ required: true, message: t('adminLive.lesson') }]}>
          <Select
            showSearch
            placeholder={t('adminLive.selectLesson')}
            style={{ width: 240 }}
            options={(lessons || []).map((l) => ({ value: l.id, label: l.topic || t('adminLive.lessonNumber', { id: l.id }) }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.add')}
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={rooms || []}
        locale={{ emptyText: <Empty description={t('common.noData')} /> }}
        renderItem={(r) => (
          <List.Item
            actions={[
              <Popconfirm
                title={t('common.confirmDelete')}
                onConfirm={() =>
                  deleteLiveRoom(r.id)
                    .then(() => {
                      message.success(t('common.deleted'));
                      qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.liveRooms });
                    })
                    .catch(() => message.error(t('common.error')))
                }
              >
                <Button danger type="link">{t('common.delete')}</Button>
              </Popconfirm>,
            ]}
          >
            {r.lesson_topic || t('adminLive.lessonNumber', { id: r.lesson })} | {r.room_name} | {r.is_active ? "Active" : "Inactive"}
          </List.Item>
        )}
      />
    </Card>
  );
};

export default AdminLiveRoomsPage;
