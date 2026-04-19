import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Popconfirm, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import { deleteLiveParticipant } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const LiveParticipantsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: participants, isLoading } = useQuery(adminQueryOptions.liveParticipants());
  const { data: rooms } = useQuery(adminQueryOptions.liveRooms());

  const roomMap = useMemo(() => new Map((rooms || []).map((r: any) => [r.id, r.room_name])), [rooms]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteLiveParticipant(id),
    onSuccess: async () => {
      message.success(t('common.deleted'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.liveParticipants });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  return (
    <Card title={t('adminLive.participants')} style={{ marginBottom: 'var(--space-4)' }}>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={participants || []}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: t('adminLive.user'), dataIndex: "user_name", render: (v: string) => v || "-" },
          {
            title: t('adminLive.room'),
            dataIndex: "room",
            render: (v: number) => roomMap.get(v) || v,
          },
          {
            title: t('adminLive.role'),
            dataIndex: "is_teacher",
            render: (v: boolean) => (v ? <Tag color="geekblue">teacher</Tag> : <Tag color="green">student</Tag>),
          },
          {
            title: t('adminLive.joinedAt'),
            dataIndex: "joined_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: t('adminLive.leftAt'),
            dataIndex: "left_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: t('common.actions'),
            render: (_: unknown, r: any) => (
              <Popconfirm title={t('common.confirmDelete')} onConfirm={() => deleteMut.mutate(r.id)}>
                <Button size="small" danger>
                  {t('common.delete')}
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </Card>
  );
};

export default LiveParticipantsPage;
