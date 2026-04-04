import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { AuditLog, deleteAuditLog } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";
import { usePageTitle } from "../../hooks/usePageTitle";

const { Text } = Typography;

const actionLabels: Record<string, string> = {
  login_success: "Kirish muvaffaqiyatli",
  login_failed: "Kirish xatolik",
  logout: "Chiqish",
  role_changed: "Rol o'zgardi",
  enrollment_approved: "Ariza tasdiqlandi",
  enrollment_override_approved: "Qo'lda tasdiqlab approve qilindi",
  enrollment_rejected: "Ariza rad etildi",
  enrollment_reopened: "Ariza qayta ochildi",
  enrollment_reverified: "AI qayta tekshirildi",
};

const actionColors: Record<string, string> = {
  login_success: "green",
  login_failed: "red",
  logout: "default",
  role_changed: "blue",
  enrollment_approved: "green",
  enrollment_override_approved: "gold",
  enrollment_rejected: "red",
  enrollment_reopened: "blue",
  enrollment_reverified: "cyan",
};

const AuditLogsPage = () => {
  usePageTitle('nav.auditLogs');
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<"all" | "auth" | "enrollment">("all");
  const [action, setAction] = useState("all");

  const { data, isLoading } = useQuery(adminQueryOptions.auditLogs(domain, action, search));

  const delMut = useMutation({
    mutationFn: (id: number) => deleteAuditLog(id),
    onSuccess: async () => {
      message.success("Audit log o'chirildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.auditLogs(domain, action, search) });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  const actionOptions = [
    { value: "all", label: "Barcha actionlar" },
    { value: "login_success", label: actionLabels.login_success },
    { value: "login_failed", label: actionLabels.login_failed },
    { value: "logout", label: actionLabels.logout },
    { value: "role_changed", label: actionLabels.role_changed },
    { value: "enrollment_approved", label: actionLabels.enrollment_approved },
    { value: "enrollment_override_approved", label: actionLabels.enrollment_override_approved },
    { value: "enrollment_rejected", label: actionLabels.enrollment_rejected },
    { value: "enrollment_reopened", label: actionLabels.enrollment_reopened },
    { value: "enrollment_reverified", label: actionLabels.enrollment_reverified },
  ];

  return (
    <Card title="Audit loglar" style={{ marginBottom: 'var(--space-4)' }}>
      <Space wrap style={{ marginBottom: 'var(--space-3)' }}>
        <Input
          placeholder="Qidirish (foydalanuvchi, action, IP)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
        <Select
          value={domain}
          onChange={(value) => {
            setDomain(value);
            if (value === "auth" && action.startsWith("enrollment_")) setAction("all");
            if (value === "enrollment" && !action.startsWith("enrollment_") && action !== "all") setAction("all");
          }}
          style={{ width: 180 }}
          options={[
            { value: "all", label: "Barcha domainlar" },
            { value: "auth", label: "Auth" },
            { value: "enrollment", label: "Enrollment" },
          ]}
        />
        <Select
          value={action}
          onChange={setAction}
          style={{ width: 260 }}
          options={actionOptions.filter((option) => {
            if (domain === "enrollment") return option.value === "all" || option.value.startsWith("enrollment_");
            if (domain === "auth") return option.value === "all" || !option.value.startsWith("enrollment_");
            return true;
          })}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "Harakat",
            dataIndex: "action",
            render: (value: string) => (
              <Tag color={actionColors[value] || "blue"}>{actionLabels[value] || value}</Tag>
            ),
          },
          {
            title: "Foydalanuvchi",
            dataIndex: "user_username",
            render: (_: string, row: AuditLog) => (
              <Space direction="vertical" size={0}>
                <Text>{row.user_username || "-"}</Text>
                <Text type="secondary">{row.role || "-"}</Text>
              </Space>
            ),
          },
          {
            title: "Obyekt",
            render: (_: unknown, row: AuditLog) => (
              <Space direction="vertical" size={0}>
                <Text>{row.extra?.applicant_name || "-"}</Text>
                <Text type="secondary">
                  {row.extra?.applicant_id ? `Applicant #${row.extra.applicant_id}` : "-"}
                </Text>
              </Space>
            ),
          },
          {
            title: "Sabab",
            render: (_: unknown, row: AuditLog) =>
              row.extra?.manual_override_reason || row.extra?.reject_reason || row.extra?.reopen_reason ? (
                <Text>{row.extra?.manual_override_reason || row.extra?.reject_reason || row.extra?.reopen_reason}</Text>
              ) : (
                <Text type="secondary">-</Text>
              ),
          },
          {
            title: "Natija",
            render: (_: unknown, row: AuditLog) => (
              <Space direction="vertical" size={0}>
                <Text>
                  {typeof row.extra?.ai_verified === "boolean"
                    ? row.extra.ai_verified
                      ? "AI verified"
                      : "AI verified emas"
                    : row.extra?.verified === true
                      ? "Qayta tekshiruv o'tdi"
                      : row.extra?.verified === false
                        ? "Qayta tekshiruv o'tmadi"
                        : "-"}
                </Text>
                <Text type="secondary">
                  {typeof row.extra?.ai_confidence === "number"
                    ? `Ishonch: ${row.extra.ai_confidence.toFixed(3)}`
                    : typeof row.extra?.confidence === "number"
                      ? `Ishonch: ${row.extra.confidence.toFixed(3)}`
                      : row.extra?.approved_role || "-"}
                </Text>
              </Space>
            ),
          },
          {
            title: "IP / vaqt",
            render: (_: unknown, row: AuditLog) => (
              <Space direction="vertical" size={0}>
                <Text>{row.ip_address || "-"}</Text>
                <Text type="secondary">
                  {row.created_at ? dayjs(row.created_at).format("YYYY-MM-DD HH:mm") : "-"}
                </Text>
              </Space>
            ),
          },
          {
            title: "Amallar",
            render: (_: unknown, row: AuditLog) => (
              <Popconfirm title={t('common.confirmDelete')} onConfirm={() => delMut.mutate(row.id)}>
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

export default AuditLogsPage;
