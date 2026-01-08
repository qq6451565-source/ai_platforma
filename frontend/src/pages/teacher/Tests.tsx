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
  Space,
  Divider,
  Card,
  Empty,
  Modal,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTests, createTest } from "../../api/tests";
import { useState } from "react";
import dayjs from "dayjs";
import { fetchSubjects } from "../../api/subjects";
import { fetchGroups } from "../../api/groups";
import { deleteTest, updateTest } from "../../api/tests";

const TeacherTests = () => {
  const qc = useQueryClient();
  const { data: tests, isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
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
        time_limit_minutes: values.time_limit_minutes,
        pass_score: values.pass_score,
        is_active: values.is_active,
        questions: (values.questions || []).map((q: any, idx: number) => ({
          text: q.text,
          order: q.order ?? idx + 1,
          points: q.points ?? 1,
          options: (q.options || []).map((o: any) => ({
            text: o.text,
            is_correct: o.is_correct || false,
          })),
        })),
      });
      message.success("Test yaratildi");
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["tests"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Testlar</Typography.Title>
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

        <Divider> Savollar </Divider>
        <Form.List name="questions">
          {(fields, { add, remove }) => (
            <>
            {fields.map((field, index) => (
                <Card
                  key={field.key}
                  size="small"
                  title={`Savol ${index + 1}`}
                  extra={
                    <Button danger type="link" onClick={() => remove(field.name)}>
                      O'chirish
                    </Button>
                  }
                  style={{ marginBottom: 12 }}
                >
                  <Form.Item
                    {...field}
                    name={[field.name, "text"]}
                    label="Savol matni"
                    rules={[{ required: true, message: "Savol matni kerak" }]}
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, "order"]} label="Tartib">
                    <InputNumber style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, "points"]} label="Ball">
                    <InputNumber style={{ width: "100%" }} />
                  </Form.Item>

                  <Form.List name={[field.name, "options"]}>
                    {(optFields, { add: addOpt, remove: removeOpt }) => (
                      <>
                        {optFields.map((opt) => (
                          <Space key={opt.key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                            <Form.Item
                              {...opt}
                              name={[opt.name, "text"]}
                              rules={[{ required: true, message: "Variant matni kerak" }]}
                            >
                              <Input placeholder="Variant" />
                            </Form.Item>
                            <Form.Item {...opt} name={[opt.name, "is_correct"]} valuePropName="checked">
                              <Switch checkedChildren="To'g'ri" unCheckedChildren="Noto'g'ri" />
                            </Form.Item>
                            <Button danger type="link" onClick={() => removeOpt(opt.name)}>
                              O'chirish
                            </Button>
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => addOpt()} block>
                          Variant qo'shish
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Card>
              ))}
              <Button type="dashed" onClick={() => add()} block>
                Savol qo'shish
              </Button>
            </>
          )}
        </Form.List>
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
                            time_limit_minutes: item.time_limit_minutes,
                            pass_score: item.pass_score,
                            is_active: item.is_active,
                          });
                          setEditOpen(true);
                        }}
                      >
                        Tahrirlash
                      </Button>,
                      <Button
                        danger
                        type="link"
                        key="delete"
                        onClick={async () => {
                          try {
                            await deleteTest(item.id);
                            message.success("O'chirildi");
                            await qc.invalidateQueries({ queryKey: ["tests"] });
                          } catch {
                            message.error("O'chirishda xato");
                          }
                        }}
                      >
                        O'chirish
                      </Button>,
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
              time_limit_minutes: vals.time_limit_minutes,
              pass_score: vals.pass_score,
              is_active: vals.is_active,
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["tests"] });
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
          <Form.Item name="subject" label="Fan">
            <Select
              allowClear
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh">
            <Select
              allowClear
              showSearch
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

export default TeacherTests;
