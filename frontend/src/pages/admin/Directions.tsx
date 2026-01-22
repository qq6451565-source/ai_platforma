import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty, Popconfirm, Modal } from "antd";
import { useState } from "react";
import { createDirection, deleteDirection, fetchDirections, updateDirection } from "../../api/admin";

const DirectionsPage = () => {
  const qc = useQueryClient();
  const { data: directions, isLoading } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: { name: string; language?: string }) => createDirection(vals),
    onSuccess: async () => {
      message.success("Yo'nalish qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-directions"] });
    },
    onError: () => message.error("Yo'nalish qo'shishda xato"),
  });

  return (
    <Card title="Yo'nalishlar" style={{ marginBottom: 16 }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="name" rules={[{ required: true, message: "Nomi" }]}>
          <Input placeholder="Yo'nalish nomi" />
        </Form.Item>
        <Form.Item name="language">
          <Input placeholder="Til (uz/en)" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isPending}>
            Qo'shish
          </Button>
        </Form.Item>
      </Form>

      <List
        loading={isLoading}
        dataSource={directions || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(d) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(d);
                  editForm.setFieldsValue({ name: d.name, language: d.language });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteDirection(d.id)
                    .then(() => qc.invalidateQueries({ queryKey: ["admin-directions"] }))
                    .catch(() => message.error("O'chirishda xato"))
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {d.name} {d.language ? `(${d.language})` : ""}
          </List.Item>
        )}
      />

      <Modal
        title="Yo'nalishni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateDirection(editItem.id, vals);
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-directions"] });
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
          <Form.Item name="language" label="Til">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DirectionsPage;
