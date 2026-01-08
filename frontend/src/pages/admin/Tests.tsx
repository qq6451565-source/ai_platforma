import {
  Button,
  Form,
  Input,
  InputNumber,
  List,
  Skeleton,
  Switch,
  Typography,
  message,
  Select,
  Card,
  Empty,
  Popconfirm,
  Modal,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import dayjs from "dayjs";
import { fetchTests, createTest, deleteTest, updateTest } from "../../api/tests";
import { fetchSubjectsAdmin, fetchGroupsAdmin, fetchUsers } from "../../api/admin";

const AdminTestsPage = () => {
  const qc = useQueryClient();
  const { data: tests, isLoading } = useQuery({
    queryKey: ["admin-tests"],
    queryFn: fetchTests,
  });
  const { data: subjects } = useQuery({ queryKey: ["admin-subjects"], queryFn: fetchSubjectsAdmin });
  const { data: groups } = useQuery({ queryKey: ["admin-groups"], queryFn: fetchGroupsAdmin });
  const { data: teachers } = useQuery({ queryKey: ["admin-teachers"], queryFn: () => fetchUsers("teacher") });
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [filterGroup, setFilterGroup] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await createTest({
        title: values.title,
        description: values.description,
        subject: values.subject ? Number(values.subject) : undefined,
        group: values.group ? Number(values.group) : undefined,
        teacher: values.teacher ? Number(values.teacher) : undefined,
        time_limit_minutes: values.time_limit_minutes,
        pass_score: values.pass_score,
        is_active: values.is_active,
      });
      message.success("Test yaratildi");
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["admin-tests"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Testlar (Admin)</Typography.Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 520, marginBottom: 24 }}
        initialValues={{ is_active: true, time_limit_minutes: 20, pass_score: 60 }}
      >
        <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Izoh">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="teacher" label="O'qituvchi">
          <Select
            showSearch
            allowClear
            options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
          />
        </Form.Item>
        <Form.Item name="subject" label="Fan">
          <Select
            showSearch
            allowClear
            options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
          />
        </Form.Item>
        <Form.Item name="group" label="Guruh">
          <Select
            showSearch
            allowClear
            options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
          />
        </Form.Item>
        <Form.Item name="time_limit_minutes" label="Vaqt (min)">
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="pass_score" label="Pass score">
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="is_active" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Yaratish
          </Button>
        </Form.Item>
      </Form>

      {isLoading ? (
        <Skeleton active />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Select
              allowClear
              placeholder="Fan bo'yicha filter"
              style={{ minWidth: 180 }}
              onChange={(v) => setFilterSubject(v ?? null)}
              options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
            <Select
              allowClear
              placeholder="Guruh bo'yicha filter"
              style={{ minWidth: 180 }}
              onChange={(v) => setFilterGroup(v ?? null)}
              options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
            />
          </div>
          {(() => {
            const filtered = (tests || []).filter(
              (t) =>
                (filterSubject ? t.subject === filterSubject : true) &&
                (filterGroup ? t.group === filterGroup : true)
            );
            if (!filtered.length) return <Empty description="Ma'lumot yo'q" />;
            return (
              <List
                dataSource={filtered}
                pagination={{ pageSize: 5 }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="edit"
                        type="link"
                        onClick={() => {
                          setEditItem(item);
                          editForm.setFieldsValue({
                            title: item.title,
                            description: item.description,
                            subject: item.subject,
                            group: item.group,
                            teacher: item.teacher,
                            time_limit_minutes: item.time_limit_minutes,
                            pass_score: item.pass_score,
                            is_active: item.is_active,
                          });
                          setEditOpen(true);
                        }}
                      >
                        Tahrirlash
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="O'chirish?"
                        onConfirm={async () => {
                          try {
                            await deleteTest(item.id);
                            message.success("O'chirildi");
                            await qc.invalidateQueries({ queryKey: ["admin-tests"] });
                          } catch {
                            message.error("O'chirishda xato");
                          }
                        }}
                      >
                        <Button danger type="link">
                          O'chirish
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={`Fan: ${item.subject_name || item.subject || "-"} | Guruh: ${
                        item.group_name || item.group || "-"
                      } | Pass: ${item.pass_score ?? "-"} | Vaqt: ${item.time_limit_minutes ?? "-"} min | ${
                        item.is_active ? "Active" : "Inactive"
                      } | ${item.created_at ? dayjs(item.created_at).format("YYYY-MM-DD HH:mm") : ""}`}
                    />
                  </List.Item>
                )}
              />
            );
          })()}
        </>
      )}

      <Modal
        title="Testni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateTest(editItem.id, {
              title: vals.title,
              description: vals.description,
              subject: vals.subject ? Number(vals.subject) : undefined,
              group: vals.group ? Number(vals.group) : undefined,
              teacher: vals.teacher ? Number(vals.teacher) : undefined,
              time_limit_minutes: vals.time_limit_minutes,
              pass_score: vals.pass_score,
              is_active: vals.is_active,
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-tests"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error(err?.response?.data?.detail || "Xatolik");
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
          <Form.Item name="teacher" label="O'qituvchi">
            <Select
              showSearch
              allowClear
              options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="Fan">
            <Select
              showSearch
              allowClear
              options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh">
            <Select
              showSearch
              allowClear
              options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
            />
          </Form.Item>
          <Form.Item name="time_limit_minutes" label="Vaqt (min)">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="pass_score" label="Pass score">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminTestsPage;
