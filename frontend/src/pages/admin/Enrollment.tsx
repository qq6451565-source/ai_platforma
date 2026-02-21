import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  DatePicker,
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
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  fetchEnrollment,
  approveEnrollment,
  rejectEnrollment,
  reverifyEnrollment,
  EnrollmentItem,
  fetchGroupsAdmin,
  fetchSubjectsAdmin,
  fetchDirections,
  updateEnrollmentApplicant,
  deleteEnrollmentApplicant,
} from "../../api/admin";

const { Text } = Typography;
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

type AiStatusMeta = {
  color: string;
  label: string;
  message: string;
  reason?: string;
};

const EnrollmentPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-enrollment"],
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

  const directionMap = useMemo(() => {
    const map = new Map<number, string>();
    (directions || []).forEach((d) => map.set(d.id, d.name));
    return map;
  }, [directions]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeApplicant, setActiveApplicant] = useState<EnrollmentItem | null>(null);
  const [approveForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { mutateAsync: approve, isPending: approving } = useMutation({
    mutationFn: (payload: {
      id: number;
      role: "student" | "teacher";
      group_id?: number;
      subject_id?: number;
      group_ids?: number[];
      admission_year?: number;
    }) => approveEnrollment(payload.id, payload),
    onSuccess: async () => {
      message.success("Tasdiqlandi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment"] });
      setApproveOpen(false);
      setActiveApplicant(null);
      approveForm.resetFields();
    },
    onError: () => message.error("Tasdiqlashda xato"),
  });

  const { mutateAsync: reject, isPending: rejecting } = useMutation({
    mutationFn: (id: number) => rejectEnrollment(id),
    onSuccess: async () => {
      message.success("Rad etildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment"] });
    },
    onError: () => message.error("Rad etishda xato"),
  });

  const { mutateAsync: updateApplicant, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EnrollmentItem> }) =>
      updateEnrollmentApplicant(id, data),
    onSuccess: async () => {
      message.success("Yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment"] });
      setEditOpen(false);
      setActiveApplicant(null);
      editForm.resetFields();
    },
    onError: () => message.error("Tahrirlashda xato"),
  });

  const { mutateAsync: removeApplicant, isPending: deleting } = useMutation({
    mutationFn: (id: number) => deleteEnrollmentApplicant(id),
    onMutate: (id) => {
      setDeleteId(id);
    },
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment"] });
      setActiveApplicant(null);
    },
    onError: () => message.error("O'chirishda xato"),
    onSettled: () => {
      setDeleteId(null);
    },
  });

  const refreshEnrollment = async (targetId?: number) => {
    const updated = await fetchEnrollment();
    qc.setQueryData(["admin-enrollment"], updated);
    if (targetId) {
      const next = updated.find((item) => item.id === targetId) || null;
      setActiveApplicant(next);
    }
  };

  const { mutateAsync: reverify, isPending: reverifying } = useMutation({
    mutationFn: (id: number) => reverifyEnrollment(id),
    onSuccess: async (_data, id) => {
      message.success("AI qayta tekshirildi");
      await refreshEnrollment(id);
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

  const isVerified = (item: EnrollmentItem) => (item.verifications || []).some((v) => v.verified);
  const getLatestVerification = (item: EnrollmentItem) =>
    [...(item.verifications || [])].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })[0];

  const getUnavailableEvent = (events: unknown) => {
    if (!Array.isArray(events)) return undefined;
    return events.find(
      (event: any) => event?.type === "ai" && event?.status === "unavailable",
    ) as { detail?: string; reason?: string } | undefined;
  };

  const summarizeEvents = (events: unknown) => {
    if (!Array.isArray(events) || !events.length) return "Hodisalar yo'q";
    return events
      .map((event: any) => {
        const type = event?.type || "unknown";
        const status = event?.status || "n/a";
        return `${type}:${status}`;
      })
      .join(", ");
  };

  const getAiStatus = (item: EnrollmentItem): AiStatusMeta => {
    const latest = getLatestVerification(item);
    if (!latest) {
      return {
        color: "default",
        label: "Tekshirilmagan",
        message: "AI tekshiruv hali ishlatilmagan.",
      };
    }
    if (latest.verified) {
      return {
        color: "green",
        label: "Tasdiqlandi",
        message: "AI tekshiruv muvaffaqiyatli yakunlandi.",
      };
    }

    const unavailable = getUnavailableEvent(latest.events_json);
    if (unavailable) {
      const reason = unavailable.reason || "connection_error";
      return {
        color: "orange",
        label: "AI mavjud emas",
        reason,
        message:
          unavailable.detail ||
          `AI xizmati vaqtincha mavjud emas (${AI_REASON_LABELS[reason] || reason}).`,
      };
    }

    return {
      color: "red",
      label: "Tasdiqlanmadi",
      message: "AI tekshiruv ma'lumotlarni tasdiqlamadi.",
    };
  };

  const statusTag = (status?: string) => {
    if (status === "approved") return <Tag color="green">Tasdiqlangan</Tag>;
    if (status === "rejected") return <Tag color="red">Rad etilgan</Tag>;
    if (status === "verified") return <Tag color="blue">Tekshirilgan</Tag>;
    return <Tag>Pending</Tag>;
  };

  const openDetails = (item: EnrollmentItem) => {
    setActiveApplicant(item);
    setDetailOpen(true);
  };

  const openApprove = (item: EnrollmentItem) => {
    setActiveApplicant(item);
    approveForm.setFieldsValue({
      role: "student",
      group_id: undefined,
      admission_year: undefined,
      subject_id: undefined,
      group_ids: [],
    });
    setApproveOpen(true);
  };

  const openEdit = (item: EnrollmentItem) => {
    setActiveApplicant(item);
    editForm.setFieldsValue({
      full_name: item.full_name || "",
      phone: item.phone || "",
      email: item.email || "",
      surname: item.surname || "",
      name: item.name || "",
      patronymic: item.patronymic || "",
      passport_id: item.passport_id || "",
      card_number: item.card_number || "",
      personal_number: item.personal_number || "",
      birth_date: item.birth_date ? dayjs(item.birth_date) : null,
      sex: item.sex || undefined,
      citizenship: item.citizenship || "",
      birth_place: item.birth_place || "",
      direction_choice: item.direction_choice ?? undefined,
    });
    setEditOpen(true);
  };

  const onApprove = async (vals: any) => {
    if (!activeApplicant) return;
    const role = vals.role as "student" | "teacher";
    if (role === "student") {
      if (!vals.group_id) {
        message.warning("Guruh tanlang");
        return;
      }
      const group = (groups || []).find((g) => g.id === vals.group_id);
      const admissionYear = vals.admission_year ?? new Date().getFullYear();
      await approve({
        id: activeApplicant.id,
        role,
        group_id: vals.group_id,
        admission_year: admissionYear,
      });
      return;
    }

    if (!vals.subject_id) {
      message.warning("Fan tanlang");
      return;
    }
    await approve({
      id: activeApplicant.id,
      role,
      subject_id: vals.subject_id,
      group_ids: vals.group_ids || [],
    });
  };

  const onEditSubmit = async (vals: any) => {
    if (!activeApplicant) return;
    const payload: Partial<EnrollmentItem> = {
      full_name: vals.full_name?.trim() || activeApplicant.full_name || "",
      phone: vals.phone || "",
      email: vals.email || "",
      surname: vals.surname || "",
      name: vals.name || "",
      patronymic: vals.patronymic || "",
      passport_id: vals.passport_id || null,
      card_number: vals.card_number || null,
      personal_number: vals.personal_number || null,
      birth_date: vals.birth_date ? vals.birth_date.format("YYYY-MM-DD") : null,
      sex: vals.sex || "",
      citizenship: vals.citizenship || "",
      birth_place: vals.birth_place || "",
      direction_choice: vals.direction_choice ?? null,
    };
    await updateApplicant({ id: activeApplicant.id, data: payload });
  };

  return (
    <Card title="Ro'yxatdan o'tish arizalari" style={{ marginBottom: 16 }}>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: <Empty description="Arizalar yo'q" /> }}
        columns={[
          {
            title: "F.I.Sh",
            dataIndex: "full_name",
            render: (_: unknown, row: EnrollmentItem) => row.full_name || `Ariza #${row.id}`,
          },
          {
            title: "Holat",
            dataIndex: "status",
            render: (v: string) => statusTag(v),
          },
          {
            title: "AI",
            render: (_: unknown, row: EnrollmentItem) => {
              const aiStatus = getAiStatus(row);
              return <Tag color={aiStatus.color}>{aiStatus.label}</Tag>;
            },
          },
          {
            title: "Telefon",
            dataIndex: "phone",
            render: (v: string) => v || "-",
          },
          {
            title: "Yo'nalish",
            dataIndex: "direction_choice",
            render: (v: number | null) => (v ? directionMap.get(v) || v : "-"),
          },
          {
            title: "Yuborilgan",
            dataIndex: "created_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, row: EnrollmentItem) => (
              <Space>
                <Button size="small" onClick={() => openDetails(row)}>
                  Ko'rish
                </Button>
                <Button size="small" onClick={() => openEdit(row)}>
                  Tahrirlash
                </Button>
                <Button
                  size="small"
                  type="primary"
                  disabled={row.status === "approved" || row.status === "rejected"}
                  loading={approving && activeApplicant?.id === row.id}
                  onClick={() => openApprove(row)}
                >
                  Tasdiqlash
                </Button>
                <Button
                  size="small"
                  danger
                  disabled={row.status === "approved" || row.status === "rejected"}
                  loading={rejecting && activeApplicant?.id === row.id}
                  onClick={() => reject(row.id)}
                >
                  Rad etish
                </Button>
                <Popconfirm
                  title="Arizani o'chirishni xohlaysizmi?"
                  okText="Ha"
                  cancelText="Yo'q"
                  okButtonProps={{ loading: deleting && deleteId === row.id }}
                  onConfirm={() => removeApplicant(row.id)}
                >
                  <Button size="small" danger disabled={deleting && deleteId === row.id}>
                    O'chirish
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        open={detailOpen}
        width={720}
        title="Ariza tafsilotlari"
        onClose={() => setDetailOpen(false)}
      >
        {activeApplicant ? (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="F.I.Sh">
                {activeApplicant.full_name || `Ariza #${activeApplicant.id}`}
              </Descriptions.Item>
              <Descriptions.Item label="Holat">{statusTag(activeApplicant.status)}</Descriptions.Item>
              <Descriptions.Item label="Telefon">{activeApplicant.phone || "-"}</Descriptions.Item>
              <Descriptions.Item label="Email">{activeApplicant.email || "-"}</Descriptions.Item>
              <Descriptions.Item label="Familiya">{activeApplicant.surname || "-"}</Descriptions.Item>
              <Descriptions.Item label="Ism">{activeApplicant.name || "-"}</Descriptions.Item>
              <Descriptions.Item label="Otasining ismi">{activeApplicant.patronymic || "-"}</Descriptions.Item>
              <Descriptions.Item label="Karta raqami">
                {activeApplicant.card_number || activeApplicant.passport_id || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Shaxsiy raqam">{activeApplicant.personal_number || "-"}</Descriptions.Item>
              <Descriptions.Item label="Tug'ilgan sana">
                {activeApplicant.birth_date ? dayjs(activeApplicant.birth_date).format("YYYY-MM-DD") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Jinsi">{activeApplicant.sex || "-"}</Descriptions.Item>
              <Descriptions.Item label="Fuqaroligi">{activeApplicant.citizenship || "-"}</Descriptions.Item>
              <Descriptions.Item label="Tug'ilgan joy">{activeApplicant.birth_place || "-"}</Descriptions.Item>
              <Descriptions.Item label="Yo'nalish">
                {activeApplicant.direction_choice
                  ? directionMap.get(activeApplicant.direction_choice) || activeApplicant.direction_choice
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="AI holati">
                {(() => {
                  const aiStatus = getAiStatus(activeApplicant);
                  return <Tag color={aiStatus.color}>{aiStatus.label}</Tag>;
                })()}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Hujjatlar</Divider>
            <Space wrap>
              {activeApplicant.documents?.passport_front ? (
                <Image width={180} src={activeApplicant.documents.passport_front} />
              ) : (
                <Text type="secondary">Pasport oldi yo'q</Text>
              )}
              {activeApplicant.documents?.passport_back ? (
                <Image width={180} src={activeApplicant.documents.passport_back} />
              ) : (
                <Text type="secondary">Pasport orqasi yo'q</Text>
              )}
              {activeApplicant.documents?.face_image ? (
                <Image width={180} src={activeApplicant.documents.face_image} />
              ) : (
                <Text type="secondary">Selfie yo'q</Text>
              )}
            </Space>

            <Divider>AI tekshiruv</Divider>
            <Space wrap style={{ marginBottom: 12 }}>
              <Button
                size="small"
                loading={reverifying}
                onClick={() => activeApplicant && reverify(activeApplicant.id)}
              >
                AI qayta tekshir
              </Button>
              <Text type="secondary">Natijani yangilash uchun qayta tekshirishingiz mumkin.</Text>
            </Space>
            {activeApplicant.verifications && activeApplicant.verifications.length ? (
              <Space direction="vertical" style={{ width: "100%" }}>
                {activeApplicant.verifications
                  .slice()
                  .sort((a, b) => {
                    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return bTime - aTime;
                  })
                  .map((v, idx) => (
                    <Card key={idx} size="small">
                      <Space wrap>
                        {(() => {
                          const unavailable = getUnavailableEvent(v.events_json);
                          if (v.verified) return <Tag color="green">Verified</Tag>;
                          if (unavailable) return <Tag color="orange">AI unavailable</Tag>;
                          return <Tag color="red">Not verified</Tag>;
                        })()}
                        <Text>Ishonch: {v.confidence ?? 0}</Text>
                        <Text type="secondary">
                          {v.created_at ? dayjs(v.created_at).format("YYYY-MM-DD HH:mm") : "-"}
                        </Text>
                      </Space>
                      {(() => {
                        const unavailable = getUnavailableEvent(v.events_json);
                        if (unavailable) {
                          const reason = unavailable.reason || "connection_error";
                          const reasonLabel = AI_REASON_LABELS[reason] || reason;
                          return (
                            <Alert
                              style={{ marginTop: 8 }}
                              type="warning"
                              showIcon
                              message={unavailable.detail || "AI xizmati vaqtincha mavjud emas."}
                              description={`Sabab: ${reasonLabel}`}
                            />
                          );
                        }
                        return (
                          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                            Hodisalar: {summarizeEvents(v.events_json)}
                          </Text>
                        );
                      })()}
                    </Card>
                  ))}
              </Space>
            ) : (
              <Text type="secondary">Tekshiruv natijalari yo'q</Text>
            )}
          </>
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
        {activeApplicant ? (
          <Form layout="vertical" form={editForm} onFinish={onEditSubmit}>
            <Form.Item name="full_name" label="F.I.Sh" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="surname" label="Familiya">
              <Input />
            </Form.Item>
            <Form.Item name="name" label="Ism">
              <Input />
            </Form.Item>
            <Form.Item name="patronymic" label="Otasining ismi">
              <Input />
            </Form.Item>
            <Form.Item name="passport_id" label="Passport ID">
              <Input />
            </Form.Item>
            <Form.Item name="card_number" label="Karta raqami">
              <Input />
            </Form.Item>
            <Form.Item name="personal_number" label="Shaxsiy raqam">
              <Input />
            </Form.Item>
            <Form.Item name="birth_date" label="Tug'ilgan sana">
              <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="sex" label="Jinsi">
              <Select
                allowClear
                options={[
                  { value: "ERKAK", label: "Erkak" },
                  { value: "AYOL", label: "Ayol" },
                ]}
              />
            </Form.Item>
            <Form.Item name="citizenship" label="Fuqaroligi">
              <Input />
            </Form.Item>
            <Form.Item name="birth_place" label="Tug'ilgan joy">
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
                options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
                placeholder="Yo'nalish tanlang"
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
        {activeApplicant ? (
          <>
            {!isVerified(activeApplicant) ? (
              <Alert
                type="warning"
                showIcon
                message="AI tekshiruv tasdiqlanmagan. Tasdiqlash tavsiya etilmaydi."
                style={{ marginBottom: 12 }}
              />
            ) : null}
            <Form layout="vertical" form={approveForm} onFinish={onApprove}>
              <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "student", label: "Talaba" },
                    { value: "teacher", label: "O'qituvchi" },
                  ]}
                />
              </Form.Item>

              <Form.Item shouldUpdate>
                {({ getFieldValue }) => {
                  const role = getFieldValue("role") || "student";
                  if (role === "student") {
                    return (
                      <>
                        <Form.Item name="group_id" label="Guruh" rules={[{ required: true }]}>
                          <Select
                            options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
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
                          options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
                          placeholder="Fan tanlang"
                        />
                      </Form.Item>
                      <Form.Item name="group_ids" label="Guruhlar (ixtiyoriy)">
                        <Select
                          mode="multiple"
                          options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
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
