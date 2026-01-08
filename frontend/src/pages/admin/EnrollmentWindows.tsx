import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DatePicker, Form, Modal, Popconfirm, Select, Space, Switch, Table, message } from "antd";
import dayjs from "dayjs";
import {
  createEnrollmentWindow,
  deleteEnrollmentWindow,
  fetchEnrollmentWindows,
  fetchFaculties,
  fetchDirections,
  updateEnrollmentWindow,
} from "../../api/admin";

const EnrollmentWindowsPage = () => {
  const qc = useQueryClient();
  const { data: windows, isLoading } = useQuery({
    queryKey: ["admin-enrollment-windows"],
    queryFn: fetchEnrollmentWindows,
  });
  const { data: faculties } = useQuery({
    queryKey: ["admin-faculties"],
    queryFn: fetchFaculties,
  });
  const { data: directions } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });

  const facultyOptions = useMemo(
    () => (faculties || []).map((f) => ({ value: f.id, label: f.name })),
    [faculties]
  );
  const directionOptions = useMemo(
    () => (directions || []).map((d) => ({ value: d.id, label: d.name })),
    [directions]
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm] = Form.useForm();

  const createMut = useMutation({
    mutationFn: (vals: any) => createEnrollmentWindow(vals),
    onSuccess: async () => {
      message.success("Oyna qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-windows"] });
    },
    onError: () => message.error("Saqlashda xato"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateEnrollmentWindow(id, payload),
    onSuccess: async () => {
      message.success("Yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-windows"] });
      setEditOpen(false);
      setEditing(null);
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteEnrollmentWindow(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment-windows"] });
    },
    onError: () => message.error("O'chirishda xato"),
  });

  const openEdit = (row: any) => {
    setEditing(row);
    editForm.setFieldsValue({
      direction: row.direction,
      faculty: row.faculty,
      start_at: row.start_at ? dayjs(row.start_at) : null,
      end_at: row.end_at ? dayjs(row.end_at) : null,
      is_active: row.is_active,
    });
    setEditOpen(true);
  };

  return (
    <Card title="Ro'yxatdan o'tish oynalari" style={{ marginBottom: 16 }}>
      <Form
        layout="vertical"
        onFinish={(vals) =>
          createMut.mutate({
            ...vals,
            start_at: vals.start_at?.toISOString(),
            end_at: vals.end_at?.toISOString(),
          })
        }
        style={{ marginBottom: 12 }}
      >
        <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
          <Select options={directionOptions} />
        </Form.Item>
        <Form.Item name="faculty" label="Fakultet" rules={[{ required: true }]}>
          <Select options={facultyOptions} />
        </Form.Item>
        <Space style={{ display: "flex" }}>
          <Form.Item name="start_at" label="Boshlanish" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="end_at" label="Tugash" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Space>
        <Form.Item name="is_active" label="Faol" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={windows || []}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "Yo'nalish",
            dataIndex: "direction",
            render: (v: number) => directionOptions.find((d) => d.value === v)?.label || v,
          },
          {
            title: "Fakultet",
            dataIndex: "faculty",
            render: (v: number) => facultyOptions.find((f) => f.value === v)?.label || v,
          },
          {
            title: "Boshlanish",
            dataIndex: "start_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Tugash",
            dataIndex: "end_at",
            render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
          },
          {
            title: "Faol",
            dataIndex: "is_active",
            render: (v: boolean) => (v ? "ha" : "yo'q"),
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
        title="Oynani tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateMut.isLoading}
      >
        <Form
          layout="vertical"
          form={editForm}
          onFinish={(vals) =>
            updateMut.mutate({
              id: editing.id,
              payload: {
                ...vals,
                start_at: vals.start_at?.toISOString(),
                end_at: vals.end_at?.toISOString(),
              },
            })
          }
        >
          <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
            <Select options={directionOptions} />
          </Form.Item>
          <Form.Item name="faculty" label="Fakultet" rules={[{ required: true }]}>
            <Select options={facultyOptions} />
          </Form.Item>
          <Space style={{ display: "flex" }}>
            <Form.Item name="start_at" label="Boshlanish" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="end_at" label="Tugash" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item name="is_active" label="Faol" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default EnrollmentWindowsPage;
