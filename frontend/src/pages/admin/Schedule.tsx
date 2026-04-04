import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
      message.success("Jadval qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.timetables });
    },
    onError: () => message.error("Jadval qo'shishda xato"),
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
      message.success("Dars oynasi qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessonSlots });
    },
    onError: () => message.error("Dars oynasi qo'shishda xato"),
  });

  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const teacherMap = new Map((teachers || []).map((t) => [t.id, `${t.first_name} ${t.last_name}`.trim() || t.username]));
  const timetableMap = new Map(
    (timetables || []).map((t) => [t.id, `${groupMap.get(t.group) || t.group}`])
  );

  return (
    <Card title="Jadval va dars oynalari" style={{ marginBottom: 'var(--space-4)' }}>
      <Tabs
        items={[
          {
            key: "timetables",
            label: "Jadval (Timetable)",
            children: (
              <>
                <Form layout="inline" onFinish={createTimetableMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
                  <Form.Item name="group" rules={[{ required: true, message: "Guruh" }]}>
                    <Select
                      showSearch
                      placeholder="Guruh"
                      style={{ width: 200 }}
                      options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={createTimetableMut.isPending}>
                      Qo'shish
                    </Button>
                  </Form.Item>
                </Form>

                <List
                  loading={ttLoading}
                  dataSource={timetables || []}
                  locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                  renderItem={(t) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditTimetable(t);
                            ttForm.setFieldsValue({ group: t.group });
                          }}
                        >
                          Tahrirlash
                        </Button>,
                        <Popconfirm title="O'chirish?" onConfirm={() => deleteTimetableAdmin(t.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.timetables }))}>
                          <Button danger type="link">O'chirish</Button>
                        </Popconfirm>,
                      ]} 
                    >
                      {groupMap.get(t.group) || `Guruh #${t.group}`}
                    </List.Item>
                  )}
                />
              </>
            ),
          },
          {
            key: "slots",
            label: "Dars oynalari (Lesson slots)",
            children: (
              <>
                <Form layout="vertical" onFinish={createSlotMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
                  <Form.Item name="timetable" label="Jadval" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder="Jadval tanlang"
                      options={(timetables || []).map((t) => ({
                        value: t.id,
                        label: `${groupMap.get(t.group) || t.group}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder="Fan tanlang"
                      options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="teacher" label="O'qituvchi" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder="O'qituvchi"
                      options={(teachers || []).map((t) => ({
                        value: t.id,
                        label: `${t.first_name} ${t.last_name}`.trim() || t.username,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="start_time" label="Boshlanish vaqti" rules={[{ required: true }]}>
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="end_time" label="Tugash vaqti" rules={[{ required: true }]}>
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="room" label="Xona">
                    <Input placeholder="Auditoriya" />
                  </Form.Item>
                  <Form.Item name="mode" label="Format" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: "offline", label: "Offline" },
                        { value: "online", label: "Online" },
                      ]}
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={createSlotMut.isPending}>
                    Qo'shish
                  </Button>
                </Form>

                <List
                  loading={slotLoading}
                  dataSource={slots || []}
                  locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
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
                          Tahrirlash
                        </Button>,
                        <Popconfirm title="O'chirish?" onConfirm={() => deleteLessonSlotAdmin(s.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessonSlots }))}>
                          <Button danger type="link">O'chirish</Button>
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
        title="Jadvalni tahrirlash"
        open={!!editTimetable}
        onCancel={() => setEditTimetable(null)}
        onOk={async () => {
          if (!editTimetable) return;
          setTtLoadingEdit(true);
          try {
            const vals = await ttForm.validateFields();
            await updateTimetableAdmin(editTimetable.id, vals);
            message.success("Yangilandi");
            setEditTimetable(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.timetables });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error("Xatolik");
          } finally {
            setTtLoadingEdit(false);
          }
        }}
        confirmLoading={ttLoadingEdit}
      >
        <Form layout="vertical" form={ttForm}>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Dars oynasini tahrirlash"
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
            message.success("Yangilandi");
            setEditSlot(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessonSlots });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error("Xatolik");
          } finally {
            setSlotLoadingEdit(false);
          }
        }}
        confirmLoading={slotLoadingEdit}
      >
        <Form layout="vertical" form={slotForm}>
          <Form.Item name="timetable" label="Jadval" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(timetables || []).map((t) => ({
                value: t.id,
                label: `${groupMap.get(t.group) || t.group}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="teacher" label="O'qituvchi" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(teachers || []).map((t) => ({
                value: t.id,
                label: `${t.first_name} ${t.last_name}`.trim() || t.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="start_time" label="Boshlanish vaqti" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="end_time" label="Tugash vaqti" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="room" label="Xona">
            <Input />
          </Form.Item>
          <Form.Item name="mode" label="Format" rules={[{ required: true }]}>
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
