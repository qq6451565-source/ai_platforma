import type { ReactNode } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Row,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import type { AuditLog, EnrollmentDetailItem, EnrollmentVerification } from "../../../api/admin";
import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";
import {
  ENROLLMENT_AI_REASON_LABELS,
  ENROLLMENT_AUDIT_ACTION_LABELS,
  formatEnrollmentConfidence,
  formatEnrollmentDateTime,
  getEnrollmentAiAlertType,
  getEnrollmentAuditTagColor,
  getEnrollmentStatusMeta,
} from "../utils/adminEnrollment";

const { Text, Title } = Typography;

type Props = {
  controller: AdminEnrollmentController;
};

const withTooltip = (reason: string | null | undefined, node: ReactNode) =>
  reason ? (
    <Tooltip title={reason}>
      <span>{node}</span>
    </Tooltip>
  ) : (
    node
  );

const renderDocumentPreview = (title: string, src?: string) => (
  <Card
    size="small"
    title={title}
    styles={{ body: { padding: 12 } }}
    style={{ height: "100%" }}
  >
    {src ? (
      <Image
        src={src}
        alt={title}
        style={{ width: "100%", borderRadius: 12, objectFit: "cover" }}
        preview
      />
    ) : (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${title} mavjud emas`} />
    )}
  </Card>
);

const renderVerificationCard = (verification: EnrollmentVerification, index: number) => (
  <Card key={`${verification.created_at || "verification"}-${index}`} size="small">
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <Space wrap>
        <Tag color={verification.color}>{verification.label}</Tag>
        <Text>Ishonch: {formatEnrollmentConfidence(verification.confidence)}</Text>
        <Text type="secondary">
          {formatEnrollmentDateTime(verification.checked_at || verification.created_at)}
        </Text>
        {verification.face_embedding_ready ? <Tag color="cyan">Face baza saqlandi</Tag> : null}
      </Space>
      <Text>{verification.message}</Text>
      {verification.reason ? (
        <Text type="secondary">
          Sabab: {ENROLLMENT_AI_REASON_LABELS[verification.reason] || verification.reason}
        </Text>
      ) : null}
      {verification.event_summary?.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          {verification.event_summary.map((line) => (
            <Text key={`${verification.created_at}-${line}`} type="secondary">
              {line}
            </Text>
          ))}
        </div>
      ) : null}
    </Space>
  </Card>
);

const renderAuditCard = (entry: AuditLog, index: number) => (
  <Card key={`${entry.id}-${index}`} size="small">
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space wrap>
        <Tag color={getEnrollmentAuditTagColor(entry.action)}>
          {ENROLLMENT_AUDIT_ACTION_LABELS[entry.action] || entry.action}
        </Tag>
        <Text>{entry.user_username || "-"}</Text>
        <Text type="secondary">{formatEnrollmentDateTime(entry.created_at)}</Text>
      </Space>
      {entry.extra?.manual_override_reason ? <Text>Override sababi: {entry.extra.manual_override_reason}</Text> : null}
      {entry.extra?.reject_reason ? <Text>Rad etish sababi: {entry.extra.reject_reason}</Text> : null}
      {entry.extra?.reopen_reason ? <Text>Qayta ochish sababi: {entry.extra.reopen_reason}</Text> : null}
      {typeof entry.extra?.ai_confidence === "number" ? (
        <Text type="secondary">AI ishonchi: {entry.extra.ai_confidence.toFixed(3)}</Text>
      ) : null}
      {typeof entry.extra?.confidence === "number" ? (
        <Text type="secondary">Qayta tekshiruv ishonchi: {entry.extra.confidence.toFixed(3)}</Text>
      ) : null}
    </Space>
  </Card>
);

const AdminEnrollmentDetailDrawer = ({ controller }: Props) => (
  <Drawer
    open={controller.detailOpen}
    width={920}
    title="Ariza review"
    onClose={controller.closeDetail}
    extra={
      controller.currentApplicant ? (
        <Space wrap>
          {withTooltip(
            !controller.currentActions.can_edit ? controller.currentReasons.can_edit : null,
            <Button
              disabled={!controller.currentActions.can_edit}
              onClick={() => controller.openEdit(controller.currentApplicant!)}
            >
              Tahrirlash
            </Button>,
          )}
          {withTooltip(
            !controller.currentActions.can_approve ? controller.currentReasons.can_approve : null,
            <Button
              type="primary"
              disabled={!controller.currentActions.can_approve}
              onClick={() => controller.openApprove(controller.currentApplicant!)}
            >
              Tasdiqlash
            </Button>,
          )}
          {withTooltip(
            !controller.currentActions.can_reject ? controller.currentReasons.can_reject : null,
            <Button
              danger
              disabled={!controller.currentActions.can_reject}
              onClick={() => controller.openReject(controller.currentApplicant!)}
              loading={controller.rejecting && controller.selectedApplicant?.id === controller.currentApplicant.id}
            >
              Rad etish
            </Button>,
          )}
          {controller.currentActions.can_reopen ? (
            <Button
              type="dashed"
              loading={controller.reopening && controller.selectedApplicant?.id === controller.currentApplicant.id}
              onClick={() => controller.openReopen(controller.currentApplicant!)}
            >
              Qayta ochish
            </Button>
          ) : null}
        </Space>
      ) : null
    }
  >
    {controller.detailLoading && !controller.detailApplicant ? (
      <Skeleton active paragraph={{ rows: 12 }} />
    ) : controller.currentApplicant ? (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card size="small">
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Space wrap align="center">
              <Title level={4} style={{ margin: 0 }}>
                {controller.currentApplicant.full_name || `Ariza #${controller.currentApplicant.id}`}
              </Title>
              {(() => {
                const meta = getEnrollmentStatusMeta(controller.currentApplicant?.status);
                return <Tag color={meta.color}>{meta.label}</Tag>;
              })()}
              {controller.detailSummary ? (
                <Tag color={controller.detailSummary.color}>{controller.detailSummary.label}</Tag>
              ) : null}
            </Space>
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Telefon">{controller.currentApplicant.phone || "-"}</Descriptions.Item>
              <Descriptions.Item label="Email">{controller.currentApplicant.email || "-"}</Descriptions.Item>
              <Descriptions.Item label="Yo'nalish">
                {controller.currentApplicant.direction_name ||
                  (controller.currentApplicant.direction_choice
                    ? controller.directionMap.get(controller.currentApplicant.direction_choice) ||
                      controller.currentApplicant.direction_choice
                    : "-")}
              </Descriptions.Item>
              <Descriptions.Item label="Yuborilgan">
                {formatEnrollmentDateTime(controller.currentApplicant.created_at)}
              </Descriptions.Item>
              {"approved_at" in controller.currentApplicant ? (
                <Descriptions.Item label="Tasdiqlangan vaqt">
                  {formatEnrollmentDateTime(controller.currentApplicant.approved_at)}
                </Descriptions.Item>
              ) : null}
              {"approved_by_name" in controller.currentApplicant ? (
                <Descriptions.Item label="Tasdiqlagan admin">
                  {controller.currentApplicant.approved_by_name || "-"}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          </Space>
        </Card>

        {controller.blockedActionItems.length ? (
          <Card size="small" title="Amal cheklovlari">
            <div style={{ display: "grid", gap: 10 }}>
              {controller.blockedActionItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: "grid",
                    gap: 4,
                    padding: 12,
                    border: "1px solid #f0f0f0",
                    borderRadius: 12,
                    background: "#fafafa",
                  }}
                >
                  <Space wrap>
                    <Tag>{item.label}</Tag>
                  </Space>
                  <Text type="secondary">{item.reason}</Text>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {renderDocumentPreview(
                "Passport preview",
                (controller.currentApplicant as EnrollmentDetailItem).documents?.passport_front,
              )}
              {renderDocumentPreview(
                "Selfie preview",
                (controller.currentApplicant as EnrollmentDetailItem).documents?.face_image,
              )}
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="AI verdict" style={{ height: "100%" }}>
              {controller.detailSummary ? (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Space wrap>
                    <Tag color={controller.detailSummary.color}>{controller.detailSummary.label}</Tag>
                    {controller.detailSummary.manual_review_required ? (
                      <Tag color="gold">Manual review kerak</Tag>
                    ) : (
                      <Tag color="green">Approve-ready</Tag>
                    )}
                    {controller.detailSummary.face_embedding_ready ? (
                      <Tag color="cyan">Face baza tayyor</Tag>
                    ) : null}
                  </Space>
                  <Alert
                    type={getEnrollmentAiAlertType(controller.detailSummary)}
                    showIcon
                    message={controller.detailSummary.message}
                    description={
                      controller.detailSummary.reason
                        ? `Sabab: ${ENROLLMENT_AI_REASON_LABELS[controller.detailSummary.reason] || controller.detailSummary.reason}`
                        : undefined
                    }
                  />
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="Ishonch">
                      {formatEnrollmentConfidence(controller.detailSummary.confidence)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Threshold">
                      {controller.detailSummary.threshold ?? "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Oxirgi tekshiruv">
                      {formatEnrollmentDateTime(controller.detailSummary.checked_at)}
                    </Descriptions.Item>
                  </Descriptions>
                  {controller.detailSummary.event_summary?.length ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      {controller.detailSummary.event_summary.map((line) => (
                        <Text key={line} type="secondary">
                          {line}
                        </Text>
                      ))}
                    </div>
                  ) : null}
                  {withTooltip(
                    !controller.currentActions.can_reverify ? controller.currentReasons.can_reverify : null,
                    <Button
                      disabled={!controller.currentActions.can_reverify}
                      loading={controller.reverifying && controller.selectedApplicant?.id === controller.currentApplicant.id}
                      onClick={() => void controller.reverifyApplicant(controller.currentApplicant!)}
                    >
                      AI qayta tekshir
                    </Button>,
                  )}
                </Space>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="AI summary topilmadi" />
              )}
            </Card>
          </Col>
        </Row>

        <Card size="small" title="Tekshiruvlar tarixi">
          {controller.detailHistory.length ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {controller.detailHistory.map(renderVerificationCard)}
            </Space>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tekshiruv tarixi yo'q" />
          )}
        </Card>

        <Card size="small" title="Qarorlar tarixi">
          {controller.applicantAuditLoading && !controller.decisionHistory.length ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : controller.decisionHistory.length ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {controller.decisionHistory.map(renderAuditCard)}
            </Space>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Qarorlar tarixi yo'q" />
          )}
        </Card>
      </Space>
    ) : null}
  </Drawer>
);

export default AdminEnrollmentDetailDrawer;
