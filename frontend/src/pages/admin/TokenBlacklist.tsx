import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Popconfirm, Table, Tabs, Tag, message } from "antd";
import dayjs from "dayjs";
import {
  BlacklistedToken,
  OutstandingToken,
  createBlacklistedToken,
  deleteBlacklistedToken,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import {
  ADMIN_QUERY_KEYS,
  invalidateAdminQueries,
} from "./utils/adminWorkflowMutations";

const TokenBlacklistPage = () => {
  const qc = useQueryClient();
  const { data: outstanding, isLoading: outLoading } = useQuery(adminQueryOptions.outstandingTokens());
  const { data: blacklisted, isLoading: blkLoading } = useQuery(adminQueryOptions.blacklistedTokens());

  const blockMut = useMutation({
    mutationFn: (tokenId: number) => createBlacklistedToken({ token: tokenId }),
    onSuccess: async () => {
      message.success("Token bloklandi");
      await invalidateAdminQueries(qc, [
        ADMIN_QUERY_KEYS.outstandingTokens,
        ADMIN_QUERY_KEYS.blacklistedTokens,
      ]);
    },
    onError: () => message.error("Bloklashda xato"),
  });

  const unBlockMut = useMutation({
    mutationFn: (id: number) => deleteBlacklistedToken(id),
    onSuccess: async () => {
      message.success("Qora ro'yxatdan chiqarildi");
      await invalidateAdminQueries(qc, [
        ADMIN_QUERY_KEYS.outstandingTokens,
        ADMIN_QUERY_KEYS.blacklistedTokens,
      ]);
    },
    onError: () => message.error("O'chirishda xato"),
  });

  return (
    <Card title="Token blacklist" style={{ marginBottom: 16 }}>
      <Tabs
        items={[
          {
            key: "out",
            label: "Faol tokenlar",
            children: (
              <Table
                rowKey="id"
                loading={outLoading}
                dataSource={outstanding || []}
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: "Foydalanuvchi", dataIndex: "user_username", render: (v: string) => v || "-" },
                  {
                    title: "JTI",
                    dataIndex: "jti",
                    render: (v: string) => `${v.slice(0, 12)}...`,
                  },
                  {
                    title: "Tugash",
                    dataIndex: "expires_at",
                    render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
                  },
                  {
                    title: "Holat",
                    render: () => <Tag color="green">faol</Tag>,
                  },
                  {
                    title: "Amallar",
                    render: (_: unknown, r: OutstandingToken) => (
                      <Popconfirm title="Tokenni bloklaysizmi?" onConfirm={() => blockMut.mutate(r.id)}>
                        <Button size="small" danger>
                          Bloklash
                        </Button>
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: "blk",
            label: "Qora ro'yxat",
            children: (
              <Table
                rowKey="id"
                loading={blkLoading}
                dataSource={blacklisted || []}
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: "Foydalanuvchi", dataIndex: "user_username", render: (v: string) => v || "-" },
                  {
                    title: "JTI",
                    dataIndex: "token_jti",
                    render: (v: string) => (v ? `${v.slice(0, 12)}...` : "-"),
                  },
                  {
                    title: "Vaqt",
                    dataIndex: "blacklisted_at",
                    render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
                  },
                  {
                    title: "Holat",
                    render: () => <Tag color="red">blok</Tag>,
                  },
                  {
                    title: "Amallar",
                    render: (_: unknown, r: BlacklistedToken) => (
                      <Popconfirm title="Qayta faollashtirasizmi?" onConfirm={() => unBlockMut.mutate(r.id)}>
                        <Button size="small">Qayta faollashtirish</Button>
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default TokenBlacklistPage;
