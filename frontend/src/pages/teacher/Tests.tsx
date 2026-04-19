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
  Modal,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTests, uploadTest, deleteTest, updateTest, fetchTest } from "../../api/tests";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { fetchLessons } from "../../api/lessons";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import { fetchSubjects } from "../../api/subjects";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getApiError } from "../../utils/getApiError";
import { useTranslation } from "react-i18next";

const TeacherTests = () => {
  usePageTitle('nav.tests');
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: tests, isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
  });
  const { data: lessons } = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const subjectCards = useMemo(() => {
    const subjectNameById = new Map((subjects || []).map((s) => [s.id, s.name]));
    const map = new Map<string, { name: string; count: number }>();

    (teacherSubjects || []).forEach((ts) => {
      const name = subjectNameById.get(ts.subject);
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, count: 0 });
    });

    (lessons || []).forEach((lesson) => {
      if (!lesson.subject_name) return;
      if (!map.has(lesson.subject_name)) map.set(lesson.subject_name, { name: lesson.subject_name, count: 0 });
    });

    (tests || []).forEach((test) => {
      if (!test.subject_name) return;
      const entry = map.get(test.subject_name) || { name: test.subject_name, count: 0 };
      entry.count += 1;
      map.set(test.subject_name, entry);
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [lessons, tests, teacherSubjects, subjects]);

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
      message.error(t('teacherTests.wordFileRequired'));
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".doc") && !lower.endsWith(".docx")) {
      message.error(t('teacherTests.onlyDocx'));
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
      message.success(t('teacherTests.testCreated'));
      form.resetFields();
      setFileList([]);
      await qc.invalidateQueries({ queryKey: ["tests"] });
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
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
      message.error(t('teacherTests.testLoadError'));
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('teacherTests.pageTitle')}</Typography.Title>
      {selectedSubject ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          style={{ maxWidth: 520, marginBottom: 'var(--space-6)' }}
          initialValues={{ is_active: true, time_limit_minutes: 20, total_score: 100 }}
        >
          <Form.Item name="title" label={t('form.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lesson" label={t('form.lesson')} rules={[{ required: true, message: t('teacherTests.selectLesson') }]}>
            <Select
              showSearch
              allowClear
              notFoundContent={t('teacherTests.lessonNotFound')}
              options={filteredLessons.map((l) => ({
                value: l.id,
                label: `${l.subject_name || t('teacherTests.subjectLabel')} | ${l.group_name || `${t('teacherTests.groupLabel')} #${l.group}`} | ${dayjs(
                  l.start_time
                ).format("DD.MM HH:mm")}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="time_limit_minutes" label={t('teacherTests.timeMinutes')}>
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
          <Form.Item label={t('teacherTests.testFile')} required>
            <Upload
              accept=".doc,.docx"
              beforeUpload={() => false}
              fileList={fileList}
              maxCount={1}
              onChange={({ fileList: next }) => setFileList(next.slice(-1))}
            >
              <Button>{t('teacherTests.selectFile')}</Button>
            </Upload>
            <Typography.Text type="secondary">
              {t('teacherTests.testFileHint')}
            </Typography.Text>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {t('common.create')}
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
                grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                dataSource={subjectCards}
                renderItem={(subject) => (
                  <List.Item>
                    <Card
                      hoverable
                      onClick={() => {
                        setSelectedSubject(subject.name);
                        form.resetFields();
                      }}
                    >
                      <Typography.Text strong>{subject.name}</Typography.Text>
                      <div style={{ marginTop: 'var(--space-1-5)', color: "var(--color-text-muted)" }}>{t('teacherTests.testsCount', { count: subject.count })}</div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description={t('common.noData')} />
            )
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Button onClick={() => setSelectedSubject(null)}>{t('common.back')}</Button>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {selectedSubject}
                </Typography.Title>
              </div>
              {filteredTests.length ? (
                <List
                  dataSource={filteredTests}
                  pagination={{ pageSize: 5 }}
                  renderItem={(item) => (
                    <List.Item>
                      <div style={{ width: "100%" }}>
                        <div className="kv-grid" style={{ marginBottom: 'var(--space-2)' }}>
                          <span style={{ color: "var(--color-text-muted)" }}>{t('teacherTests.heading')}</span>
                          <Typography.Link onClick={() => openView(item.id)}>{item.title}</Typography.Link>
                          <span style={{ color: "var(--color-text-muted)" }}>{t('teacherTests.subjectLabel')}</span>
                          <span>{item.subject_name || item.subject || "-"}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{t('teacherTests.lessonLabel')}</span>
                          <span>{item.lesson_topic || "-"}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{t('teacherTests.groupLabel')}</span>
                          <span>{item.group_name || item.group || "-"}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{t('teacherTests.time')}</span>
                          <span>{item.time_limit_minutes ?? "-"} min</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{t('teacherTests.totalScore')}</span>
                          <span>{item.total_score ?? "-"}</span>
                          <span style={{ color: "var(--color-text-muted)" }}>{t('teacherTests.status')}</span>
                          <span>{item.is_active ? t('teacherTests.active') : t('teacherTests.inactive')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button size="small" type="link" onClick={() => openView(item.id)}>
                            {t('common.view')}
                          </Button>
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              setEditItem(item);
                              editForm.setFieldsValue({
                                title: item.title,
                                description: item.description,
                                lesson: item.lesson,
                                time_limit_minutes: item.time_limit_minutes,
                                total_score: item.total_score,
                                is_active: item.is_active,
                              });
                              setEditOpen(true);
                            }}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            danger
                            size="small"
                            type="link"
                            onClick={async () => {
                              try {
                                await deleteTest(item.id);
                                message.success(t('teacherTests.deleted'));
                                await qc.invalidateQueries({ queryKey: ["tests"] });
                              } catch {
                                message.error(t('common.deleteError'));
                              }
                            }}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description={t('common.noData')} />
              )}
            </>
          )}
        </>
      )}

      <Modal
        title={t('teacherTests.editTitle')}
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
            message.success(t('common.updated'));
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["tests"] });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(getApiError(err, t('common.error')));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="title" label={t('form.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('form.comment')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="lesson" label={t('form.lesson')}>
            <Select
              allowClear
              showSearch
                            options={(selectedSubject ? filteredLessons : lessons || []).map((l) => ({
                              value: l.id,
                              label: `${l.subject_name || t('teacherTests.subjectLabel')} | ${l.group_name || `${t('teacherTests.groupLabel')} #${l.group}`} | ${dayjs(
                                l.start_time
                              ).format("DD.MM HH:mm")}`,
                            }))}
            />
          </Form.Item>
          <Form.Item name="time_limit_minutes" label={t('teacherTests.timeMinutes')}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="total_score"
            label={t('teacherTests.totalScore')}
            rules={[{ required: true, message: t('teacherTests.totalScoreRequired') }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
          <Form.Item name="is_active" label={t('teacherTests.active')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('teacherTests.viewTitle')}
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width="min(700px, calc(100vw - 32px))"
      >
        {viewLoading ? (
          <Skeleton active />
        ) : viewItem ? (
          <div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Typography.Text type="secondary">{t('teacherTests.heading')}: </Typography.Text>
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
                      <div style={{ marginTop: 'var(--space-2)', display: "grid", gap: 'var(--space-1-5)' }}>
                        {(q.options || []).map((opt: any) => (
                          <div
                            key={opt.id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 'var(--radius-sm)',
                              border: "1px solid var(--color-text-primary)",
                              background: opt.is_correct ? "rgba(var(--color-success-rgb),0.12)" : "transparent",
                              color: opt.is_correct ? "var(--color-success)" : "var(--color-text-disabled)",
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
              <Empty description={t('teacherTests.noQuestions')} />
            )}
          </div>
        ) : (
            <Empty description={t('common.noData')} />
        )}
      </Modal>
    </div>
  );
};

export default TeacherTests;
