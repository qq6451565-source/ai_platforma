import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Modal,
  Popconfirm,
  Select,
  Table,
  Upload,
  message,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  createEnrollmentDocument,
  deleteEnrollmentDocument,
  fetchEnrollment,
  fetchEnrollmentDocuments,
} from "../../api/admin";

const normFile = (e: any) => {
  if (Array.isArray(e)) return e;
  return e?.fileList || [];
};

const buildFormData = (values: any) => {
  const fd = new FormData();
  if (values.applicant) fd.append("applicant", String(values.applicant));
  const front = values.passport_front?.[0]?.originFileObj;
  const back = values.passport_back?.[0]?.originFileObj;
  const face = values.face_image?.[0]?.originFileObj;
  if (front) fd.append("passport_front", front);
  if (back) fd.append("passport_back", back);
  if (face) fd.append("face_image", face);
  return fd;
};

const EnrollmentDocumentsPage = () => {
  const qc = useQueryClient();
  const { data: docs, isLoading } = useQuery({
    queryKey: ["admin-enrollment-docs"],
    queryFn: fetchEnrollmentDocuments,
  });
  const { data: applicants } = useQuery({
    queryKey: ["admin-enrollment-applicants"],
    queryFn: fetchEnrollment,
  });
  const [createForm] = Form.useForm();
  const [preview, setPreview] = useState<string | null>(null);

  const applicantOptions = useMemo(
    () => (applicants || []).map((a: any) => ({ value: a.id, label: a.full_name || `#${a.id}` })),
    [applicants]
  );

  const createMut = useMutation({
    mutationFn: (vals: any) => createEnrollmentDocument(buildFormData(vals)),
    onSuccess: async () => {
      message.success("Hujjat qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-docs"] });
      createForm.resetFields();
    },
    onError: () => message.error("Saqlashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEnrollmentDocument(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-docs"] });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  return (
    <Card title="Ariza hujjatlari" style={{ marginBottom: 16 }}>
      <Form layout="vertical" form={createForm} onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="applicant" label="Arizachi" rules={[{ required: true }]}>
          <Select options={applicantOptions} placeholder="Arizachi tanlang" />
        </Form.Item>
        <Form.Item
          name="passport_front"
          label="Pasport oldi"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: "Pasport oldi kerak" }]}
        >
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button>Yuklash</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          name="passport_back"
          label="Pasport orqasi"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: "Pasport orqasi kerak" }]}
        >
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button>Yuklash</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          name="face_image"
          label="Yuz rasmi"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: "Yuz rasmi kerak" }]}
        >
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button>Yuklash</Button>
          </Upload>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={docs || []}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "Arizachi",
            dataIndex: "applicant",
            render: (v: number) => applicantOptions.find((a) => a.value === v)?.label || v,
          },
          {
            title: "Pasport oldi",
            dataIndex: "passport_front",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>Ko'rish</Button> : "-"),
          },
          {
            title: "Pasport orqasi",
            dataIndex: "passport_back",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>Ko'rish</Button> : "-"),
          },
          {
            title: "Yuz rasmi",
            dataIndex: "face_image",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>Ko'rish</Button> : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: any) => (
              <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r.id)}>
                <Button size="small" danger>
                  O'chirish
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal open={!!preview} onCancel={() => setPreview(null)} footer={null} title="Rasm">
        {preview ? <img src={preview} alt="preview" style={{ width: "100%" }} /> : null}
      </Modal>
    </Card>
  );
};

export default EnrollmentDocumentsPage;
