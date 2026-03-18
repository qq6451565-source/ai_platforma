import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty, Select, Popconfirm, Modal, Tag } from "antd";
import { useState } from "react";
import { createSubject, deleteSubject, updateSubject } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const SubjectsPage = () => {
  const qc = useQueryClient();
  const { data: subjects, isLoading } = useQuery(adminQueryOptions.subjects());
  const { data: directions } = useQuery(adminQueryOptions.directions());
  const directionMap = new Map((directions || []).map((d) => [d.id, d.name]));
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: any) => createSubject(vals),
    onSuccess: async () => {
      message.success("Fan qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.subjects });
    },
    onError: () => message.error("Fan qo'shishda xato"),
  });

  return (
    <Card title="Fanlar" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="directions" label="Yo'nalishlar" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            placeholder="Yo'nalish tanlang"
            options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
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
                    directions: s.directions || [],
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
                    .then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.subjects }))
                    .catch(() => message.error("O'chirishda xato"))
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
            </Popconfirm>,
          ]}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <strong>{s.name}</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(s.direction_names && s.direction_names.length
                ? s.direction_names
                : (s.directions || []).map((id) => directionMap.get(id) || `Yo'nalish #${id}`)
              ).map((label) => (
                <Tag key={`${s.id}-${label}`}>{label}</Tag>
              ))}
            </div>
          </div>
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
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.subjects });
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
          <Form.Item name="directions" label="Yo'nalishlar" rules={[{ required: true }]}>
            <Select
              mode="multiple"
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
