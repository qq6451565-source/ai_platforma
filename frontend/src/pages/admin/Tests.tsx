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
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { fetchTests, deleteTest, updateTest, uploadTest, fetchTest } from "../../api/tests";
import { fetchLessonsAdmin, fetchSubjectsAdmin } from "../../api/admin";

const AdminTestsPage = () => {
  const qc = useQueryClient();
  const { data: tests, isLoading } = useQuery({
    queryKey: ["admin-tests"],
    queryFn: fetchTests,
  });
  const { data: lessons } = useQuery({ queryKey: ["admin-lessons"], queryFn: fetchLessonsAdmin });
  const { data: subjects } = useQuery({ queryKey: ["admin-subjects"], queryFn: fetchSubjectsAdmin });
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const subjectCards = useMemo(() => {
    const counts = new Map<string, number>();
    (tests || []).forEach((test) => {
      if (!test.subject_name) return;
      counts.set(test.subject_name, (counts.get(test.subject_name) || 0) + 1);
    });
    return (subjects || [])
      .map((subject) => ({
        name: subject.name,
        count: counts.get(subject.name) || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, tests]);

  const filteredLessons = useMemo(() => {
    if (!selectedSubject) return [];
    return (lessons || []).filter((lesson) => lesson.subject_name === selectedSubject);
  }, [lessons, selectedSubject]);

  const filteredTests = useMemo(() => {
    if (!selectedSubject) return [];
    return (tests || []).filter((test) => test.subject_name === selectedSubject);
  }, [tests, selectedSubject]);

  const onFinish = async (values: any) => {
    const file = fileList[0]?.originFileObj as File | undefined;
    if (!file) {
      message.error("Word faylni yuklang (.doc yoki .docx).");
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".doc") && !lower.endsWith(".docx")) {
      message.error("Faqat .doc yoki .docx fayl qabul qilinadi.");
      return;
    }

    setSubmitting(true);
    try {
      await uploadTest({
        title: values.title,
        lesson: Number(values.lesson),
        file,
        time_limit_minutes: values.time_limit_minutes,
        total_score: values.total_score,
        is_active: values.is_active,
      });
      message.success("Test Word fayldan yaratildi");
      form.resetFields();
      setFileList([]);
      await qc.invalidateQueries({ queryKey: ["admin-tests"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const openView = async (id: number) => {
    setViewOpen(true);
    setViewLoading(true);
    try {
      const data = await fetchTest(id);
      setViewItem(data);
    } catch {
      message.error("Testni yuklab bo'lmadi");
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Dars testlari</Typography.Title>
      {selectedSubject ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ maxWidth: 520, marginBottom: 24 }}
          initialValues={{ is_active: true, time_limit_minutes: 20, total_score: 100 }}
        >
          <Form.Item name="title" label="Sarlavha">
            <Input />
          </Form.Item>
          <Form.Item name="lesson" label="Dars" rules={[{ required: true, message: "Dars tanlang" }]}>
            <Select
              showSearch
              placeholder="Dars"
              options={filteredLessons.map((l) => ({
                value: l.id,
                label: `${l.topic || "Dars"} | ${l.group_name || `Guruh #${l.group}`}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="time_limit_minutes" label="Vaqt (min)">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="total_score"
            label="Umumiy ball"
            rules={[{ required: true, message: "Umumiy ball kiriting" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Test fayli (.doc/.docx)" required>
            <Upload
              accept=".doc,.docx"
              beforeUpload={() => false}
              fileList={fileList}
              maxCount={1}
              onChange={({ fileList: next }) => setFileList(next.slice(-1))}
            >
              <Button>Fayl tanlash</Button>
            </Upload>
            <Typography.Text type="secondary">
              Har savolda 4 ta variant bo'lishi kerak, to'g'ri javob * bilan belgilanadi.
            </Typography.Text>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Yaratish
            </Button>
          </Form.Item>
        </Form>
      ) : null}

      {isLoading ? (
        <Skeleton active />
      ) : (
        <>
          {!selectedSubject ? (
            subjectCards.length ? (
              <List
                grid={{ gutter: 12, column: 3 }}
                dataSource={subjectCards}
                renderItem={(subject) => (
                  <List.Item>
                    <Card
                      hoverable
                      onClick={() => {
                        setSelectedSubject(subject.name);
                        form.resetFields();
                        setFileList([]);
                      }}
                    >
                  <Typography.Text strong>{subject.name}</Typography.Text>
                      <div style={{ marginTop: 6, color: "#94a3b8" }}>{subject.count} ta test</div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Ma'lumot yo'q" />
            )
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Button onClick={() => setSelectedSubject(null)}>Orqaga</Button>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {selectedSubject}
                </Typography.Title>
              </div>
              {filteredTests.length ? (
                <List
                  dataSource={filteredTests}
                  pagination={{ pageSize: 5 }}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button key="view" type="link" onClick={() => openView(item.id)}>
                          Ko'rish
                        </Button>,
                        <Button
                          key="edit"
                          type="link"
                          onClick={() => {
                            setEditItem(item);
                            editForm.setFieldsValue({
                              title: item.title,
                              description: item.description,
                              lesson: item.lesson ?? undefined,
                              time_limit_minutes: item.time_limit_minutes,
                              total_score: item.total_score,
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
                      <div style={{ width: "100%" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "140px 1fr",
                            rowGap: 6,
                            columnGap: 12,
                          }}
                        >
                          <span style={{ color: "#94a3b8" }}>Sarlavha</span>
                          <Typography.Link onClick={() => openView(item.id)}>{item.title}</Typography.Link>
                          <span style={{ color: "#94a3b8" }}>Dars</span>
                          <span>{item.lesson_topic || item.lesson || "-"}</span>
                          <span style={{ color: "#94a3b8" }}>Guruh</span>
                          <span>{item.group_name || item.group || "-"}</span>
                          <span style={{ color: "#94a3b8" }}>Vaqt</span>
                          <span>{item.time_limit_minutes ?? "-"} min</span>
                          <span style={{ color: "#94a3b8" }}>Umumiy ball</span>
                          <span>{item.total_score ?? "-"}</span>
                          <span style={{ color: "#94a3b8" }}>Holat</span>
                          <span>{item.is_active ? "Active" : "Inactive"}</span>
                          <span style={{ color: "#94a3b8" }}>Yaratilgan</span>
                          <span>{item.created_at ? dayjs(item.created_at).format("YYYY-MM-DD HH:mm") : "-"}</span>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Ma'lumot yo'q" />
              )}
            </>
          )}
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
              lesson: vals.lesson ? Number(vals.lesson) : undefined,
              time_limit_minutes: vals.time_limit_minutes,
              total_score: vals.total_score,
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
          <Form.Item name="lesson" label="Dars" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Dars"
              options={(selectedSubject ? filteredLessons : lessons || []).map((l) => ({
                value: l.id,
                label: `${l.topic} | ${l.group_name || `Guruh #${l.group}`} | ${l.subject_name || ""}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="time_limit_minutes" label="Vaqt (min)">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="total_score"
            label="Umumiy ball"
            rules={[{ required: true, message: "Umumiy ball kiriting" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Testni ko'rish"
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={700}
      >
        {viewLoading ? (
          <Skeleton active />
        ) : viewItem ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text type="secondary">Sarlavha: </Typography.Text>
              <Typography.Text strong>{viewItem.title}</Typography.Text>
            </div>
            {viewItem.questions?.length ? (
              <List
                dataSource={viewItem.questions}
                renderItem={(q: any, idx: number) => (
                  <List.Item>
                    <div style={{ width: "100%" }}>
                      <Typography.Text strong>
                        {idx + 1}. {q.text}
                      </Typography.Text>
                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {(q.options || []).map((opt: any) => (
                          <div
                            key={opt.id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #1f2937",
                              background: opt.is_correct ? "rgba(34,197,94,0.12)" : "transparent",
                              color: opt.is_correct ? "#22c55e" : "#cbd5f5",
                            }}
                          >
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Savollar topilmadi" />
            )}
          </div>
        ) : (
          <Empty description="Ma'lumot yo'q" />
        )}
      </Modal>
    </div>
  );
};

export default AdminTestsPage;
