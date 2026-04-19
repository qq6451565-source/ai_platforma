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

  const actionLabels: Record<string, string> = {
    login_success: t('adminAudit.loginSuccess'),
    login_failed: t('adminAudit.loginFailed'),
    logout: t('adminAudit.logout'),
    role_changed: t('adminAudit.roleChanged'),
    enrollment_approved: t('adminAudit.enrollmentApproved'),
    enrollment_override_approved: t('adminAudit.enrollmentOverrideApproved'),
    enrollment_rejected: t('adminAudit.enrollmentRejected'),
    enrollment_reopened: t('adminAudit.enrollmentReopened'),
    enrollment_reverified: t('adminAudit.enrollmentReverified'),
  };
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState<"all" | "auth" | "enrollment">("all");
  const [action, setAction] = useState("all");

  const { data, isLoading } = useQuery(adminQueryOptions.auditLogs(domain, action, search));

  const delMut = useMutation({
    mutationFn: (id: number) => deleteAuditLog(id),
    onSuccess: async () => {
      message.success(t('adminAudit.deleted'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.auditLogs(domain, action, search) });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  const actionOptions = [
    { value: "all", label: t('adminAudit.allActions') },
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
    <Card title={t('adminAudit.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <div className="filters-row" style={{ marginBottom: 'var(--space-3)' }}>
        <Input
          placeholder={t('adminAudit.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 180px', minWidth: 0 }}
        />
        <Select
          value={domain}
          onChange={(value) => {
            setDomain(value);
            if (value === "auth" && action.startsWith("enrollment_")) setAction("all");
            if (value === "enrollment" && !action.startsWith("enrollment_") && action !== "all") setAction("all");
          }}
          style={{ flex: '1 1 120px', minWidth: 0 }}
          options={[
            { value: "all", label: t('adminAudit.allDomains') },
            { value: "auth", label: "Auth" },
            { value: "enrollment", label: "Enrollment" },
          ]}
        />
        <Select
          value={action}
          onChange={setAction}
          style={{ flex: '1 1 160px', minWidth: 0 }}
          options={actionOptions.filter((option) => {
            if (domain === "enrollment") return option.value === "all" || option.value.startsWith("enrollment_");
            if (domain === "auth") return option.value === "all" || !option.value.startsWith("enrollment_");
            return true;
          })}
        />
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: t('adminAudit.action'),
            dataIndex: "action",
            render: (value: string) => (
              <Tag color={actionColors[value] || "blue"}>{actionLabels[value] || value}</Tag>
            ),
          },
          {
            title: t('adminAudit.user'),
            dataIndex: "user_username",
            render: (_: string, row: AuditLog) => (
              <Space direction="vertical" size={0}>
                <Text>{row.user_username || "-"}</Text>
                <Text type="secondary">{row.role || "-"}</Text>
              </Space>
            ),
          },
          {
            title: t('adminAudit.object'),
            render: (_: unknown, row: AuditLog) => (
              <Space direction="vertical" size={0}>
                <Text>{row.extra?.applicant_name || "-"}</Text>
                <Text type="secondary">
                  {row.extra?.applicant_id ? t('adminAudit.applicantId', { id: row.extra.applicant_id }) : "-"}
                </Text>
              </Space>
            ),
          },
          {
            title: t('adminAudit.reason'),
            render: (_: unknown, row: AuditLog) =>
              row.extra?.manual_override_reason || row.extra?.reject_reason || row.extra?.reopen_reason ? (
                <Text>{row.extra?.manual_override_reason || row.extra?.reject_reason || row.extra?.reopen_reason}</Text>
              ) : (
                <Text type="secondary">-</Text>
              ),
          },
          {
            title: t('adminAudit.result'),
            render: (_: unknown, row: AuditLog) => (
              <Space direction="vertical" size={0}>
                <Text>
                  {typeof row.extra?.ai_verified === "boolean"
                    ? row.extra.ai_verified
                      ? t('adminAudit.aiVerified')
                      : t('adminAudit.aiNotVerified')
                    : row.extra?.verified === true
                      ? t('adminAudit.reVerifyPassed')
                      : row.extra?.verified === false
                        ? t('adminAudit.reVerifyFailed')
                        : "-"}
                </Text>
                <Text type="secondary">
                  {typeof row.extra?.ai_confidence === "number"
                    ? t('adminAudit.confidenceLabel', { value: row.extra.ai_confidence.toFixed(3) })
                    : typeof row.extra?.confidence === "number"
                      ? t('adminAudit.confidenceLabel', { value: row.extra.confidence.toFixed(3) })
                      : row.extra?.approved_role || "-"}
                </Text>
              </Space>
            ),
          },
          {
            title: t('adminAudit.ipTime'),
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
