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
import { fetchLessons } from "../../api/lessons";
import { fetchSubjects } from "../../api/subjects";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import type { Assignment } from "../../types/assignment";
import { toAbsoluteUrl } from "../../api/client";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getApiError } from "../../utils/getApiError";
import { useTranslation } from "react-i18next";

const extractFile = (list: UploadFile[]) => {
  const item = list[0];
  if (!item) return undefined;
  return (item.originFileObj ?? (item as unknown as File)) as File | undefined;
};

const TeacherAssignments = () => {
  usePageTitle('nav.assignments');
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
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

  const subjectNames = useMemo(() => {
    const allowed = new Set<number>();
    (teacherSubjects || []).forEach((ts) => allowed.add(ts.subject));
    return (subjects || []).filter((s) => allowed.has(s.id)).map((s) => s.name);
  }, [subjects, teacherSubjects]);

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
        label: `${l.topic} | ${l.group_name || t('teacherAttendance.group')} | ${dayjs(l.start_time).format("DD.MM HH:mm")}`,
      })),
    [subjectLessons]
  );

  const getLessonById = (id?: number | null) => subjectLessons.find((l) => l.id === id);

  const onFinish = async (values: any) => {
    if (!selectedSubject) {
      message.warning(t('teacherAssignments.selectSubjectFirst'));
      return;
    }
    if (!values.lesson) {
      message.warning(t('teacherAssignments.lessonRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createAssignment({
        lesson: Number(values.lesson),
        title: values.title,
        file: extractFile(fileList),
      });
      message.success(t('teacherAssignments.created'));
      setFileList([]);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["assignments"] });
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
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
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('teacherAssignments.pageTitle')}</Typography.Title>
      {!subjectNames.length ? (
        <Alert
          type="warning"
          message={t('teacherAssignments.noLessonWarning')}
          description={t('teacherAssignments.noLessonDescription')}
          showIcon
          style={{ marginBottom: 'var(--space-4)' }}
        />
      ) : null}

      {!selectedSubject ? (
        <div className="card-grid">
          {subjectCards.map((card) => (
            <Card key={card.name} hoverable onClick={() => setSelectedSubject(card.name)}>
              <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{card.name}</div>
              <div style={{ opacity: 0.7, marginTop: 'var(--space-1-5)' }}>{t('teacherAssignments.assignmentsCount', { count: card.count })}</div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="page-header-row">
            <Button onClick={() => setSelectedSubject(null)}>{t('common.back')}</Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          {!subjectLessons.length ? (
            <Alert
              type="info"
              message={t('teacherAssignments.noLessonsForSubject')}
              description={t('teacherAssignments.noLessonsDescription')}
              showIcon
              style={{ marginBottom: 'var(--space-4)' }}
            />
          ) : null}
          <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth: 620, marginBottom: 'var(--space-6)' }}>
            <Form.Item name="lesson" label={t('form.lesson')} rules={[{ required: true }]}>
              <Select showSearch placeholder={t('teacherAssignments.selectLesson')} options={lessonOptions} />
            </Form.Item>
            <Form.Item name="title" label={t('form.title')} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label={t('teacherAssignments.deadline')}>
              <Input value={lessonDeadlineText(selectedLessonId)} disabled placeholder={t('teacherAssignments.selectLesson')} />
            </Form.Item>
            <Form.Item label={t('teacherAssignments.fileOptional')}>
              <Upload
                maxCount={1}
                fileList={fileList}
                beforeUpload={() => false}
                onChange={({ fileList: next }) => setFileList(next)}
              >
                <Button>{t('common.fileUpload')}</Button>
              </Upload>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {t('common.create')}
              </Button>
            </Form.Item>
          </Form>

          {isLoading ? (
            <Skeleton active />
          ) : !filteredAssignments.length ? (
            <Empty description={t('teacherAssignments.noAssignments')} />
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
                      {t('common.edit')}
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title={t('teacherAssignments.deleteConfirm')}
                      onConfirm={async () => {
                        try {
                          await deleteAssignment(item.id);
                          message.success(t('teacherAssignments.deleted'));
                          await qc.invalidateQueries({ queryKey: ["assignments"] });
                        } catch {
                          message.error(t('common.deleteError'));
                        }
                      }}
                    >
                      <Button danger type="link">
                        {t('common.delete')}
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
        title={t('teacherAssignments.editTitle')}
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
            message.success(t('common.updated'));
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["assignments"] });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(getApiError(err, t('common.error')));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="lesson" label={t('form.lesson')} rules={[{ required: true }]}>
            <Select showSearch placeholder={t('teacherAssignments.selectLesson')} options={lessonOptions} />
          </Form.Item>
          <Form.Item name="title" label={t('form.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('teacherAssignments.deadline')}>
            <Input value={lessonDeadlineText(editLessonId)} disabled />
          </Form.Item>
          <Form.Item label={t('teacherAssignments.fileOptional')}>
            <Upload
              maxCount={1}
              fileList={editFileList}
              beforeUpload={() => false}
              onChange={({ fileList: next }) => setEditFileList(next)}
            >
              <Button>{t('teacherAssignments.newFile')}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherAssignments;
