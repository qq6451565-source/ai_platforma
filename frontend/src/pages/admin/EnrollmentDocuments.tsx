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
      message.success(t('adminEnrollment.documentAdded'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentDocuments });
      createForm.resetFields();
    },
    onError: () => message.error(t('common.saveError')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEnrollmentDocument(id),
    onSuccess: async () => {
      message.success(t('common.deleted'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentDocuments });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  return (
    <Card title={t('adminEnrollment.documents')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" form={createForm} onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="applicant" label={t('adminEnrollment.applicant')} rules={[{ required: true }]}>
          <Select options={applicantOptions} placeholder={t('adminEnrollment.selectApplicant')} />
        </Form.Item>
        <Form.Item
          name="passport_front"
          label={t('adminEnrollment.passportFront')}
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: t('adminEnrollment.passportFrontRequired') }]}
        >
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button>{t('common.upload')}</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          name="face_image"
          label={t('adminEnrollment.faceImage')}
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: t('adminEnrollment.faceImageRequired') }]}
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
            title: t('adminEnrollment.applicant'),
            dataIndex: "applicant",
            render: (v: number) => applicantOptions.find((a) => a.value === v)?.label || v,
          },
          {
            title: t('adminEnrollment.passportFront'),
            dataIndex: "passport_front",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>{t('common.view')}</Button> : "-"),
          },
          {
            title: t('adminEnrollment.passportBack'),
            dataIndex: "passport_back",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>{t('common.view')}</Button> : "-"),
          },
          {
            title: t('adminEnrollment.faceImage'),
            dataIndex: "face_image",
            render: (v: string) => (v ? <Button size="small" onClick={() => setPreview(v)}>{t('common.view')}</Button> : "-"),
          },
          {
            title: t('common.actions'),
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

      <Modal open={!!preview} onCancel={() => setPreview(null)} footer={null} title={t('adminEnrollment.image')}>
        {preview ? <img src={preview} alt="preview" style={{ width: "100%" }} loading="lazy" /> : null}
      </Modal>
    </Card>
  );
};

export default EnrollmentDocumentsPage;
