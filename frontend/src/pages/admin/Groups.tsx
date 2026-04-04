import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty, Popconfirm, Select, Modal } from "antd";
import { useState } from "react";
import {
  createGroupAdmin,
  deleteGroupAdmin,
  AdminGroup,
  updateGroupAdmin,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const GroupsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminQueryOptions.groups());
  const { data: directions } = useQuery(adminQueryOptions.directions());
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const directionMap = new Map((directions || []).map((d) => [d.id, d.name]));

  const createMut = useMutation({
    mutationFn: (vals: Partial<AdminGroup>) => createGroupAdmin(vals),
    onSuccess: async () => {
      message.success("Guruh qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups });
    },
    onError: () => message.error("Guruh qo'shishda xato"),
  });

  const remove = (id: number) =>
    deleteGroupAdmin(id)
      .then(() => {
        message.success("O'chirildi");
        qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups });
      })
      .catch(() => message.error("O'chirishda xato"));

  return (
    <Card title="Guruhlar" style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="name">
          <Input placeholder="Guruh nomi (ixtiyoriy)" />
        </Form.Item>
        <Form.Item name="direction" rules={[{ required: true, message: "Yo'nalish" }]}>
          <Select
            allowClear
            placeholder="Yo'nalish"
            style={{ width: 160 }}
            options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item name="language">
          <Select
            style={{ width: 120 }}
            placeholder="Til (avto)"
            options={[
              { value: "uz", label: "uz" },
              { value: "ru", label: "ru" },
              { value: "en", label: "en" },
            ]}
          />
        </Form.Item>
        <Form.Item name="level" rules={[{ required: true, message: "Bosqich" }]}>
          <Select
            placeholder="Bosqich"
            style={{ width: 120 }}
            options={Array.from({ length: 10 }, (_, i) => ({
              value: i + 1,
              label: `${i + 1}-bosqich`,
            }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isPending}>
            Qo'shish
          </Button>
        </Form.Item>
      </Form>

      <List
        loading={isLoading}
        dataSource={data || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(g) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(g);
                  editForm.setFieldsValue({
                    name: g.name,
                    direction: g.direction,
                    language: g.language,
                    level: g.level,
                  });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm
                title="O'chirish?"
                onConfirm={() => {
                  if (g.id == null) {
                    message.error("Guruh ID topilmadi");
                    return;
                  }
                  remove(g.id);
                }}
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {g.name} |{" "}
            {g.direction != null
              ? directionMap.get(g.direction) || `Yo'nalish #${g.direction}`
              : "Yo'nalish -"}{" "}
            | {g.level}-bosqich {g.language ? `| ${g.language}` : ""}
          </List.Item>
        )}
      />

      <Modal
        title="Guruhni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateGroupAdmin(editItem.id, vals);
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="name" label="Guruh nomi">
            <Input placeholder="Guruh nomi (ixtiyoriy)" />
          </Form.Item>
          <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
            <Select
              allowClear
              placeholder="Yo'nalish"
              options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="language" label="Til">
            <Select
              placeholder="Til (avto)"
              options={[
                { value: "uz", label: "uz" },
                { value: "ru", label: "ru" },
                { value: "en", label: "en" },
              ]}
            />
          </Form.Item>
          <Form.Item name="level" label="Bosqich" rules={[{ required: true }]}>
            <Select
              options={Array.from({ length: 10 }, (_, i) => ({
                value: i + 1,
                label: `${i + 1}-bosqich`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GroupsPage;
