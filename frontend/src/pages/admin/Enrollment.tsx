import { Button, Card, Empty, Popconfirm, Space, Table, Tag, Typography } from "antd";
import { useTranslation } from 'react-i18next';

import type { EnrollmentItem } from "../../api/admin";
import AdminEnrollmentApproveModal from "./components/AdminEnrollmentApproveModal";
import AdminEnrollmentDetailDrawer from "./components/AdminEnrollmentDetailDrawer";
import AdminEnrollmentEditModal from "./components/AdminEnrollmentEditModal";
import AdminEnrollmentRejectModal from "./components/AdminEnrollmentRejectModal";
import AdminEnrollmentReopenModal from "./components/AdminEnrollmentReopenModal";
import { useAdminEnrollmentController } from "./hooks/useAdminEnrollmentController";
import {
  formatEnrollmentConfidence,
  formatEnrollmentDateTime,
  getEnrollmentStatusMeta,
} from "./utils/adminEnrollment";

const { Text } = Typography;

const EnrollmentPage = () => {
  const { t } = useTranslation();
  const controller = useAdminEnrollmentController();

  const columns = [
    {
      title: t('adminEnrollment.applicant'),
      dataIndex: "full_name",
      render: (_: unknown, row: EnrollmentItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.full_name || t('adminEnrollment.applicationId', { id: row.id })}</Text>
          <Text type="secondary">{row.phone || "-"}</Text>
        </Space>
      ),
    },
    {
      title: t('adminEnrollment.direction'),
      dataIndex: "direction_name",
      render: (_: unknown, row: EnrollmentItem) =>
        row.direction_name ||
        (row.direction_choice ? controller.directionMap.get(row.direction_choice) || "-" : "-"),
    },
    {
      title: t('adminEnrollment.aiVerdict'),
      render: (_: unknown, row: EnrollmentItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={row.ai_summary.color}>{row.ai_summary.label}</Tag>
          <Text type="secondary">{t('adminEnrollment.confidence')}: {formatEnrollmentConfidence(row.ai_summary.confidence)}</Text>
        </Space>
      ),
    },
    {
      title: t('adminEnrollment.statusCol'),
      dataIndex: "status",
      render: (value: string) => {
        const meta = getEnrollmentStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: t('adminEnrollment.sentAt'),
      dataIndex: "created_at",
      render: (value: string) => formatEnrollmentDateTime(value),
    },
    {
      title: t('adminEnrollment.actionsCol'),
      render: (_: unknown, row: EnrollmentItem) => {
        const actions = row.allowed_actions;
        const reasons = row.action_reasons || {};
        return (
          <Space wrap>
            <Button size="small" onClick={() => controller.openDetails(row)}>
              {t('adminEnrollment.viewBtn')}
            </Button>
            <Button
              size="small"
              disabled={!actions.can_edit}
              title={reasons.can_edit || undefined}
              onClick={() => controller.openEdit(row)}
            >
              {t('adminEnrollment.editBtn')}
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={!actions.can_approve}
              title={reasons.can_approve || undefined}
              loading={controller.approving && controller.selectedApplicant?.id === row.id}
              onClick={() => controller.openApprove(row)}
            >
              {t('adminEnrollment.approveBtn')}
            </Button>
            <Button
              size="small"
              danger
              disabled={!actions.can_reject}
              title={reasons.can_reject || undefined}
              loading={controller.rejecting && controller.selectedApplicant?.id === row.id}
              onClick={() => controller.openReject(row)}
            >
              {t('adminEnrollment.rejectBtn')}
            </Button>
            {actions.can_reopen ? (
              <Button
                size="small"
                type="dashed"
                loading={controller.reopening && controller.selectedApplicant?.id === row.id}
                onClick={() => controller.openReopen(row)}
              >
                {t('adminEnrollment.reopenBtn')}
              </Button>
            ) : null}
            {actions.can_delete ? (
              <Popconfirm
                title={t('adminEnrollment.confirmDeleteApplication')}
                okText={t('common.yes')}
                cancelText={t('common.no')}
                okButtonProps={{ loading: controller.deletePending && controller.deleteId === row.id }}
                onConfirm={() => controller.removeApplicant(row)}
              >
                <Button size="small" danger disabled={controller.deletePending && controller.deleteId === row.id}>
                  {t('adminEnrollment.deleteBtn')}
                </Button>
              </Popconfirm>
            ) : (
              <Button size="small" danger disabled title={reasons.can_delete || undefined}>
                {t('adminEnrollment.deleteBtn')}
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card title={t('adminEnrollment.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Table
        rowKey="id"
        loading={controller.isLoading}
        dataSource={controller.applicants}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description={t('adminEnrollment.noApplications')} /> }}
        columns={columns}
      />

      <AdminEnrollmentDetailDrawer controller={controller} />
      <AdminEnrollmentEditModal controller={controller} />
      <AdminEnrollmentRejectModal controller={controller} />
      <AdminEnrollmentReopenModal controller={controller} />
      <AdminEnrollmentApproveModal controller={controller} />
    </Card>
  );
};

export default EnrollmentPage;
