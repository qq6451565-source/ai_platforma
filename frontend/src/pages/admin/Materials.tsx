import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty, Select, Popconfirm, Upload, Modal } from "antd";
import { fetchMaterials, createMaterial, deleteMaterial, updateMaterial } from "../../api/materials";
import { fetchSubjectsAdmin, fetchGroupsAdmin, fetchUsers } from "../../api/admin";
import { useState } from "react";

const AdminMaterialsPage = () => {
  const qc = useQueryClient();
  const { data: materials, isLoading } = useQuery({
    queryKey: ["admin-materials"],
    queryFn: fetchMaterials,
  });
  const { data: subjects } = useQuery({ queryKey: ["admin-subjects"], queryFn: fetchSubjectsAdmin });
  const { data: groups } = useQuery({ queryKey: ["admin-groups"], queryFn: fetchGroupsAdmin });
  const { data: teachers } = useQuery({ queryKey: ["admin-teachers"], queryFn: () => fetchUsers("teacher") });
  const [file, setFile] = useState<File | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editFile, setEditFile] = useState<File | null | undefined>(undefined);
  const [editLoading, setEditLoading] = useState(false);

  const getErrorMessage = (err: any) => {
    const data = err?.response?.data;
    if (!data) return "Xatolik";
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (Array.isArray(data)) return data.join(" ");
    const entry = Object.entries(data)[0];
    if (entry) {
      const [field, msg] = entry;
      if (Array.isArray(msg)) return `${field}: ${msg.join(" ")}`;
      return `${field}: ${msg}`;
    }
    return "Xatolik";
  };

  const createMut = useMutation({
    mutationFn: (vals: any) =>
      createMaterial({
        title: vals.title,
        description: vals.description,
        subject: vals.subject,
        teacher: vals.teacher,
        group: vals.group,
        material_type: vals.material_type,
        file,
      }),
    onSuccess: async () => {
      message.success("Material qo'shildi");
      setFile(undefined);
      await qc.invalidateQueries({ queryKey: ["admin-materials"] });
    },
    onError: (err) => message.error(getErrorMessage(err)),
  });

  return (
    <Card title="Materiallar" style={{ marginBottom: 16 }}>
      <Form
        layout="vertical"
        onFinish={(vals) => {
          if (!file) {
            message.warning("Fayl tanlang");
            return;
          }
          createMut.mutate(vals);
        }}
        style={{ marginBottom: 12 }}
      >
        <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Izoh">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Fan"
            options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>
        <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Guruh"
            options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>
        <Form.Item name="teacher" label="O'qituvchi">
          <Select
            allowClear
            showSearch
            placeholder="O'qituvchi"
            options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
          />
        </Form.Item>
        <Form.Item name="material_type" label="Turi" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "pdf", label: "PDF" },
              { value: "video", label: "Video" },
              { value: "audio", label: "Audio" },
              { value: "ppt", label: "PPT" },
              { value: "doc", label: "Word" },
              { value: "image", label: "Rasm" },
              { value: "other", label: "Other" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Fayl">
          <Upload
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            maxCount={1}
          >
            <Button>Fayl yuklash</Button>
          </Upload>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={materials || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(m) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(m);
                  editForm.setFieldsValue({
                    title: m.title,
                    description: m.description,
                    subject: m.subject,
                    group: m.group,
                    teacher: m.teacher,
                    material_type: m.material_type,
                  });
                  setEditFile(undefined);
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteMaterial(m.id)
                    .then(() => qc.invalidateQueries({ queryKey: ["admin-materials"] }))
                    .catch(() => message.error("O'chirishda xato"))
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {m.title} | {m.subject_name || m.subject} | {m.group_name || m.group} | {m.material_type}
          </List.Item>
        )}
      />

      <Modal
        title="Materialni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateMaterial(editItem.id, {
              title: vals.title,
              description: vals.description,
              subject: vals.subject,
              group: vals.group,
              teacher: vals.teacher,
              material_type: vals.material_type,
              file: editFile === undefined ? undefined : editFile,
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-materials"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error(getErrorMessage(err));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Fan"
              options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Guruh"
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
          <Form.Item name="teacher" label="O'qituvchi">
            <Select
              allowClear
              showSearch
              placeholder="O'qituvchi"
              options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
            />
          </Form.Item>
          <Form.Item name="material_type" label="Turi" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "pdf", label: "PDF" },
                { value: "video", label: "Video" },
                { value: "audio", label: "Audio" },
                { value: "ppt", label: "PPT" },
                { value: "doc", label: "Word" },
                { value: "image", label: "Rasm" },
                { value: "other", label: "Other" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Fayl (ixtiyoriy)">
            <Upload
              beforeUpload={(f) => {
                setEditFile(f);
                return false;
              }}
              maxCount={1}
            >
              <Button>Yangi fayl</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminMaterialsPage;
