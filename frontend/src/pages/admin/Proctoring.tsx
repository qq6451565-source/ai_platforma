import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, List, Empty, Popconfirm, Button, Tabs, message } from "antd";
import { deleteProctorSession, deleteProctorEvent } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminProctoringPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: sessions, isLoading: sessionsLoading } = useQuery(adminQueryOptions.proctorSessions());
  const { data: events, isLoading: eventsLoading } = useQuery(adminQueryOptions.proctorEvents());

  return (
    <Card title={t('adminProctoring.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Tabs
        items={[
          {
            key: "sessions",
            label: t('adminProctoring.sessions'),
            children: (
              <List
                loading={sessionsLoading}
                dataSource={sessions || []}
                locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                renderItem={(s) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title={t('common.confirmDelete')}
                        onConfirm={() =>
                          deleteProctorSession(s.id)
                            .then(() => {
                              message.success(t('common.deleted'));
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.proctorSessions });
                            })
                            .catch(() => message.error(t('common.error')))
                        }
                      >
                        <Button danger type="link">
                          {t('common.delete')}
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
            label: t('adminProctoring.events'),
            children: (
              <List
                loading={eventsLoading}
                dataSource={events || []}
                locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                renderItem={(e) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title={t('common.confirmDelete')}
                        onConfirm={() =>
                          deleteProctorEvent(e.id)
                            .then(() => {
                              message.success(t('common.deleted'));
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.proctorEvents });
                            })
                            .catch(() => message.error(t('common.error')))
                        }
                      >
                        <Button danger type="link">
                          {t('common.delete')}
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    Session #{e.session} | {e.event_type} | {e.created_at || t('adminProctoring.noTime')}
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
