import { Button, Card, Empty, Popconfirm, Space, Table, Tag, Typography } from "antd";

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
  const controller = useAdminEnrollmentController();

  const columns = [
    {
      title: "Arizachi",
      dataIndex: "full_name",
      render: (_: unknown, row: EnrollmentItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.full_name || `Ariza #${row.id}`}</Text>
          <Text type="secondary">{row.phone || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Yo'nalish",
      dataIndex: "direction_name",
      render: (_: unknown, row: EnrollmentItem) =>
        row.direction_name ||
        (row.direction_choice ? controller.directionMap.get(row.direction_choice) || "-" : "-"),
    },
    {
      title: "AI verdict",
      render: (_: unknown, row: EnrollmentItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={row.ai_summary.color}>{row.ai_summary.label}</Tag>
          <Text type="secondary">Ishonch: {formatEnrollmentConfidence(row.ai_summary.confidence)}</Text>
        </Space>
      ),
    },
    {
      title: "Holat",
      dataIndex: "status",
      render: (value: string) => {
        const meta = getEnrollmentStatusMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Yuborilgan",
      dataIndex: "created_at",
      render: (value: string) => formatEnrollmentDateTime(value),
    },
    {
      title: "Amallar",
      render: (_: unknown, row: EnrollmentItem) => {
        const actions = row.allowed_actions;
        const reasons = row.action_reasons || {};
        return (
          <Space wrap>
            <Button size="small" onClick={() => controller.openDetails(row)}>
              Ko'rish
            </Button>
            <Button
              size="small"
              disabled={!actions.can_edit}
              title={reasons.can_edit || undefined}
              onClick={() => controller.openEdit(row)}
            >
              Tahrirlash
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={!actions.can_approve}
              title={reasons.can_approve || undefined}
              loading={controller.approving && controller.selectedApplicant?.id === row.id}
              onClick={() => controller.openApprove(row)}
            >
              Tasdiqlash
            </Button>
            <Button
              size="small"
              danger
              disabled={!actions.can_reject}
              title={reasons.can_reject || undefined}
              loading={controller.rejecting && controller.selectedApplicant?.id === row.id}
              onClick={() => controller.openReject(row)}
            >
              Rad etish
            </Button>
            {actions.can_reopen ? (
              <Button
                size="small"
                type="dashed"
                loading={controller.reopening && controller.selectedApplicant?.id === row.id}
                onClick={() => controller.openReopen(row)}
              >
                Qayta ochish
              </Button>
            ) : null}
            {actions.can_delete ? (
              <Popconfirm
                title="Arizani o'chirishni xohlaysizmi?"
                okText="Ha"
                cancelText="Yo'q"
                okButtonProps={{ loading: controller.deletePending && controller.deleteId === row.id }}
                onConfirm={() => controller.removeApplicant(row)}
              >
                <Button size="small" danger disabled={controller.deletePending && controller.deleteId === row.id}>
                  O'chirish
                </Button>
              </Popconfirm>
            ) : (
              <Button size="small" danger disabled title={reasons.can_delete || undefined}>
                O'chirish
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card title="Ro'yxatdan o'tish arizalari" style={{ marginBottom: 16 }}>
      <Table
        rowKey="id"
        loading={controller.isLoading}
        dataSource={controller.applicants}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: <Empty description="Arizalar yo'q" /> }}
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
