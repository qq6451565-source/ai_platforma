import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, List, Empty, Popconfirm, Button, Tabs, message } from "antd";
import { fetchProctorSessions, fetchProctorEvents, deleteProctorSession, deleteProctorEvent } from "../../api/admin";

const AdminProctoringPage = () => {
  const qc = useQueryClient();
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin-proctor-sessions"],
    queryFn: fetchProctorSessions,
  });
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["admin-proctor-events"],
    queryFn: fetchProctorEvents,
  });

  return (
    <Card title="Proktor (Proctoring)" style={{ marginBottom: 16 }}>
      <Tabs
        items={[
          {
            key: "sessions",
            label: "Sessiyalar",
            children: (
              <List
                loading={sessionsLoading}
                dataSource={sessions || []}
                locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                renderItem={(s) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="O'chirish?"
                        onConfirm={() =>
                          deleteProctorSession(s.id)
                            .then(() => {
                              message.success("O'chirildi");
                              qc.invalidateQueries({ queryKey: ["admin-proctor-sessions"] });
                            })
                            .catch(() => message.error("Xatolik"))
                        }
                      >
                        <Button danger type="link">
                          O'chirish
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    User #{s.user} | Attempt #{s.exam_attempt} | Verified: {String(s.verified)} | Confidence:{" "}
                    {s.confidence ?? 0}
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: "events",
            label: "Eventlar",
            children: (
              <List
                loading={eventsLoading}
                dataSource={events || []}
                locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                renderItem={(e) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="O'chirish?"
                        onConfirm={() =>
                          deleteProctorEvent(e.id)
                            .then(() => {
                              message.success("O'chirildi");
                              qc.invalidateQueries({ queryKey: ["admin-proctor-events"] });
                            })
                            .catch(() => message.error("Xatolik"))
                        }
                      >
                        <Button danger type="link">
                          O'chirish
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    Session #{e.session} | {e.event_type} | {e.created_at || "vaqt yo'q"}
                  </List.Item>
                )}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default AdminProctoringPage;
