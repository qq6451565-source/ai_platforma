import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Input, Popconfirm, Space, Table, Tag, message, Button } from "antd";
import dayjs from "dayjs";
import { AuditLog, deleteAuditLog, fetchAuditLogs } from "../../api/admin";

const actionLabels: Record<string, string> = {
  login_success: "Kirish muvaffaqiyatli",
  login_failed: "Kirish xatolik",
  logout: "Chiqish",
  role_changed: "Rol o'zgardi",
};

const AuditLogsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: fetchAuditLogs,
  });
  const [search, setSearch] = useState("");

  const delMut = useMutation({
    mutationFn: (id: number) => deleteAuditLog(id),
    onSuccess: async () => {
      message.success("Audit log o'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  const filtered = useMemo(() => {
    const list = data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) => {
      const u = (l.user_username || "").toLowerCase();
      const a = (l.action || "").toLowerCase();
      const r = (l.role || "").toLowerCase();
      const ip = (l.ip_address || "").toLowerCase();
      return u.includes(q) || a.includes(q) || r.includes(q) || ip.includes(q);
    });
  }, [data, search]);

  return (
    <Card title="Audit loglar" style={{ marginBottom: 16 }}>
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="Qidirish (foydalanuvchi, action, IP)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
      </Space>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "Harakat",
            dataIndex: "action",
            render: (v: string) => <Tag color="blue">{actionLabels[v] || v}</Tag>,
          },
          {
            title: "Foydalanuvchi",
            dataIndex: "user_username",
            render: (v: string) => v || "-",
          },
          {
            title: "Rol",
            dataIndex: "role",
            render: (v: string) => v || "-",
          },
          {
            title: "IP",
            dataIndex: "ip_address",
            render: (v: string) => v || "-",
          },
          {
            title: "Vaqt",
            dataIndex: "created_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Extra",
            dataIndex: "extra",
            render: (v: any) => (v ? JSON.stringify(v).slice(0, 120) : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: AuditLog) => (
              <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => delMut.mutate(r.id)}>
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

export default AuditLogsPage;
