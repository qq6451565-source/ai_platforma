import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Popconfirm, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import { deleteLiveParticipant, fetchLiveParticipants, fetchLiveRooms } from "../../api/admin";

const LiveParticipantsPage = () => {
  const qc = useQueryClient();
  const { data: participants, isLoading } = useQuery({
    queryKey: ["admin-live-participants"],
    queryFn: fetchLiveParticipants,
  });
  const { data: rooms } = useQuery({
    queryKey: ["admin-live-rooms"],
    queryFn: fetchLiveRooms,
  });

  const roomMap = useMemo(() => new Map((rooms || []).map((r: any) => [r.id, r.room_name])), [rooms]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteLiveParticipant(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-live-participants"] });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  return (
    <Card title="Live qatnashuvchilar" style={{ marginBottom: 16 }}>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={participants || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "Foydalanuvchi", dataIndex: "user_name", render: (v: string) => v || "-" },
          {
            title: "Xona",
            dataIndex: "room",
            render: (v: number) => roomMap.get(v) || v,
          },
          {
            title: "Rol",
            dataIndex: "is_teacher",
            render: (v: boolean) => (v ? <Tag color="geekblue">teacher</Tag> : <Tag color="green">student</Tag>),
          },
          {
            title: "Kirdi",
            dataIndex: "joined_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Chiqdi",
            dataIndex: "left_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: any) => (
              <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r.id)}>
                <Button size="small" danger>
                  O'chirish
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
