import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  List,
  Select,
  Skeleton,
  Upload,
  Typography,
  message,
  Modal,
  Popconfirm,
  Empty,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { fetchAssignments, createAssignment, deleteAssignment, updateAssignment } from "../../api/assignments";
import { fetchLessonsAdmin, fetchSubjectsAdmin } from "../../api/admin";
import type { Assignment } from "../../types/assignment";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const toAbsoluteUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/media/")) return `${API_BASE}${url}`;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/media/${url}`;
};

const extractFile = (list: UploadFile[]) => {
  const item = list[0];
  if (!item) return undefined;
  return (item.originFileObj ?? (item as unknown as File)) as File | undefined;
};

const AdminAssignmentsPage = () => {
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: fetchAssignments,
  });
  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: fetchLessonsAdmin,
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [form] = Form.useForm();
  const selectedLessonId = Form.useWatch("lesson", form);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Assignment | null>(null);
  const [editForm] = Form.useForm();
  const editLessonId = Form.useWatch("lesson", editForm);
  const [editFileList, setEditFileList] = useState<UploadFile[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  const subjectNames = useMemo(() => (subjects || []).map((s) => s.name), [subjects]);

  const subjectCards = useMemo(() => {
    const counts = new Map<string, number>();
    (assignments || []).forEach((a) => {
      if (a.subject) counts.set(a.subject, (counts.get(a.subject) || 0) + 1);
    });
    return subjectNames.map((name) => ({
      name,
      count: counts.get(name) || 0,
    }));
  }, [assignments, subjectNames]);

  const subjectLessons = useMemo(
    () => (lessons || []).filter((l) => l.subject_name === selectedSubject),
    [lessons, selectedSubject]
  );

  const lessonOptions = useMemo(
    () =>
      subjectLessons.map((l) => ({
        value: l.id,
        label: `${l.topic} | ${l.group_name || "Guruh"} | ${dayjs(l.start_time).format("DD.MM HH:mm")}`,
      })),
    [subjectLessons]
  );

  const getLessonById = (id?: number | null) => subjectLessons.find((l) => l.id === id);

  const onFinish = async (values: any) => {
    if (!selectedSubject) {
      message.warning("Avval fan tanlang.");
      return;
    }
    if (!values.lesson) {
      message.warning("Dars majburiy.");
      return;
    }
    setSubmitting(true);
    try {
      await createAssignment({
        lesson: Number(values.lesson),
        title: values.title,
        file: extractFile(fileList),
      });
      message.success("Topshiriq yaratildi");
      setFileList([]);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["admin-assignments"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    if (!selectedSubject) return [];
    return (assignments || []).filter((a) => a.subject === selectedSubject);
  }, [assignments, selectedSubject]);

  const lessonDeadlineText = (lessonId?: number | null) => {
    const lesson = getLessonById(lessonId ?? null);
    if (!lesson) return "-";
    return dayjs(lesson.start_time).add(3, "day").format("DD.MM.YYYY HH:mm");
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Topshiriqlar</Typography.Title>
      {!selectedSubject ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {subjectCards.map((card) => (
            <Card key={card.name} hoverable onClick={() => setSelectedSubject(card.name)}>
              <div style={{ fontWeight: 600 }}>{card.name}</div>
              <div style={{ opacity: 0.7, marginTop: 6 }}>{card.count} ta topshiriq</div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Button onClick={() => setSelectedSubject(null)}>Orqaga</Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          {!subjectLessons.length ? (
            <Alert
              type="info"
              message="Bu fan uchun darslar yo'q"
              description="Topshiriq yaratish uchun avval dars jadvalda bo'lishi kerak."
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : null}
          <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth: 620, marginBottom: 24 }}>
            <Form.Item name="lesson" label="Dars" rules={[{ required: true }]}>
              <Select showSearch placeholder="Darsni tanlang" options={lessonOptions} />
            </Form.Item>
            <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Topshirish sanasi">
              <Input value={lessonDeadlineText(selectedLessonId)} disabled placeholder="Dars tanlang" />
            </Form.Item>
            <Form.Item label="Fayl (ixtiyoriy)">
              <Upload
                maxCount={1}
                fileList={fileList}
                beforeUpload={() => false}
                onChange={({ fileList: next }) => setFileList(next)}
              >
                <Button>Fayl yuklash</Button>
              </Upload>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Yaratish
              </Button>
            </Form.Item>
          </Form>

          {isLoading ? (
            <Skeleton active />
          ) : !filteredAssignments.length ? (
            <Empty description="Topshiriqlar yo'q" />
          ) : (
            <List
              dataSource={filteredAssignments}
              pagination={{ pageSize: 6 }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      onClick={() => {
                        setEditItem(item);
                        editForm.setFieldsValue({
                          lesson: item.lesson ?? undefined,
                          title: item.title,
                        });
                        setEditFileList([]);
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
                          await deleteAssignment(item.id);
                          message.success("O'chirildi");
                          await qc.invalidateQueries({ queryKey: ["admin-assignments"] });
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
                    description={`Dars: ${item.lesson_topic || "-"} | Guruhlar: ${
                      item.group_names?.join(", ") || "-"
                    } | Topshirish: ${dayjs(item.deadline).format("DD.MM.YYYY HH:mm")}`}
                  />
                  {item.file ? (
                    <a href={toAbsoluteUrl(item.file)} target="_blank" rel="noreferrer">
                      Fayl
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </List.Item>
              )}
            />
          )}
        </>
      )}

      <Modal
        title="Topshiriqni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateAssignment(editItem.id, {
              lesson: vals.lesson,
              title: vals.title,
              file: extractFile(editFileList),
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-assignments"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error(err?.response?.data?.detail || "Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="lesson" label="Dars" rules={[{ required: true }]}>
            <Select showSearch placeholder="Darsni tanlang" options={lessonOptions} />
          </Form.Item>
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Topshirish sanasi">
            <Input value={lessonDeadlineText(editLessonId)} disabled />
          </Form.Item>
          <Form.Item label="Fayl (ixtiyoriy)">
            <Upload
              maxCount={1}
              fileList={editFileList}
              beforeUpload={() => false}
              onChange={({ fileList: next }) => setEditFileList(next)}
            >
              <Button>Yangi fayl</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminAssignmentsPage;
