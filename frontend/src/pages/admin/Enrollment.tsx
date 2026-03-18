import type { ReactNode } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import type {
  AuditLog,
  EnrollmentDetailItem,
  EnrollmentItem,
  EnrollmentVerification,
} from "../../api/admin";
import { useAdminEnrollmentController } from "./hooks/useAdminEnrollmentController";
import {
  ENROLLMENT_AI_REASON_LABELS,
  ENROLLMENT_AUDIT_ACTION_LABELS,
  formatEnrollmentConfidence,
  formatEnrollmentDateTime,
  getEnrollmentAiAlertType,
  getEnrollmentAuditTagColor,
  getEnrollmentStatusMeta,
} from "./utils/adminEnrollment";

const { Text, Title } = Typography;

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
            {withTooltip(
              !actions.can_edit ? reasons.can_edit : null,
              <Button size="small" disabled={!actions.can_edit} onClick={() => controller.openEdit(row)}>
                Tahrirlash
              </Button>,
            )}
            {withTooltip(
              !actions.can_approve ? reasons.can_approve : null,
              <Button
                size="small"
                type="primary"
                disabled={!actions.can_approve}
                loading={controller.approving && controller.selectedApplicant?.id === row.id}
                onClick={() => controller.openApprove(row)}
              >
                Tasdiqlash
              </Button>,
            )}
            {withTooltip(
              !actions.can_reject ? reasons.can_reject : null,
              <Button
                size="small"
                danger
                disabled={!actions.can_reject}
                loading={controller.rejecting && controller.selectedApplicant?.id === row.id}
                onClick={() => controller.openReject(row)}
              >
                Rad etish
              </Button>,
            )}
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
              withTooltip(
                reasons.can_delete,
                <Button size="small" danger disabled>
                  O'chirish
                </Button>,
              )
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
                <Button disabled={!controller.currentActions.can_edit} onClick={() => controller.openEdit(controller.currentApplicant!)}>
                  Tahrirlash
                </Button>,
              )}
              {withTooltip(
                !controller.currentActions.can_approve ? controller.currentReasons.can_approve : null,
                <Button type="primary" disabled={!controller.currentActions.can_approve} onClick={() => controller.openApprove(controller.currentApplicant!)}>
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
                  {controller.detailSummary ? <Tag color={controller.detailSummary.color}>{controller.detailSummary.label}</Tag> : null}
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

      <Modal
        title="Arizani tahrirlash"
        open={controller.editOpen}
        onCancel={controller.closeEdit}
        onOk={() => controller.editForm.submit()}
        confirmLoading={controller.updating}
        destroyOnClose
      >
        {controller.selectedApplicant ? (
          <Form layout="vertical" form={controller.editForm} onFinish={controller.submitEdit}>
            <Form.Item name="full_name" label="F.I.Sh" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Telefon">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input />
            </Form.Item>
            <Form.Item name="direction_choice" label="Yo'nalish">
              <Select
                allowClear
                options={controller.directions.map((direction) => ({ value: direction.id, label: direction.name }))}
                placeholder="Yo'nalish tanlang"
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        title="Arizani rad etish"
        open={controller.rejectOpen}
        onCancel={controller.closeReject}
        onOk={() => controller.rejectForm.submit()}
        confirmLoading={controller.rejecting}
        destroyOnClose
      >
        {controller.selectedApplicant ? (
          <Form layout="vertical" form={controller.rejectForm} onFinish={controller.submitReject}>
            <Alert
              type="warning"
              showIcon
              message="Rad etilgan ariza history'da saqlanadi"
              description="Applicant record va audit izi qoladi, lekin agar vaqtinchalik user bo'lsa, account o'chiriladi."
              style={{ marginBottom: 12 }}
            />
            <Form.Item
              name="reject_reason"
              label="Rad etish sababi"
              rules={[{ required: true, message: "Rad etish sababini yozing" }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Masalan: passport rasmi sifatsiz yoki shaxs tasdiqlanmadi."
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        title="Arizani qayta ochish"
        open={controller.reopenOpen}
        onCancel={controller.closeReopen}
        onOk={() => controller.reopenForm.submit()}
        confirmLoading={controller.reopening}
        destroyOnClose
      >
        {controller.selectedApplicant ? (
          <Form layout="vertical" form={controller.reopenForm} onFinish={controller.submitReopen}>
            <Alert
              type="info"
              showIcon
              message="Ariza qayta review bosqichiga o'tadi"
              description="Holat pending bo'ladi. Shundan keyin admin arizani tahrirlashi, AI qayta tekshirishi yoki qayta tasdiqlashi mumkin."
              style={{ marginBottom: 12 }}
            />
            <Form.Item
              name="reopen_reason"
              label="Qayta ochish sababi"
              rules={[{ required: true, message: "Qayta ochish sababini yozing" }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Masalan: foydalanuvchi yangi selfie yuklashi kerak yoki review qayta o'tkaziladi."
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        title="Arizani tasdiqlash"
        open={controller.approveOpen}
        onCancel={controller.closeApprove}
        onOk={() => controller.approveForm.submit()}
        confirmLoading={controller.approving}
        destroyOnClose
      >
        {controller.selectedApplicant ? (
          <>
            {controller.selectedApplicant.ai_summary.manual_review_required ? (
              <Alert
                type="warning"
                showIcon
                message="AI avtomatik tasdiqlamadi"
                description="Admin passport va selfie preview asosida qo'lda qaror qabul qilishi kerak."
                style={{ marginBottom: 12 }}
              />
            ) : (
              <Alert
                type="success"
                showIcon
                message="AI tasdiqladi"
                description="Ariza approve-ready holatda. Endi rol va biriktirishni tanlang."
                style={{ marginBottom: 12 }}
              />
            )}

            <Form layout="vertical" form={controller.approveForm} onFinish={controller.submitApprove}>
              <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "student", label: "Talaba" },
                    { value: "teacher", label: "O'qituvchi" },
                  ]}
                />
              </Form.Item>

              {controller.selectedApplicant.ai_summary.manual_review_required ? (
                <Form.Item
                  name="manual_override_reason"
                  label="Qo'lda tasdiqlash sababi"
                  rules={[{ required: true, message: "Tasdiqlash sababini yozing" }]}
                  extra="AI avtomatik tasdiqlamagan arizalarda audit uchun sabab majburiy."
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="Masalan: passport va selfie preview qo'lda tekshirildi, shaxs mos deb topildi."
                  />
                </Form.Item>
              ) : null}

              <Form.Item shouldUpdate>
                {({ getFieldValue }) => {
                  const role = getFieldValue("role") || "student";
                  if (role === "student") {
                    return (
                      <>
                        <Form.Item name="group_id" label="Guruh" rules={[{ required: true }]}>
                          <Select
                            options={controller.groups.map((group) => ({ value: group.id, label: group.name }))}
                            placeholder="Guruh tanlang"
                          />
                        </Form.Item>
                        <Form.Item name="admission_year" label="Qabul yili">
                          <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
                        </Form.Item>
                      </>
                    );
                  }

                  return (
                    <>
                      <Form.Item name="subject_id" label="Fan" rules={[{ required: true }]}>
                        <Select
                          options={controller.subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                          placeholder="Fan tanlang"
                        />
                      </Form.Item>
                      <Form.Item name="group_ids" label="Guruhlar (ixtiyoriy)">
                        <Select
                          mode="multiple"
                          options={controller.groups.map((group) => ({ value: group.id, label: group.name }))}
                          placeholder="Guruhlarni tanlang"
                        />
                      </Form.Item>
                    </>
                  );
                }}
              </Form.Item>
            </Form>
          </>
        ) : null}
      </Modal>
    </Card>
  );
};

export default EnrollmentPage;
