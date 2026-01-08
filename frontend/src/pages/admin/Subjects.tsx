import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty, Select, Popconfirm, Modal } from "antd";
import { useState } from "react";
import { fetchSubjectsAdmin, createSubject, deleteSubject, fetchDirections, fetchSemesters, updateSubject } from "../../api/admin";

const SubjectsPage = () => {
  const qc = useQueryClient();
  const { data: subjects, isLoading } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });
  const { data: directions } = useQuery({ queryKey: ["admin-directions"], queryFn: fetchDirections });
  const { data: semesters } = useQuery({ queryKey: ["admin-semesters"], queryFn: fetchSemesters });
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: any) => createSubject(vals),
    onSuccess: async () => {
      message.success("Fan qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-subjects"] });
    },
    onError: () => message.error("Fan qo'shishda xato"),
  });

  return (
    <Card title="Fanlar" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="code" label="Kod" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="semester" label="Semestr" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Semestr"
            options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
          />
        </Form.Item>
        <Form.Item name="subject_type" label="Turi">
          <Select
            allowClear
            options={[
              { value: "required", label: "Majburiy" },
              { value: "optional", label: "Tanlov" },
            ]}
          />
        </Form.Item>
        <Form.Item name="directions" label="Yo'nalishlar">
          <Select
            mode="multiple"
            allowClear
            placeholder="Yo'nalish tanlang"
            options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={subjects || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(s) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(s);
                  editForm.setFieldsValue({
                    name: s.name,
                    code: s.code,
                    semester: s.semester,
                    subject_type: s.subject_type,
                    directions: s.directions,
                  });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteSubject(s.id)
                    .then(() => qc.invalidateQueries({ queryKey: ["admin-subjects"] }))
                    .catch(() => message.error("O'chirishda xato"))
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {s.name} ({s.code}) | Semestr #{s.semester}
          </List.Item>
        )}
      />

      <Modal
        title="Fanni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateSubject(editItem.id, vals);
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-subjects"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Kod" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="semester" label="Semestr" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Semestr"
              options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
            />
          </Form.Item>
          <Form.Item name="subject_type" label="Turi">
            <Select
              allowClear
              options={[
                { value: "required", label: "Majburiy" },
                { value: "optional", label: "Tanlov" },
              ]}
            />
          </Form.Item>
          <Form.Item name="directions" label="Yo'nalishlar">
            <Select
              mode="multiple"
              allowClear
              placeholder="Yo'nalish tanlang"
              options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SubjectsPage;
