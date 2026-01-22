import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty } from "antd";
import {
  fetchAnnouncementsAdmin,
  createAnnouncementAdmin,
  deleteAnnouncementAdmin,
  AdminAnnouncement,
} from "../../api/admin";

const AdminAnnouncementsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: fetchAnnouncementsAdmin,
  });

  const createMut = useMutation({
    mutationFn: (vals: { title: string; content: string }) => createAnnouncementAdmin(vals),
    onSuccess: async () => {
      message.success("E'lon qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: () => message.error("E'lon qo'shishda xato"),
  });

  const remove = (id: number) =>
    deleteAnnouncementAdmin(id)
      .then(() => {
        message.success("O'chirildi");
        qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      })
      .catch(() => message.error("O'chirishda xato"));

  return (
    <Card title="E'lonlar" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="title" label="Sarlavha" rules={[{ required: true, message: "Sarlavha kerak" }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="content"
          label="Matn"
          rules={[{ required: true, message: "Matn kerak" }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          Saqlash
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={data || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(a: AdminAnnouncement) => (
          <List.Item
            actions={[
              <Button danger type="link" onClick={() => remove(a.id)}>
                O'chirish
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
