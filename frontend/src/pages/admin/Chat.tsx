import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, List, Empty, Popconfirm, Button, message } from "antd";
import { deleteChatMessage } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminChatPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminQueryOptions.chatMessages());

  return (
    <Card title={t('adminChat.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <List
        loading={isLoading}
        dataSource={data || []}
        locale={{ emptyText: <Empty description={t('common.noData')} /> }}
        renderItem={(m) => (
          <List.Item
            actions={[
              <Popconfirm
                title={t('common.confirmDelete')}
                onConfirm={() =>
                  deleteChatMessage(m.id)
                    .then(() => {
                      message.success(t('common.deleted'));
                      qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.chatMessages });
                    })
                    .catch(() => message.error(t('common.error')))
                }
              >
                <Button danger type="link">{t('common.delete')}</Button>
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
