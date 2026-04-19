import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Popconfirm, Select, Table, message } from "antd";
import dayjs from "dayjs";
import { AuthToken, createAuthToken, deleteAuthToken } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AuthTokensPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: tokens, isLoading } = useQuery(adminQueryOptions.authTokens());
  const { data: users } = useQuery(adminQueryOptions.users());

  const userOptions = useMemo(
    () => (users || []).map((u) => ({ value: u.id, label: u.username })),
    [users]
  );

  const createMut = useMutation({
    mutationFn: (vals: { user: number }) => createAuthToken(vals),
    onSuccess: async () => {
      message.success(t('adminAuth.tokenCreated'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.authTokens });
    },
    onError: () => message.error(t('adminAuth.tokenCreateError')),
  });

  const deleteMut = useMutation({
    mutationFn: (key: string) => deleteAuthToken(key),
    onSuccess: async () => {
      message.success(t('adminAuth.tokenDeleted'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.authTokens });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  return (
    <Card title={t('adminAuth.apiTokens')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="user" rules={[{ required: true }]}>
          <Select placeholder={t('adminAuth.user')} style={{ width: 240 }} options={userOptions} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isPending}>
            {t('adminAuth.createToken')}
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="key"
        loading={isLoading}
        dataSource={tokens || []}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: t('adminAuth.token'), dataIndex: "key" },
          { title: t('adminAuth.user'), dataIndex: "user_username", render: (v: string) => v || "-" },
          {
            title: t('adminAuth.created'),
            dataIndex: "created",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: t('common.actions'),
            render: (_: unknown, r: AuthToken) => (
              <Popconfirm title={t('adminAuth.confirmDeleteToken')} onConfirm={() => deleteMut.mutate(r.key)}>
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

export default AuthTokensPage;
