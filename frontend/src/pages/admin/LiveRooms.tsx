import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Select, Button, List, Empty, Popconfirm, message } from "antd";
import { fetchLiveRooms, createLiveRoom, deleteLiveRoom, fetchLessonsAdmin } from "../../api/admin";

const AdminLiveRoomsPage = () => {
  const qc = useQueryClient();
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["admin-live-rooms"],
    queryFn: fetchLiveRooms,
  });
  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: fetchLessonsAdmin,
  });

  const createMut = useMutation({
    mutationFn: (vals: any) => createLiveRoom(vals.lesson_id),
    onSuccess: async () => {
      message.success("Live xonasi yaratildi");
      await qc.invalidateQueries({ queryKey: ["admin-live-rooms"] });
    },
    onError: () => message.error("Xatolik"),
  });

  return (
    <Card title="Live xonalar" style={{ marginBottom: 16 }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="lesson_id" rules={[{ required: true, message: "Dars" }]}>
          <Select
            showSearch
            placeholder="Dars tanlang"
            style={{ width: 240 }}
            options={(lessons || []).map((l) => ({ value: l.id, label: l.topic || `Dars #${l.id}` }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Yaratish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={rooms || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(r) => (
          <List.Item
            actions={[
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteLiveRoom(r.id)
                    .then(() => {
                      message.success("O'chirildi");
                      qc.invalidateQueries({ queryKey: ["admin-live-rooms"] });
                    })
                    .catch(() => message.error("Xatolik"))
                }
              >
                <Button danger type="link">O'chirish</Button>
              </Popconfirm>,
            ]}
          >
            {r.lesson_topic || `Dars #${r.lesson}`} | {r.room_name} | {r.is_active ? "Active" : "Inactive"}
          </List.Item>
        )}
      />
    </Card>
  );
};

export default AdminLiveRoomsPage;
