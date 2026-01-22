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
  InputNumber,
  Modal,
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
} from "../../api/admin";

const { Text } = Typography;

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
  const [activeApplicant, setActiveApplicant] = useState<EnrollmentItem | null>(null);
  const [approveForm] = Form.useForm();

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
    onError: () => message.error("AI tekshiruvda xato"),
  });

  const isVerified = (item: EnrollmentItem) => (item.verifications || []).some((v) => v.verified);

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
            render: (_: unknown, row: EnrollmentItem) =>
              isVerified(row) ? <Tag color="green">Tasdiqlandi</Tag> : <Tag color="red">Tasdiqlanmadi</Tag>,
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
                {isVerified(activeApplicant) ? <Tag color="green">Tasdiqlandi</Tag> : <Tag color="red">Yo'q</Tag>}
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
                        <Tag color={v.verified ? "green" : "red"}>{v.verified ? "Verified" : "Not verified"}</Tag>
                        <Text>Ishonch: {v.confidence ?? 0}</Text>
                        <Text type="secondary">
                          {v.created_at ? dayjs(v.created_at).format("YYYY-MM-DD HH:mm") : "-"}
                        </Text>
                      </Space>
                      {v.events_json ? (
                        <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                          {JSON.stringify(v.events_json, null, 2)}
                        </pre>
                      ) : null}
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
