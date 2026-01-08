import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Input, Button, List, message, Empty, Popconfirm, Select, Modal } from "antd";
import { useState } from "react";
import {
  fetchGroupsAdmin,
  createGroupAdmin,
  deleteGroupAdmin,
  AdminGroup,
  fetchDirections,
  fetchSemesters,
  updateGroupAdmin,
} from "../../api/admin";

const GroupsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });
  const { data: directions } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });
  const { data: semesters } = useQuery({
    queryKey: ["admin-semesters"],
    queryFn: fetchSemesters,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: Partial<AdminGroup>) => createGroupAdmin(vals),
    onSuccess: async () => {
      message.success("Guruh qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-groups"] });
    },
    onError: () => message.error("Guruh qo'shishda xato"),
  });

  const remove = (id: number) =>
    deleteGroupAdmin(id)
      .then(() => {
        message.success("O'chirildi");
        qc.invalidateQueries({ queryKey: ["admin-groups"] });
      })
      .catch(() => message.error("O'chirishda xato"));

  return (
    <Card title="Guruhlar" style={{ marginBottom: 16 }}>
      <Form layout="inline" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="name">
          <Input placeholder="Guruh nomi (bo'sh qoldirsangiz avtomatik)" />
        </Form.Item>
        <Form.Item name="direction" rules={[{ required: true, message: "Yo'nalish" }]}>
          <Select
            allowClear
            placeholder="Yo'nalish"
            style={{ width: 160 }}
            options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item name="semester">
          <Select
            allowClear
            placeholder="Semestr (avto)"
            style={{ width: 140 }}
            options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
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
        <Form.Item name="year" rules={[{ required: true, message: "Yil" }]}>
          <Input type="number" placeholder="Yil" />
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
                    semester: g.semester,
                    language: g.language,
                    year: g.year,
                  });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm title="O'chirish?" onConfirm={() => remove(g.id)}>
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {g.name} {g.year ? `(Yil: ${g.year})` : ""}{" "}
            {g.direction ? `| Yo'nalish #${g.direction}` : ""}{" "}
            {g.semester ? `| Semestr #${g.semester}` : ""}{" "}
            {g.language ? `| ${g.language}` : ""}
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
            await qc.invalidateQueries({ queryKey: ["admin-groups"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="name" label="Guruh nomi">
            <Input placeholder="Bo'sh qoldirsangiz avtomatik" />
          </Form.Item>
          <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
            <Select
              allowClear
              placeholder="Yo'nalish"
              options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="semester" label="Semestr">
            <Select
              allowClear
              placeholder="Semestr (avto)"
              options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
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
          <Form.Item name="year" label="Yil" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GroupsPage;
