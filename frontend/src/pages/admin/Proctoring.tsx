import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, List, Empty, Popconfirm, Button, Tabs, message } from "antd";
import { deleteProctorSession, deleteProctorEvent } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminProctoringPage = () => {
  const qc = useQueryClient();
  const { data: sessions, isLoading: sessionsLoading } = useQuery(adminQueryOptions.proctorSessions());
  const { data: events, isLoading: eventsLoading } = useQuery(adminQueryOptions.proctorEvents());

  return (
    <Card title="Proktor (Proctoring)" style={{ marginBottom: 'var(--space-4)' }}>
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
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.proctorSessions });
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
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.proctorEvents });
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
