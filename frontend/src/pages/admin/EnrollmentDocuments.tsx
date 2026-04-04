import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
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
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const normFile = (e: any) => {
  if (Array.isArray(e)) return e;
  return e?.fileList || [];
};

const buildFormData = (values: any) => {
  const fd = new FormData();
  if (values.applicant) fd.append("applicant", String(values.applicant));
  const front = values.passport_front?.[0]?.originFileObj;
  const face = values.face_image?.[0]?.originFileObj;
  if (front) fd.append("passport_front", front);
  if (face) fd.append("face_image", face);
  return fd;
};

const EnrollmentDocumentsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: docs, isLoading } = useQuery(adminQueryOptions.enrollmentDocuments());
  const { data: applicants } = useQuery(adminQueryOptions.enrollmentList());
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
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentDocuments });
      createForm.resetFields();
    },
    onError: () => message.error(t('common.saveError')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEnrollmentDocument(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentDocuments });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  return (
    <Card title="Ariza hujjatlari" style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" form={createForm} onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
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
            <Button>{t('common.upload')}</Button>
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
            <Button>{t('common.upload')}</Button>
          </Upload>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.add')}
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
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>{t('common.view')}</Button> : "-"),
          },
          {
            title: "Pasport orqasi",
            dataIndex: "passport_back",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>{t('common.view')}</Button> : "-"),
          },
          {
            title: "Yuz rasmi",
            dataIndex: "face_image",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>{t('common.view')}</Button> : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: any) => (
              <Popconfirm title={t('common.confirmDelete')} onConfirm={() => deleteMut.mutate(r.id)}>
                <Button size="small" danger>
                  {t('common.delete')}
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal open={!!preview} onCancel={() => setPreview(null)} footer={null} title="Rasm">
        {preview ? <img src={preview} alt="preview" style={{ width: "100%" }} loading="lazy" /> : null}
      </Modal>
    </Card>
  );
};

export default EnrollmentDocumentsPage;
