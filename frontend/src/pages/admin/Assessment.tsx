import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  List,
  Empty,
  Popconfirm,
  Modal,
  Select,
  DatePicker,
  InputNumber,
  Switch,
  Tabs,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  createExamType,
  updateExamType,
  deleteExamType,
  createExam,
  updateExam,
  deleteExam,
  updateExamAttempt,
  deleteExamAttempt,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";
import { useTranslation } from 'react-i18next';

const AdminAssessmentPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: examTypes } = useQuery(adminQueryOptions.examTypes());
  const { data: exams } = useQuery(adminQueryOptions.exams());
  const { data: attempts } = useQuery(adminQueryOptions.examAttempts());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: teachers } = useQuery(adminQueryOptions.teachers());
  const { data: students } = useQuery(adminQueryOptions.students());

  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const teacherMap = new Map((teachers || []).map((t) => [t.id, `${t.first_name} ${t.last_name}`.trim() || t.username]));
  const studentMap = new Map((students || []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim() || s.username]));
  const examTypeMap = new Map((examTypes || []).map((t) => [t.id, t.name]));

  const [editType, setEditType] = useState<any>(null);
  const [editExam, setEditExam] = useState<any>(null);
  const [editAttempt, setEditAttempt] = useState<any>(null);
  const [typeForm] = Form.useForm();
  const [examForm] = Form.useForm();
  const [attemptForm] = Form.useForm();
  const [loadingType, setLoadingType] = useState(false);
  const [loadingExam, setLoadingExam] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(false);

  const typeMut = useMutation({
    mutationFn: (vals: any) => createExamType(vals),
    onSuccess: async () => {
      message.success(t('adminAssessment.examTypeAdded'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.examTypes });
    },
    onError: () => message.error(t('adminAssessment.examTypeAddError')),
  });

  const examMut = useMutation({
    mutationFn: (vals: any) =>
      createExam({
        subject: vals.subject,
        group: vals.group,
        teacher: vals.teacher,
        exam_type: vals.exam_type,
        duration_minutes: vals.duration_minutes,
        attempts: vals.attempts,
        starts_at: vals.starts_at?.toISOString(),
        ends_at: vals.ends_at?.toISOString(),
        proctoring_required: vals.proctoring_required,
      }),
    onSuccess: async () => {
      message.success(t('adminAssessment.examAdded'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.exams });
    },
    onError: () => message.error(t('adminAssessment.examAddError')),
  });

  return (
    <Card title={t('adminAssessment.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Tabs
        items={[
          {
            key: "types",
            label: t('adminAssessment.examTypes'),
            children: (
              <>
                <Form layout="inline" onFinish={typeMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
                  <Form.Item name="name" rules={[{ required: true, message: t('adminAssessment.nameRequired') }]}>
                    <Input placeholder={t('adminAssessment.namePlaceholder')} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={typeMut.isPending}>
                    {t('common.add')}
                  </Button>
                </Form>
                <List
                  dataSource={examTypes || []}
                  locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                  renderItem={(t_item) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditType(t_item);
                            typeForm.setFieldsValue({ name: t_item.name });
                          }}
                        >
                          {t('common.edit')}
                        </Button>,
                        <Popconfirm title={t('adminAssessment.confirmDelete')} onConfirm={() => deleteExamType(t_item.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.examTypes }))}>
                          <Button danger type="link">{t('common.delete')}</Button>
                        </Popconfirm>,
                      ]}
                    >
                      {t_item.name}
                    </List.Item>
                  )}
                />
              </>
            ),
          },
          {
            key: "exams",
            label: t('adminAssessment.exams'),
            children: (
              <>
                <Form layout="vertical" onFinish={examMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
                  <Form.Item name="subject" label={t('adminAssessment.subject')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="group" label={t('adminAssessment.group')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="teacher" label={t('adminAssessment.teacher')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(teachers || []).map((t) => ({
                        value: t.id,
                        label: `${t.first_name} ${t.last_name}`.trim() || t.username,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="exam_type" label={t('adminAssessment.examType')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(examTypes || []).map((t_item) => ({ value: t_item.id, label: t_item.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="duration_minutes" label={t('adminAssessment.duration')} rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="attempts" label={t('adminAssessment.attemptsCount')} rules={[{ required: true }]}>
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="starts_at" label={t('adminAssessment.startTime')}>
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="ends_at" label={t('adminAssessment.endTime')}>
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item
                    name="proctoring_required"
                    label={t('adminAssessment.proctoringRequired')}
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Switch defaultChecked />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={examMut.isPending}>
                    {t('common.add')}
                  </Button>
                </Form>
                <List
                  dataSource={exams || []}
                  locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                  renderItem={(e) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditExam(e);
                            examForm.setFieldsValue({
                              subject: e.subject,
                              group: e.group,
                              teacher: e.teacher,
                              exam_type: e.exam_type,
                              duration_minutes: e.duration_minutes,
                              attempts: e.attempts,
                              starts_at: e.starts_at ? dayjs(e.starts_at) : undefined,
                              ends_at: e.ends_at ? dayjs(e.ends_at) : undefined,
                              proctoring_required: e.proctoring_required,
                            });
                          }}
                        >
                          {t('common.edit')}
                        </Button>,
                        <Popconfirm title={t('adminAssessment.confirmDelete')} onConfirm={() => deleteExam(e.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.exams }))}>
                          <Button danger type="link">{t('common.delete')}</Button>
                        </Popconfirm>,
                      ]}
                    >
                      {subjectMap.get(e.subject) || `${t('adminAssessment.subject')} #${e.subject}`} | {groupMap.get(e.group) || `${t('adminAssessment.group')} #${e.group}`} |{" "}
                      {examTypeMap.get(e.exam_type) || `Type #${e.exam_type}`}
                    </List.Item>
                  )}
                />
              </>
            ),
          },
          {
            key: "attempts",
            label: t('adminAssessment.attempts'),
            children: (
              <List
                dataSource={attempts || []}
                locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                renderItem={(a) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        onClick={() => {
                          setEditAttempt(a);
                          attemptForm.setFieldsValue({
                            score_percent: a.score_percent,
                            status: a.status,
                            finished_at: a.finished_at ? dayjs(a.finished_at) : undefined,
                          });
                        }}
                      >
                        {t('common.edit')}
                      </Button>,
                      <Popconfirm title={t('adminAssessment.confirmDelete')} onConfirm={() => deleteExamAttempt(a.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.examAttempts }))}>
                        <Button danger type="link">{t('common.delete')}</Button>
                      </Popconfirm>,
                    ]}
                  >
                    {studentMap.get(a.student) || `Student #${a.student}`} | Exam #{a.exam} | Attempt {a.attempt_no} | {a.status}
                  </List.Item>
                )}
              />
            ),
          },
        ]}
      />

      <Modal
        title={t('adminAssessment.editExamType')}
        open={!!editType}
        onCancel={() => setEditType(null)}
        onOk={async () => {
          if (!editType) return;
          setLoadingType(true);
          try {
            const vals = await typeForm.validateFields();
            await updateExamType(editType.id, vals);
            message.success(t('common.updated'));
            setEditType(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.examTypes });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setLoadingType(false);
          }
        }}
        confirmLoading={loadingType}
      >
        <Form layout="vertical" form={typeForm}>
          <Form.Item name="name" label={t('adminAssessment.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('adminAssessment.editExam')}
        open={!!editExam}
        onCancel={() => setEditExam(null)}
        onOk={async () => {
          if (!editExam) return;
          setLoadingExam(true);
          try {
            const vals = await examForm.validateFields();
            await updateExam(editExam.id, {
              subject: vals.subject,
              group: vals.group,
              teacher: vals.teacher,
              exam_type: vals.exam_type,
              duration_minutes: vals.duration_minutes,
              attempts: vals.attempts,
              starts_at: vals.starts_at?.toISOString(),
              ends_at: vals.ends_at?.toISOString(),
              proctoring_required: vals.proctoring_required,
            });
            message.success(t('common.updated'));
            setEditExam(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.exams });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setLoadingExam(false);
          }
        }}
        confirmLoading={loadingExam}
      >
        <Form layout="vertical" form={examForm}>
          <Form.Item name="subject" label={t('adminAssessment.subject')} rules={[{ required: true }]}>
            <Select options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="group" label={t('adminAssessment.group')} rules={[{ required: true }]}>
            <Select options={(groups || []).map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="teacher" label={t('adminAssessment.teacher')} rules={[{ required: true }]}>
            <Select
              options={(teachers || []).map((t) => ({
                value: t.id,
                label: `${t.first_name} ${t.last_name}`.trim() || t.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="exam_type" label={t('adminAssessment.examType')} rules={[{ required: true }]}>
            <Select options={(examTypes || []).map((t) => ({ value: t.id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="duration_minutes" label={t('adminAssessment.duration')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="attempts" label={t('adminAssessment.attemptsCount')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="starts_at" label={t('adminAssessment.startTime')}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="ends_at" label={t('adminAssessment.endTime')}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="proctoring_required" label={t('adminAssessment.proctoringRequired')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('adminAssessment.editAttempt')}
        open={!!editAttempt}
        onCancel={() => setEditAttempt(null)}
        onOk={async () => {
          if (!editAttempt) return;
          setLoadingAttempt(true);
          try {
            const vals = await attemptForm.validateFields();
            await updateExamAttempt(editAttempt.id, {
              score_percent: vals.score_percent,
              status: vals.status,
              finished_at: vals.finished_at?.toISOString(),
            });
            message.success(t('common.updated'));
            setEditAttempt(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.examAttempts });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setLoadingAttempt(false);
          }
        }}
        confirmLoading={loadingAttempt}
      >
        <Form layout="vertical" form={attemptForm}>
          <Form.Item name="score_percent" label={t('adminAssessment.score')}>
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "started", label: "started" },
                { value: "finished", label: "finished" },
                { value: "expired", label: "expired" },
              ]}
            />
          </Form.Item>
          <Form.Item name="finished_at" label={t('adminAssessment.finishedAt')}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminAssessmentPage;
