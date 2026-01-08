import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, List, Empty, Popconfirm, Button, message } from "antd";
import { fetchChatMessages, deleteChatMessage } from "../../api/admin";

const AdminChatPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-chat"],
    queryFn: fetchChatMessages,
  });

  return (
    <Card title="Guruh chati" style={{ marginBottom: 16 }}>
      <List
        loading={isLoading}
        dataSource={data || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(m) => (
          <List.Item
            actions={[
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteChatMessage(m.id)
                    .then(() => {
                      message.success("O'chirildi");
                      qc.invalidateQueries({ queryKey: ["admin-chat"] });
                    })
                    .catch(() => message.error("Xatolik"))
                }
              >
                <Button danger type="link">O'chirish</Button>
              </Popconfirm>,
            ]}
          >
            Guruh #{m.group} | Sender #{m.sender} | {m.text}
          </List.Item>
        )}
      />
    </Card>
  );
};

export default AdminChatPage;
