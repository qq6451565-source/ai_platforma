import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Upload,
  message,
} from "antd";
import dayjs from "dayjs";
import type { UploadFile } from "antd/es/upload/interface";
import { AdminUser, createPassportData, deletePassportData, updatePassportData } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const normFile = (e: any) => {
  if (Array.isArray(e)) return e;
  return e?.fileList || [];
};

const buildFormData = (values: any) => {
  const fd = new FormData();
  if (values.user) fd.append("user", String(values.user));
  if (values.passport_series) fd.append("passport_series", values.passport_series);
  if (values.passport_number) fd.append("passport_number", values.passport_number);
  if (values.birth_date) fd.append("birth_date", values.birth_date.format("YYYY-MM-DD"));
  if (values.extracted_fullname) fd.append("extracted_fullname", values.extracted_fullname);
  const front = values.front_image?.[0]?.originFileObj;
  const back = values.back_image?.[0]?.originFileObj;
  const selfie = values.selfie_image?.[0]?.originFileObj;
  if (front) fd.append("front_image", front);
  if (back) fd.append("back_image", back);
  if (selfie) fd.append("selfie_image", selfie);
  return fd;
};

const PassportDataPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminQueryOptions.passports());
  const { data: users } = useQuery(adminQueryOptions.users());

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const createMut = useMutation({
    mutationFn: (vals: any) => createPassportData(buildFormData(vals)),
    onSuccess: async () => {
      message.success(t('common.saved'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.passports });
      createForm.resetFields();
    },
    onError: () => message.error(t('common.saveError')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, vals }: { id: number; vals: any }) => updatePassportData(id, buildFormData(vals)),
    onSuccess: async () => {
      message.success(t('common.updated'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.passports });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePassportData(id),
    onSuccess: async () => {
      message.success(t('common.deleted'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.passports });
    },
    onError: () => message.error(t('common.deleteError')),
  });

  const userOptions = useMemo(
    () => (users || []).map((u: AdminUser) => ({ value: u.id, label: u.username })),
    [users]
  );

  const openEdit = (row: any) => {
    setEditing(row);
    editForm.setFieldsValue({
      user: row.user,
      passport_series: row.passport_series,
      passport_number: row.passport_number,
      birth_date: row.birth_date ? dayjs(row.birth_date) : null,
      extracted_fullname: row.extracted_fullname,
      front_image: [] as UploadFile[],
      back_image: [] as UploadFile[],
      selfie_image: [] as UploadFile[],
    });
    setEditOpen(true);
  };

  return (
    <Card title={t('adminPassport.title')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" form={createForm} onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-4)' }}>
        <Form.Item name="user" label={t('adminUsers.user')} rules={[{ required: true }]}>
          <Select options={userOptions} placeholder={t('adminPassport.selectUser')} />
        </Form.Item>
        <Space style={{ display: "flex" }}>
          <Form.Item name="passport_series" label={t('adminPassport.series')} rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="passport_number" label={t('adminPassport.number')} rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Space>
        <Form.Item name="birth_date" label={t('adminPassport.birthDate')}>
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="extracted_fullname" label={t('adminPassport.ocrFullname')}>
          <Input />
        </Form.Item>
        <Form.Item
          name="front_image"
          label={t('adminPassport.frontImage')}
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: t('adminPassport.frontRequired') }]}
        >
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button>{t('common.upload')}</Button>
          </Upload>
        </Form.Item>
        <Form.Item
          name="back_image"
          label={t('adminPassport.backImage')}
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: t('adminPassport.backRequired') }]}
        >
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button>{t('common.upload')}</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="selfie_image" label={t('adminPassport.selfie')} valuePropName="fileList" getValueFromEvent={normFile}>
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
        dataSource={data || []}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: t('adminUsers.user'),
            dataIndex: "user_username",
            render: (v: string) => v || "-",
          },
          { title: t('adminPassport.series'), dataIndex: "passport_series" },
          { title: t('adminPassport.number'), dataIndex: "passport_number" },
          {
            title: t('adminPassport.birthDate'),
            dataIndex: "birth_date",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
          },
          { title: t('adminPassport.ocrFullname'), dataIndex: "extracted_fullname", render: (v: string) => v || "-" },
          {
            title: t('adminPassport.frontImage'),
            dataIndex: "front_image",
            render: (v: string) => (v ? <a href={v}>{t('common.view')}</a> : "-"),
          },
          {
            title: t('adminPassport.backImage'),
            dataIndex: "back_image",
            render: (v: string) => (v ? <a href={v}>{t('common.view')}</a> : "-"),
          },
          {
            title: t('adminPassport.selfie'),
            dataIndex: "selfie_image",
            render: (v: string) => (v ? <a href={v}>{t('common.view')}</a> : "-"),
          },
          {
            title: t('common.actions'),
            render: (_: unknown, r: any) => (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>
                  {t('common.edit')}
                </Button>
                <Popconfirm title={t('common.confirmDelete')} onConfirm={() => deleteMut.mutate(r.id)}>
                  <Button danger size="small">
                    {t('common.delete')}
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={t('adminPassport.title')}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isPending}
      >
        <Form
          layout="vertical"
          form={editForm}
          onFinish={(vals) => {
            if (!editing) return;
            updateMut.mutate({ id: editing.id, vals });
          }}
        >
          <Form.Item name="user" label={t('adminUsers.user')} rules={[{ required: true }]}>
            <Select options={userOptions} />
          </Form.Item>
          <Space style={{ display: "flex" }}>
            <Form.Item name="passport_series" label={t('adminPassport.series')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="passport_number" label={t('adminPassport.number')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="birth_date" label={t('adminPassport.birthDate')}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="extracted_fullname" label={t('adminPassport.ocrFullname')}>
            <Input />
          </Form.Item>
          <Form.Item name="front_image" label={t('adminPassport.frontImage')} valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button>{t('common.upload')}</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="back_image" label={t('adminPassport.backImage')} valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button>{t('common.upload')}</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="selfie_image" label={t('adminPassport.selfie')} valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button>{t('common.upload')}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default PassportDataPage;
