import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Col,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  approveEnrollment,
  AuditLog,
  deleteEnrollmentApplicant,
  EnrollmentAiSummary,
  EnrollmentDetailItem,
  EnrollmentItem,
  EnrollmentVerification,
  fetchDirections,
  fetchEnrollment,
  fetchEnrollmentApplicant,
  fetchAuditLogs,
  fetchGroupsAdmin,
  fetchSubjectsAdmin,
  reopenEnrollment,
  rejectEnrollment,
  reverifyEnrollment,
  updateEnrollmentApplicant,
} from "../../api/admin";

const { Text, Title } = Typography;

const AI_REASON_LABELS: Record<string, string> = {
  timeout: "Timeout",
  gateway_unreachable: "Gateway ulanmayapti",
  connection_error: "Ulanish xatosi",
  dns_error: "DNS xatosi",
  ssl_error: "SSL xatosi",
  auth_error: "API kalit/ruxsat xatosi",
  rate_limited: "Rate limit",
  gateway_error: "Gateway ichki xatosi",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  enrollment_approved: "Ariza tasdiqlandi",
  enrollment_override_approved: "Qo'lda tasdiqlab approve qilindi",
  enrollment_rejected: "Ariza rad etildi",
  enrollment_reopened: "Ariza qayta ochildi",
  enrollment_reverified: "AI qayta tekshirildi",
};

const formatDateTime = (value?: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-");
const formatConfidence = (value?: number | null) => (typeof value === "number" ? value.toFixed(3) : "-");
const isFinalApplicantStatus = (status?: string) => status === "approved" || status === "rejected";

const statusTag = (status?: string) => {
  if (status === "approved") return <Tag color="green">Tasdiqlangan</Tag>;
  if (status === "rejected") return <Tag color="red">Rad etilgan</Tag>;
  if (status === "verified") return <Tag color="blue">AI tekshirilgan</Tag>;
  return <Tag color="default">Pending</Tag>;
};

const aiAlertType = (summary: EnrollmentAiSummary): "success" | "info" | "warning" | "error" => {
  if (summary.status === "verified") return "success";
  if (summary.status === "unavailable") return "warning";
  if (summary.status === "not_verified") return "error";
  return "info";
};

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
        <Text>Ishonch: {formatConfidence(verification.confidence)}</Text>
        <Text type="secondary">{formatDateTime(verification.checked_at || verification.created_at)}</Text>
        {verification.face_embedding_ready ? <Tag color="cyan">Face baza saqlandi</Tag> : null}
      </Space>
      <Text>{verification.message}</Text>
      {verification.reason ? (
        <Text type="secondary">Sabab: {AI_REASON_LABELS[verification.reason] || verification.reason}</Text>
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
        <Tag
          color={
            entry.action === "enrollment_override_approved"
              ? "gold"
              : entry.action === "enrollment_rejected"
                ? "red"
                : entry.action === "enrollment_reopened"
                  ? "blue"
                  : "cyan"
          }
        >
          {AUDIT_ACTION_LABELS[entry.action] || entry.action}
        </Tag>
        <Text>{entry.user_username || "-"}</Text>
        <Text type="secondary">{formatDateTime(entry.created_at)}</Text>
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
  const qc = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<EnrollmentItem | EnrollmentDetailItem | null>(null);
  const [detailApplicantId, setDetailApplicantId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [reopenForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-enrollment-list"],
    queryFn: fetchEnrollment,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });
  const { data: directions } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });
  const { data: detailApplicant, isFetching: detailLoading } = useQuery({
    queryKey: ["admin-enrollment-detail", detailApplicantId],
    queryFn: () => fetchEnrollmentApplicant(detailApplicantId as number),
    enabled: detailOpen && detailApplicantId !== null,
  });
  const { data: applicantAuditHistory, isFetching: applicantAuditLoading } = useQuery({
    queryKey: ["admin-enrollment-audit", detailApplicantId],
    queryFn: () =>
      fetchAuditLogs({
        domain: "enrollment",
        applicant_id: detailApplicantId as number,
      }),
    enabled: detailOpen && detailApplicantId !== null,
  });

  const currentApplicant = (detailApplicant ?? selectedApplicant) as EnrollmentDetailItem | EnrollmentItem | null;

  const directionMap = useMemo(() => {
    const map = new Map<number, string>();
    (directions || []).forEach((direction) => map.set(direction.id, direction.name));
    return map;
  }, [directions]);

  const invalidateEnrollment = async (id?: number | null) => {
    await qc.invalidateQueries({ queryKey: ["admin-enrollment-list"] });
    if (id) {
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-detail", id] });
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-audit", id] });
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailApplicantId(null);
  };

  const openDetails = (item: EnrollmentItem) => {
    setSelectedApplicant(item);
    setDetailApplicantId(item.id);
    setDetailOpen(true);
  };

  const openApprove = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (isFinalApplicantStatus(item.status)) {
      message.warning("Final holatdagi arizani qayta tasdiqlab bo'lmaydi.");
      return;
    }
    setSelectedApplicant(item);
    approveForm.setFieldsValue({
      role: "student",
      group_id: undefined,
      admission_year: new Date().getFullYear(),
      subject_id: undefined,
      group_ids: [],
      manual_override_reason: undefined,
    });
    setApproveOpen(true);
  };

  const openReject = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (isFinalApplicantStatus(item.status)) {
      message.warning("Final holatdagi arizani rad etish yopilgan.");
      return;
    }
    setSelectedApplicant(item);
    rejectForm.setFieldsValue({
      reject_reason: undefined,
    });
    setRejectOpen(true);
  };

  const openEdit = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (isFinalApplicantStatus(item.status)) {
      message.warning("Final holatdagi arizani tahrirlash yopilgan.");
      return;
    }
    setSelectedApplicant(item);
    editForm.setFieldsValue({
      full_name: item.full_name || "",
      phone: item.phone || "",
      email: item.email || "",
      direction_choice: item.direction_choice ?? undefined,
    });
    setEditOpen(true);
  };

  const openReopen = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (item.status !== "rejected") {
      message.warning("Faqat rad etilgan arizani qayta ochish mumkin.");
      return;
    }
    setSelectedApplicant(item);
    reopenForm.setFieldsValue({
      reopen_reason: undefined,
    });
    setReopenOpen(true);
  };

  const { mutateAsync: approve, isPending: approving } = useMutation({
    mutationFn: (payload: {
      id: number;
      role: "student" | "teacher";
      group_id?: number;
      subject_id?: number;
      group_ids?: number[];
      admission_year?: number;
      manual_override_reason?: string;
    }) => approveEnrollment(payload.id, payload),
    onSuccess: async (_data, payload) => {
      message.success("Ariza tasdiqlandi");
      await invalidateEnrollment(payload.id);
      setApproveOpen(false);
      approveForm.resetFields();
    },
    onError: () => message.error("Tasdiqlashda xato"),
  });

  const { mutateAsync: reject, isPending: rejecting } = useMutation({
    mutationFn: (payload: { id: number; reject_reason: string }) =>
      rejectEnrollment(payload.id, { reject_reason: payload.reject_reason }),
    onSuccess: async (_data, payload) => {
      message.success("Ariza rad etildi");
      await invalidateEnrollment(payload.id);
      setRejectOpen(false);
      rejectForm.resetFields();
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.reject_reason?.[0] ||
        error?.response?.data?.detail ||
        error?.message ||
        "Rad etishda xato";
      message.error(detail);
    },
  });

  const { mutateAsync: reopen, isPending: reopening } = useMutation({
    mutationFn: (payload: { id: number; reopen_reason: string }) =>
      reopenEnrollment(payload.id, { reopen_reason: payload.reopen_reason }),
    onSuccess: async (_data, payload) => {
      message.success("Ariza qayta ochildi");
      await invalidateEnrollment(payload.id);
      setReopenOpen(false);
      reopenForm.resetFields();
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.reopen_reason?.[0] ||
        error?.response?.data?.detail ||
        error?.message ||
        "Qayta ochishda xato";
      message.error(detail);
    },
  });

  const { mutateAsync: updateApplicant, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { full_name?: string; phone?: string; email?: string; direction_choice?: number | null } }) =>
      updateEnrollmentApplicant(id, data),
    onSuccess: async (_data, payload) => {
      message.success("Ariza yangilandi");
      await invalidateEnrollment(payload.id);
      setEditOpen(false);
      editForm.resetFields();
    },
    onError: () => message.error("Tahrirlashda xato"),
  });

  const { mutateAsync: removeApplicant, isPending: deleting } = useMutation({
    mutationFn: (id: number) => deleteEnrollmentApplicant(id),
    onMutate: (id) => setDeleteId(id),
    onSuccess: async (_data, id) => {
      message.success("Ariza o'chirildi");
      await invalidateEnrollment(id);
      if (detailApplicantId === id) {
        closeDetail();
      }
      if (selectedApplicant?.id === id) {
        setSelectedApplicant(null);
      }
    },
    onError: () => message.error("O'chirishda xato"),
    onSettled: () => setDeleteId(null),
  });

  const { mutateAsync: reverify, isPending: reverifying } = useMutation({
    mutationFn: (id: number) => reverifyEnrollment(id),
    onSuccess: async (_data, id) => {
      message.success("AI qayta tekshirildi");
      await invalidateEnrollment(id);
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        "AI tekshiruvda xato";
      message.error(detail);
    },
  });

  const onRejectSubmit = async (values: any) => {
    if (!selectedApplicant) return;
    await reject({
      id: selectedApplicant.id,
      reject_reason: values.reject_reason?.trim() || "",
    });
  };

  const onReopenSubmit = async (values: any) => {
    if (!selectedApplicant) return;
    await reopen({
      id: selectedApplicant.id,
      reopen_reason: values.reopen_reason?.trim() || "",
    });
  };

  const handleDelete = async (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (isFinalApplicantStatus(item.status)) {
      message.warning("Final holatdagi ariza o'chirilmaydi.");
      return;
    }
    setSelectedApplicant(item);
    await removeApplicant(item.id);
  };

  const handleReverify = async (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (isFinalApplicantStatus(item.status)) {
      message.warning("Final holatdagi ariza qayta tekshirilmaydi.");
      return;
    }
    setSelectedApplicant(item);
    await reverify(item.id);
  };

  const onApprove = async (values: any) => {
    if (!selectedApplicant) return;
    const role = values.role as "student" | "teacher";
    if (role === "student") {
      if (!values.group_id) {
        message.warning("Guruh tanlang");
        return;
      }
      await approve({
        id: selectedApplicant.id,
        role,
        group_id: values.group_id,
        admission_year: values.admission_year ?? new Date().getFullYear(),
        manual_override_reason: values.manual_override_reason?.trim() || undefined,
      });
      return;
    }

    if (!values.subject_id) {
      message.warning("Fan tanlang");
      return;
    }
    await approve({
      id: selectedApplicant.id,
      role,
      subject_id: values.subject_id,
      group_ids: values.group_ids || [],
      manual_override_reason: values.manual_override_reason?.trim() || undefined,
    });
  };

  const onEditSubmit = async (values: any) => {
    if (!selectedApplicant) return;
    await updateApplicant({
      id: selectedApplicant.id,
      data: {
        full_name: values.full_name?.trim() || selectedApplicant.full_name || "",
        phone: values.phone || "",
        email: values.email || "",
        direction_choice: values.direction_choice ?? null,
      },
    });
  };

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
        row.direction_name || (row.direction_choice ? directionMap.get(row.direction_choice) || "-" : "-"),
    },
    {
      title: "AI verdict",
      render: (_: unknown, row: EnrollmentItem) => (
        <Space direction="vertical" size={2}>
          <Tag color={row.ai_summary.color}>{row.ai_summary.label}</Tag>
          <Text type="secondary">Ishonch: {formatConfidence(row.ai_summary.confidence)}</Text>
        </Space>
      ),
    },
    {
      title: "Holat",
      dataIndex: "status",
      render: (value: string) => statusTag(value),
    },
    {
      title: "Yuborilgan",
      dataIndex: "created_at",
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Amallar",
      render: (_: unknown, row: EnrollmentItem) => {
        const locked = isFinalApplicantStatus(row.status);
        return (
          <Space wrap>
            <Button size="small" onClick={() => openDetails(row)}>
              Ko'rish
            </Button>
            <Button size="small" disabled={locked} onClick={() => openEdit(row)}>
              Tahrirlash
            </Button>
            <Button
              size="small"
              type="primary"
              disabled={locked}
              loading={approving && selectedApplicant?.id === row.id}
              onClick={() => openApprove(row)}
            >
              Tasdiqlash
            </Button>
            <Button
              size="small"
              danger
              disabled={locked}
              loading={rejecting && selectedApplicant?.id === row.id}
              onClick={() => openReject(row)}
            >
              Rad etish
            </Button>
            {row.status === "rejected" ? (
              <Button
                size="small"
                type="dashed"
                loading={reopening && selectedApplicant?.id === row.id}
                onClick={() => openReopen(row)}
              >
                Qayta ochish
              </Button>
            ) : null}
            <Popconfirm
              title="Arizani o'chirishni xohlaysizmi?"
              okText="Ha"
              cancelText="Yo'q"
              okButtonProps={{ loading: deleting && deleteId === row.id }}
              onConfirm={() => handleDelete(row)}
            >
              <Button size="small" danger disabled={locked || (deleting && deleteId === row.id)}>
                O'chirish
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const detailSummary = currentApplicant?.ai_summary;
  const detailHistory = (currentApplicant as EnrollmentDetailItem | null)?.verification_history || [];
  const decisionHistory = applicantAuditHistory || [];

  return (
    <Card title="Ro'yxatdan o'tish arizalari" style={{ marginBottom: 16 }}>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: <Empty description="Arizalar yo'q" /> }}
        columns={columns}
      />

      <Drawer
        open={detailOpen}
        width={920}
        title="Ariza review"
        onClose={closeDetail}
        extra={
          currentApplicant ? (
            <Space wrap>
              <Button
                disabled={isFinalApplicantStatus(currentApplicant.status)}
                onClick={() => openEdit(currentApplicant)}
              >
                Tahrirlash
              </Button>
              <Button
                type="primary"
                disabled={isFinalApplicantStatus(currentApplicant.status)}
                onClick={() => openApprove(currentApplicant)}
              >
                Tasdiqlash
              </Button>
              <Button
                danger
                disabled={isFinalApplicantStatus(currentApplicant.status)}
                onClick={() => openReject(currentApplicant)}
                loading={rejecting && selectedApplicant?.id === currentApplicant.id}
              >
                Rad etish
              </Button>
              {currentApplicant.status === "rejected" ? (
                <Button
                  type="dashed"
                  loading={reopening && selectedApplicant?.id === currentApplicant.id}
                  onClick={() => openReopen(currentApplicant)}
                >
                  Qayta ochish
                </Button>
              ) : null}
            </Space>
          ) : null
        }
      >
        {detailLoading && !detailApplicant ? (
          <Skeleton active paragraph={{ rows: 12 }} />
        ) : currentApplicant ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card size="small">
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                <Space wrap align="center">
                  <Title level={4} style={{ margin: 0 }}>
                    {currentApplicant.full_name || `Ariza #${currentApplicant.id}`}
                  </Title>
                  {statusTag(currentApplicant.status)}
                  {detailSummary ? <Tag color={detailSummary.color}>{detailSummary.label}</Tag> : null}
                </Space>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Telefon">{currentApplicant.phone || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Email">{currentApplicant.email || "-"}</Descriptions.Item>
                  <Descriptions.Item label="Yo'nalish">
                    {currentApplicant.direction_name ||
                      (currentApplicant.direction_choice
                        ? directionMap.get(currentApplicant.direction_choice) || currentApplicant.direction_choice
                        : "-")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Yuborilgan">{formatDateTime(currentApplicant.created_at)}</Descriptions.Item>
                  {"approved_at" in currentApplicant ? (
                    <Descriptions.Item label="Tasdiqlangan vaqt">
                      {formatDateTime(currentApplicant.approved_at)}
                    </Descriptions.Item>
                  ) : null}
                  {"approved_by_name" in currentApplicant ? (
                    <Descriptions.Item label="Tasdiqlagan admin">
                      {currentApplicant.approved_by_name || "-"}
                    </Descriptions.Item>
                  ) : null}
                </Descriptions>
              </Space>
            </Card>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  {renderDocumentPreview(
                    "Passport preview",
                    (currentApplicant as EnrollmentDetailItem).documents?.passport_front,
                  )}
                  {renderDocumentPreview(
                    "Selfie preview",
                    (currentApplicant as EnrollmentDetailItem).documents?.face_image,
                  )}
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="AI verdict" style={{ height: "100%" }}>
                  {detailSummary ? (
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                      <Space wrap>
                        <Tag color={detailSummary.color}>{detailSummary.label}</Tag>
                        {detailSummary.manual_review_required ? (
                          <Tag color="gold">Manual review kerak</Tag>
                        ) : (
                          <Tag color="green">Approve-ready</Tag>
                        )}
                        {detailSummary.face_embedding_ready ? (
                          <Tag color="cyan">Face baza tayyor</Tag>
                        ) : null}
                      </Space>
                      <Alert
                        type={aiAlertType(detailSummary)}
                        showIcon
                        message={detailSummary.message}
                        description={
                          detailSummary.reason
                            ? `Sabab: ${AI_REASON_LABELS[detailSummary.reason] || detailSummary.reason}`
                            : undefined
                        }
                      />
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="Ishonch">
                          {formatConfidence(detailSummary.confidence)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Threshold">
                          {detailSummary.threshold ?? "-"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Oxirgi tekshiruv">
                          {formatDateTime(detailSummary.checked_at)}
                        </Descriptions.Item>
                      </Descriptions>
                      {detailSummary.event_summary?.length ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {detailSummary.event_summary.map((line) => (
                            <Text key={line} type="secondary">
                              {line}
                            </Text>
                          ))}
                        </div>
                      ) : null}
                      <Button
                        disabled={isFinalApplicantStatus(currentApplicant.status)}
                        loading={reverifying && selectedApplicant?.id === currentApplicant.id}
                        onClick={() => void handleReverify(currentApplicant)}
                      >
                        AI qayta tekshir
                      </Button>
                      {isFinalApplicantStatus(currentApplicant.status) ? (
                        <Text type="secondary">Final holatdagi ariza uchun AI qayta tekshiruvi yopilgan.</Text>
                      ) : null}
                    </Space>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="AI summary topilmadi" />
                  )}
                </Card>
              </Col>
            </Row>

            <Card size="small" title="Tekshiruvlar tarixi">
              {detailHistory.length ? (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {detailHistory.map(renderVerificationCard)}
                </Space>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tekshiruv tarixi yo'q" />
              )}
            </Card>

            <Card size="small" title="Qarorlar tarixi">
              {applicantAuditLoading && !decisionHistory.length ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : decisionHistory.length ? (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {decisionHistory.map(renderAuditCard)}
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
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updating}
        destroyOnClose
      >
        {selectedApplicant ? (
          <Form layout="vertical" form={editForm} onFinish={onEditSubmit}>
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
                options={(directions || []).map((direction) => ({ value: direction.id, label: direction.name }))}
                placeholder="Yo'nalish tanlang"
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        title="Arizani rad etish"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={() => rejectForm.submit()}
        confirmLoading={rejecting}
        destroyOnClose
      >
        {selectedApplicant ? (
          <Form layout="vertical" form={rejectForm} onFinish={onRejectSubmit}>
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
        open={reopenOpen}
        onCancel={() => setReopenOpen(false)}
        onOk={() => reopenForm.submit()}
        confirmLoading={reopening}
        destroyOnClose
      >
        {selectedApplicant ? (
          <Form layout="vertical" form={reopenForm} onFinish={onReopenSubmit}>
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
        open={approveOpen}
        onCancel={() => setApproveOpen(false)}
        onOk={() => approveForm.submit()}
        confirmLoading={approving}
        destroyOnClose
      >
        {selectedApplicant ? (
          <>
            {selectedApplicant.ai_summary.manual_review_required ? (
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

            <Form layout="vertical" form={approveForm} onFinish={onApprove}>
              <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "student", label: "Talaba" },
                    { value: "teacher", label: "O'qituvchi" },
                  ]}
                />
              </Form.Item>

              {selectedApplicant.ai_summary.manual_review_required ? (
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
                            options={(groups || []).map((group) => ({ value: group.id, label: group.name }))}
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
                          options={(subjects || []).map((subject) => ({ value: subject.id, label: subject.name }))}
                          placeholder="Fan tanlang"
                        />
                      </Form.Item>
                      <Form.Item name="group_ids" label="Guruhlar (ixtiyoriy)">
                        <Select
                          mode="multiple"
                          options={(groups || []).map((group) => ({ value: group.id, label: group.name }))}
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
