import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Popconfirm, Select, Table, message } from "antd";
import dayjs from "dayjs";
import { AuthToken, createAuthToken, deleteAuthToken } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AuthTokensPage = () => {
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
      message.success("Token yaratildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.authTokens });
    },
    onError: () => message.error("Token yaratishda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (key: string) => deleteAuthToken(key),
    onSuccess: async () => {
      message.success("Token o'chirildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.authTokens });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  return (
    <Card title="API tokenlar" style={{ marginBottom: 16 }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="user" rules={[{ required: true }]}>
          <Select placeholder="Foydalanuvchi" style={{ width: 240 }} options={userOptions} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isPending}>
            Token yaratish
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="key"
        loading={isLoading}
        dataSource={tokens || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "Token", dataIndex: "key" },
          { title: "Foydalanuvchi", dataIndex: "user_username", render: (v: string) => v || "-" },
          {
            title: "Yaratilgan",
            dataIndex: "created",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: AuthToken) => (
              <Popconfirm title="Tokenni o'chirasizmi?" onConfirm={() => deleteMut.mutate(r.key)}>
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

export default AuthTokensPage;
