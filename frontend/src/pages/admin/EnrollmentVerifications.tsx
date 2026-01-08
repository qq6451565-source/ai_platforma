import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  createVerificationResult,
  deleteVerificationResult,
  fetchEnrollment,
  fetchVerificationResults,
  updateVerificationResult,
} from "../../api/admin";

const EnrollmentVerificationsPage = () => {
  const qc = useQueryClient();
  const { data: results, isLoading } = useQuery({
    queryKey: ["admin-enrollment-verifications"],
    queryFn: fetchVerificationResults,
  });
  const { data: applicants } = useQuery({
    queryKey: ["admin-enrollment-applicants"],
    queryFn: fetchEnrollment,
  });

  const applicantOptions = useMemo(
    () => (applicants || []).map((a: any) => ({ value: a.id, label: a.full_name || `#${a.id}` })),
    [applicants]
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm] = Form.useForm();

  const createMut = useMutation({
    mutationFn: (vals: any) => createVerificationResult(vals),
    onSuccess: async () => {
      message.success("Tekshiruv natijasi qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-verifications"] });
    },
    onError: () => message.error("Saqlashda xato"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateVerificationResult(id, payload),
    onSuccess: async () => {
      message.success("Yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-verifications"] });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteVerificationResult(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-verifications"] });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  const parseEvents = (val: string) => {
    if (!val) return [];
    try {
      return JSON.parse(val);
    } catch {
      message.error("events_json noto'g'ri JSON");
      return null;
    }
  };

  const onCreate = (vals: any) => {
    const events = parseEvents(vals.events_json || "");
    if (events === null) return;
    createMut.mutate({ ...vals, events_json: events });
  };

  const openEdit = (row: any) => {
    setEditing(row);
    editForm.setFieldsValue({
      applicant: row.applicant,
      verified: row.verified,
      confidence: row.confidence,
      events_json: row.events_json ? JSON.stringify(row.events_json) : "[]",
    });
    setEditOpen(true);
  };

  const onUpdate = (vals: any) => {
    const events = parseEvents(vals.events_json || "");
    if (events === null) return;
    updateMut.mutate({ id: editing.id, payload: { ...vals, events_json: events } });
  };

  return (
    <Card title="Tekshiruv natijalari" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={onCreate} style={{ marginBottom: 12 }}>
        <Form.Item name="applicant" label="Arizachi" rules={[{ required: true }]}>
          <Select options={applicantOptions} />
        </Form.Item>
        <Space style={{ display: "flex" }}>
          <Form.Item name="verified" label="Tasdiq" valuePropName="checked" style={{ flex: 1 }}>
            <Switch />
          </Form.Item>
          <Form.Item
            name="confidence"
            label="Ishonch"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
        <Form.Item name="events_json" label="events_json (JSON)" initialValue="[]">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={results || []}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "Arizachi",
            dataIndex: "applicant",
            render: (v: number) => applicantOptions.find((a) => a.value === v)?.label || v,
          },
          {
            title: "Tasdiq",
            dataIndex: "verified",
            render: (v: boolean) => (v ? "ha" : "yo'q"),
          },
          { title: "Ishonch", dataIndex: "confidence" },
          {
            title: "Vaqt",
            dataIndex: "created_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: any) => (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>
                  Tahrirlash
                </Button>
                <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r.id)}>
                  <Button size="small" danger>
                    O'chirish
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="Tekshiruvni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isLoading}
      >
        <Form layout="vertical" form={editForm} onFinish={onUpdate}>
          <Form.Item name="applicant" label="Arizachi" rules={[{ required: true }]}>
            <Select options={applicantOptions} />
          </Form.Item>
          <Space style={{ display: "flex" }}>
            <Form.Item name="verified" label="Tasdiq" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
            <Form.Item
              name="confidence"
              label="Ishonch"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item name="events_json" label="events_json (JSON)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default EnrollmentVerificationsPage;
