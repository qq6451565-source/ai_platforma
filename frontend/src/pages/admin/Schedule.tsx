import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Card,
  Form,
  Select,
  Button,
  List,
  Empty,
  Popconfirm,
  Modal,
  DatePicker,
  Input,
  Tabs,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  createTimetableAdmin,
  updateTimetableAdmin,
  deleteTimetableAdmin,
  createLessonSlotAdmin,
  updateLessonSlotAdmin,
  deleteLessonSlotAdmin,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminSchedulePage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: timetables, isLoading: ttLoading } = useQuery(adminQueryOptions.timetables());
  const { data: slots, isLoading: slotLoading } = useQuery(adminQueryOptions.lessonSlots());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: teachers } = useQuery(adminQueryOptions.teachers());

  const [editTimetable, setEditTimetable] = useState<any>(null);
  const [editSlot, setEditSlot] = useState<any>(null);
  const [ttForm] = Form.useForm();
  const [slotForm] = Form.useForm();
  const [ttLoadingEdit, setTtLoadingEdit] = useState(false);
  const [slotLoadingEdit, setSlotLoadingEdit] = useState(false);

  const createTimetableMut = useMutation({
    mutationFn: (vals: any) => createTimetableAdmin(vals),
    onSuccess: async () => {
      message.success(t('common.saved'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.timetables });
    },
    onError: () => message.error(t('common.error')),
  });

  const createSlotMut = useMutation({
    mutationFn: (vals: any) =>
      createLessonSlotAdmin({
        timetable: vals.timetable,
        subject: vals.subject,
        teacher: vals.teacher,
        start_time: vals.start_time?.toISOString(),
        end_time: vals.end_time?.toISOString(),
        room: vals.room,
        mode: vals.mode,
      }),
    onSuccess: async () => {
      message.success(t('common.saved'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessonSlots });
    },
    onError: () => message.error(t('common.error')),
  });

  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const teacherMap = new Map((teachers || []).map((t) => [t.id, `${t.first_name} ${t.last_name}`.trim() || t.username]));
  const timetableMap = new Map(
    (timetables || []).map((t) => [t.id, `${groupMap.get(t.group) || t.group}`])
  );

  return (
    <Card title={t('adminSchedule.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Tabs
        items={[
          {
            key: "timetables",
            label: t('adminSchedule.timetable'),
            children: (
              <>
                <Form layout="inline" onFinish={createTimetableMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
                  <Form.Item name="group" rules={[{ required: true, message: t('form.group') }]}>
                    <Select
                      showSearch
                      placeholder={t('form.group')}
                      style={{ width: 200 }}
                      options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={createTimetableMut.isPending}>
                      {t('common.add')}
                    </Button>
                  </Form.Item>
                </Form>

                <List
                  loading={ttLoading}
                  dataSource={timetables || []}
                  locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                  renderItem={(tt) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditTimetable(tt);
                            ttForm.setFieldsValue({ group: tt.group });
                          }}
                        >
                          {t('common.edit')}
                        </Button>,
                        <Popconfirm title={t('common.confirmDelete')} onConfirm={() => deleteTimetableAdmin(tt.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.timetables }))}>
                          <Button danger type="link">{t('common.delete')}</Button>
                        </Popconfirm>,
                      ]} 
                    >
                      {groupMap.get(tt.group) || `${t('form.group')} #${tt.group}`}
                    </List.Item>
                  )}
                />
              </>
            ),
          },
          {
            key: "slots",
            label: t('adminSchedule.lessonSlots'),
            children: (
              <>
                <Form layout="vertical" onFinish={createSlotMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
                  <Form.Item name="timetable" label={t('adminSchedule.timetable')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder={t('adminSchedule.selectTimetable')}
                      options={(timetables || []).map((t) => ({
                        value: t.id,
                        label: `${groupMap.get(t.group) || t.group}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="subject" label={t('form.subject')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder={t('adminSubjects.selectDirection')}
                      options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="teacher" label={t('adminTeacherSubjects.teacher')} rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder={t('adminTeacherSubjects.teacher')}
                      options={(teachers || []).map((t) => ({
                        value: t.id,
                        label: `${t.first_name} ${t.last_name}`.trim() || t.username,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="start_time" label={t('adminAssessment.startTime')} rules={[{ required: true }]}>
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="end_time" label={t('adminAssessment.endTime')} rules={[{ required: true }]}>
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="room" label={t('adminSchedule.room')}>
                    <Input placeholder={t('adminSchedule.classroom')} />
                  </Form.Item>
                  <Form.Item name="mode" label={t('adminSchedule.format')} rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: "offline", label: "Offline" },
                        { value: "online", label: "Online" },
                      ]}
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={createSlotMut.isPending}>
                    {t('common.add')}
                  </Button>
                </Form>

                <List
                  loading={slotLoading}
                  dataSource={slots || []}
                  locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                  renderItem={(s) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditSlot(s);
                            slotForm.setFieldsValue({
                              timetable: s.timetable,
                              subject: s.subject,
                              teacher: s.teacher,
                              start_time: s.start_time ? dayjs(s.start_time) : undefined,
                              end_time: s.end_time ? dayjs(s.end_time) : undefined,
                              room: s.room,
                              mode: s.mode,
                            });
                          }}
                        >
                          {t('common.edit')}
                        </Button>,
                        <Popconfirm title={t('common.confirmDelete')} onConfirm={() => deleteLessonSlotAdmin(s.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessonSlots }))}>
                          <Button danger type="link">{t('common.delete')}</Button>
                        </Popconfirm>,
                      ]}
                    >
                      {subjectMap.get(s.subject) || `Fan #${s.subject}`} | {teacherMap.get(s.teacher) || `Teacher #${s.teacher}`} |{" "}
                      {timetableMap.get(s.timetable) || `Jadval #${s.timetable}`} | {s.mode}
                    </List.Item>
                  )}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title={t('adminSchedule.editTimetable')}
        open={!!editTimetable}
        onCancel={() => setEditTimetable(null)}
        onOk={async () => {
          if (!editTimetable) return;
          setTtLoadingEdit(true);
          try {
            const vals = await ttForm.validateFields();
            await updateTimetableAdmin(editTimetable.id, vals);
            message.success(t('common.updated'));
            setEditTimetable(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.timetables });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setTtLoadingEdit(false);
          }
        }}
        confirmLoading={ttLoadingEdit}
      >
        <Form layout="vertical" form={ttForm}>
          <Form.Item name="group" label={t('form.group')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('adminSchedule.editSlot')}
        open={!!editSlot}
        onCancel={() => setEditSlot(null)}
        onOk={async () => {
          if (!editSlot) return;
          setSlotLoadingEdit(true);
          try {
            const vals = await slotForm.validateFields();
            await updateLessonSlotAdmin(editSlot.id, {
              timetable: vals.timetable,
              subject: vals.subject,
              teacher: vals.teacher,
              start_time: vals.start_time?.toISOString(),
              end_time: vals.end_time?.toISOString(),
              room: vals.room,
              mode: vals.mode,
            });
            message.success(t('common.updated'));
            setEditSlot(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessonSlots });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setSlotLoadingEdit(false);
          }
        }}
        confirmLoading={slotLoadingEdit}
      >
        <Form layout="vertical" form={slotForm}>
          <Form.Item name="timetable" label={t('adminSchedule.timetable')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={(timetables || []).map((t) => ({
                value: t.id,
                label: `${groupMap.get(t.group) || t.group}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="subject" label={t('form.subject')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="teacher" label={t('adminTeacherSubjects.teacher')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={(teachers || []).map((t) => ({
                value: t.id,
                label: `${t.first_name} ${t.last_name}`.trim() || t.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="start_time" label={t('adminAssessment.startTime')} rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="end_time" label={t('adminAssessment.endTime')} rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="room" label={t('adminSchedule.room')}>
            <Input />
          </Form.Item>
          <Form.Item name="mode" label={t('adminSchedule.format')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "offline", label: "Offline" },
                { value: "online", label: "Online" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminSchedulePage;
