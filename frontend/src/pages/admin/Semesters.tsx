import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, InputNumber, Button, List, message, Empty, Popconfirm, Modal, Select } from "antd";
import { useEffect, useState } from "react";
import {
  fetchSemesters,
  createSemester,
  deleteSemester,
  updateSemester,
  fetchSemesterSettings,
  updateSemesterSettings,
} from "../../api/admin";

const SemestersPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-semesters"],
    queryFn: fetchSemesters,
  });
  const { data: settings } = useQuery({
    queryKey: ["admin-semester-settings"],
    queryFn: fetchSemesterSettings,
  });
  const [settingsForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      settingsForm.setFieldsValue({ active_semester: settings.active_semester || null });
    }
  }, [settings, settingsForm]);

  const createMut = useMutation({
    mutationFn: (vals: { number: number }) => createSemester(vals),
    onSuccess: async () => {
      message.success("Semestr qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-semesters"] });
    },
    onError: () => message.error("Semestr qo'shishda xato"),
  });
  const updateSettingsMut = useMutation({
    mutationFn: (vals: { active_semester: number | null }) => updateSemesterSettings(vals),
    onSuccess: async () => {
      message.success("Aktiv semestr yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-semester-settings"] });
    },
    onError: () => message.error("Aktiv semestrni yangilashda xato"),
  });

  return (
    <Card title="Semestrlar" style={{ marginBottom: 16 }}>
      <Form
        layout="inline"
        form={settingsForm}
        onFinish={(vals) => updateSettingsMut.mutate({ active_semester: vals.active_semester || null })}
        initialValues={{ active_semester: settings?.active_semester || null }}
        style={{ marginBottom: 12 }}
      >
        <Form.Item name="active_semester" label="Aktiv semestr">
          <Select
            allowClear
            placeholder="Aktiv semestrni tanlang"
            style={{ width: 220 }}
            options={(data || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={updateSettingsMut.isLoading}>
            Saqlash
          </Button>
        </Form.Item>
      </Form>

      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="number" rules={[{ required: true, message: "Semestr raqami" }]}>
          <InputNumber min={1} placeholder="Semestr" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
            Qo'shish
          </Button>
        </Form.Item>
      </Form>

      <List
        loading={isLoading}
        dataSource={data || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(s) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(s);
                  editForm.setFieldsValue({ number: s.number });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteSemester(s.id)
                    .then(() => qc.invalidateQueries({ queryKey: ["admin-semesters"] }))
                    .catch(() => message.error("O'chirishda xato"))
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            Semestr {s.number}
          </List.Item>
        )}
      />

      <Modal
        title="Semestrni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateSemester(editItem.id, vals);
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-semesters"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="number" label="Semestr raqami" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SemestersPage;
