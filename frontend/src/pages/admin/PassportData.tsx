import { useMemo, useState } from "react";
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
import { fetchUsers, AdminUser, createPassportData, deletePassportData, fetchPassportData, updatePassportData } from "../../api/admin";

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
  if (front) fd.append("front_image", front);
  if (back) fd.append("back_image", back);
  return fd;
};

const PassportDataPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-passports"],
    queryFn: fetchPassportData,
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const createMut = useMutation({
    mutationFn: (vals: any) => createPassportData(buildFormData(vals)),
    onSuccess: async () => {
      message.success("Pasport ma'lumotlari qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-passports"] });
      createForm.resetFields();
    },
    onError: () => message.error("Saqlashda xato"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, vals }: { id: number; vals: any }) => updatePassportData(id, buildFormData(vals)),
    onSuccess: async () => {
      message.success("Yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-passports"] });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePassportData(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-passports"] });
    },
    onError: () => message.error("O'chirishda xato"),
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
    });
    setEditOpen(true);
  };

  return (
    <Card title="Pasport ma'lumotlari" style={{ marginBottom: 16 }}>
      <Form layout="vertical" form={createForm} onFinish={createMut.mutate} style={{ marginBottom: 16 }}>
        <Form.Item name="user" label="Foydalanuvchi" rules={[{ required: true }]}>
          <Select options={userOptions} placeholder="Foydalanuvchi tanlang" />
        </Form.Item>
        <Space style={{ display: "flex" }}>
          <Form.Item name="passport_series" label="Seriya" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="passport_number" label="Raqam" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Space>
        <Form.Item name="birth_date" label="Tug'ilgan sana">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="extracted_fullname" label="OCR ism-sharif">
          <Input />
        </Form.Item>
        <Form.Item
          name="front_image"
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
          name="back_image"
          label="Pasport orqasi"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={[{ required: true, message: "Pasport orqasi kerak" }]}
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
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "Foydalanuvchi",
            dataIndex: "user_username",
            render: (v: string) => v || "-",
          },
          { title: "Seriya", dataIndex: "passport_series" },
          { title: "Raqam", dataIndex: "passport_number" },
          {
            title: "Tug'ilgan sana",
            dataIndex: "birth_date",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
          },
          { title: "OCR ism-sharif", dataIndex: "extracted_fullname", render: (v: string) => v || "-" },
          {
            title: "Old rasm",
            dataIndex: "front_image",
            render: (v: string) => (v ? <a href={v}>Ko'rish</a> : "-"),
          },
          {
            title: "Orqa rasm",
            dataIndex: "back_image",
            render: (v: string) => (v ? <a href={v}>Ko'rish</a> : "-"),
          },
          {
            title: "Amallar",
            render: (_: unknown, r: any) => (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>
                  Tahrirlash
                </Button>
                <Popconfirm title="O'chirishni tasdiqlaysizmi?" onConfirm={() => deleteMut.mutate(r.id)}>
                  <Button danger size="small">
                    O'chirish
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="Pasportni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isLoading}
      >
        <Form layout="vertical" form={editForm} onFinish={(vals) => updateMut.mutate({ id: editing.id, vals })}>
          <Form.Item name="user" label="Foydalanuvchi" rules={[{ required: true }]}>
            <Select options={userOptions} />
          </Form.Item>
          <Space style={{ display: "flex" }}>
            <Form.Item name="passport_series" label="Seriya" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="passport_number" label="Raqam" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="birth_date" label="Tug'ilgan sana">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="extracted_fullname" label="OCR ism-sharif">
            <Input />
          </Form.Item>
          <Form.Item name="front_image" label="Pasport oldi" valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button>Yuklash</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="back_image" label="Pasport orqasi" valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button>Yuklash</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default PassportDataPage;
