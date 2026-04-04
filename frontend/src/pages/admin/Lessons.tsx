import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, Form, Button, message, DatePicker, Modal, Select, List, Space } from "antd";
import dayjs from "dayjs";
import {
  createLessonAdmin,
  updateLessonAdmin,
  deleteLessonAdmin,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminLessonsPage = () => {
  const qc = useQueryClient();
  const { data: lessons, isLoading } = useQuery(adminQueryOptions.lessons());
  const { data: teacherSubjects } = useQuery(adminQueryOptions.teacherSubjects());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: groups } = useQuery(adminQueryOptions.groups());

  const [createForm] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [createTeacherSubject, setCreateTeacherSubject] = useState<number | null>(null);
  const [editForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editTeacherSubject, setEditTeacherSubject] = useState<number | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [filterGroup, setFilterGroup] = useState<number | null>(null);

  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const teacherSubjectMap = new Map((teacherSubjects || []).map((ts) => [ts.id, ts]));
  const teacherSubjectLabel = new Map(
    (teacherSubjects || []).map((ts) => {
      const subjectLabel = subjectMap.get(ts.subject) || `Fan #${ts.subject}`;
      return [ts.id, subjectLabel];
    })
  );
  const createGroupIds = createTeacherSubject ? teacherSubjectMap.get(createTeacherSubject)?.groups || [] : [];
  const editGroupIds = editTeacherSubject ? teacherSubjectMap.get(editTeacherSubject)?.groups || [] : [];
  const createGroupOptions = (groups || [])
    .filter((g) => (createTeacherSubject ? createGroupIds.includes(g.id) : false))
    .map((g) => ({ value: g.id, label: g.name }));
  const editGroupOptions = (groups || [])
    .filter((g) => (editTeacherSubject ? editGroupIds.includes(g.id) : false))
    .map((g) => ({ value: g.id, label: g.name }));
  const weekdayNames = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

  const buildTopic = (teacherSubjectId: number, startTime?: dayjs.Dayjs | null) => {
    const meta = teacherSubjectMap.get(teacherSubjectId);
    const subjectLabel =
      subjectMap.get(meta?.subject || 0) || (meta?.subject ? `Fan #${meta.subject}` : "Dars");
    const startLabel = startTime ? startTime.format("YYYY-MM-DD HH:mm") : "";
    return startLabel ? `${subjectLabel} | ${startLabel}` : subjectLabel;
  };

  const createMut = useMutation({
    mutationFn: (vals: any) => {
      const start = vals.start_time;
      const end = start ? dayjs(start).add(90, "minute") : null;
      return createLessonAdmin({
        teacher_subject: vals.teacher_subject,
        group: vals.group,
        topic: buildTopic(vals.teacher_subject, start),
        start_time: start?.toISOString(),
        end_time: end?.toISOString(),
      });
    },
    onSuccess: async () => {
      message.success("Dars qo'shildi");
      createForm.resetFields();
      setCreateTeacherSubject(null);
      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessons });
    },
    onError: () => message.error("Dars qo'shishda xato"),
  });

  const filteredLessons = (lessons || []).filter((lesson) => {
    if (filterGroup && lesson.group !== filterGroup) return false;
    if (filterSubject) {
      const meta = teacherSubjectMap.get(lesson.teacher_subject);
      if (meta?.subject !== filterSubject) return false;
    }
    return true;
  });

  const lessonsByDate = filteredLessons.reduce<Record<string, any[]>>((acc, lesson) => {
    const key = lesson.start_time ? dayjs(lesson.start_time).format("YYYY-MM-DD") : "";
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lesson);
    return acc;
  }, {});
  const selectedKey = selectedDate.format("YYYY-MM-DD");
  const selectedLessons = (lessonsByDate[selectedKey] || [])
    .slice()
    .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());

  const openCreateForDate = (value: dayjs.Dayjs) => {
    setCreateOpen(true);
    setCreateTeacherSubject(null);
    createForm.resetFields();
    const start = value.hour(9).minute(0).second(0);
    createForm.setFieldsValue({ start_time: start });
  };

  const weekStart = selectedDate.subtract((selectedDate.day() + 6) % 7, "day");
  const weekDays = Array.from({ length: 7 }, (_, idx) => weekStart.add(idx, "day"));
  const weekLabel = `${weekStart.format("DD.MM")} - ${weekStart.add(6, "day").format("DD.MM.YYYY")}`;
  const monthLabel = selectedDate.format("MM.YYYY");
  const monthStart = selectedDate.startOf("month");
  const monthEnd = selectedDate.endOf("month");
  const gridStart = monthStart.subtract((monthStart.day() + 6) % 7, "day");
  const monthEndIndex = (monthEnd.day() + 6) % 7;
  const gridEnd = monthEnd.add(6 - monthEndIndex, "day");
  const monthDays = Array.from({ length: gridEnd.diff(gridStart, "day") + 1 }, (_, idx) =>
    gridStart.add(idx, "day")
  );

  const openEditLesson = (lesson: any) => {
    setEditItem(lesson);
    editForm.setFieldsValue({
      teacher_subject: lesson.teacher_subject,
      group: lesson.group,
      start_time: lesson.start_time ? dayjs(lesson.start_time) : null,
    });
    setEditTeacherSubject(lesson.teacher_subject || null);
    setEditOpen(true);
  };

  const confirmDelete = (lesson: any) => {
    if (!lesson) return;
    Modal.confirm({
      title: "Darsni o'chirish?",
      content: "Bu amalni ortga qaytarib bo'lmaydi.",
      okText: "O'chirish",
      okType: "danger",
      cancelText: "Bekor qilish",
      onOk: async () => {
        try {
          await deleteLessonAdmin(lesson.id);
          message.success("O'chirildi");
          if (editItem?.id === lesson.id) {
            setEditOpen(false);
            setEditTeacherSubject(null);
            setEditItem(null);
          }
          await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessons });
        } catch {
          message.error("O'chirishda xato");
        }
      },
    });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const vals = await editForm.validateFields();
      const start = vals.start_time;
      const end = start ? dayjs(start).add(90, "minute") : null;
      await updateLessonAdmin(editItem.id, {
        teacher_subject: vals.teacher_subject,
        group: vals.group,
        topic: buildTopic(vals.teacher_subject, vals.start_time),
        start_time: vals.start_time?.toISOString(),
        end_time: end?.toISOString(),
      });
      message.success("Yangilandi");
      setEditOpen(false);
      setEditTeacherSubject(null);
      setEditItem(null);
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.lessons });
    } catch (err: any) {
      if (!err?.errorFields) message.error("Xatolik");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <Card title="Dars jadvali" style={{ marginBottom: 'var(--space-4)' }} loading={isLoading}>
      <Space size={12} wrap style={{ marginBottom: 'var(--space-3)' }}>
        <Select
          allowClear
          placeholder="Fan bo'yicha filter"
          style={{ minWidth: 220 }}
          value={filterSubject ?? undefined}
          onChange={(value) => setFilterSubject(value ?? null)}
          options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          allowClear
          placeholder="Guruh bo'yicha filter"
          style={{ minWidth: 220 }}
          value={filterGroup ?? undefined}
          onChange={(value) => setFilterGroup(value ?? null)}
          options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
        />
        <Button
          onClick={() => {
            setFilterSubject(null);
            setFilterGroup(null);
          }}
        >
          Tozalash
        </Button>
      </Space>
      <div className="lesson-calendar">
        <div className="lesson-calendar__left">
          <div className="lesson-week">
            <div className="lesson-week__header">
              <div>
                <div className="lesson-week__title">{viewMode === "week" ? "Hafta" : "Oy"}</div>
                <div className="lesson-week__range">{viewMode === "week" ? weekLabel : monthLabel}</div>
              </div>
              <div className="lesson-week__controls">
                <Button
                  size="small"
                  type="text"
                  onClick={() =>
                    setSelectedDate(viewMode === "week" ? selectedDate.subtract(1, "week") : selectedDate.subtract(1, "month"))
                  }
                >
                  {"<"}
                </Button>
                <Button
                  size="small"
                  type="text"
                  onClick={() =>
                    setSelectedDate(viewMode === "week" ? selectedDate.add(1, "week") : selectedDate.add(1, "month"))
                  }
                >
                  {">"}
                </Button>
                <Button size="small" onClick={() => setSelectedDate(dayjs())}>
                  Bugun
                </Button>
                <Button
                  size="small"
                  type={viewMode === "week" ? "primary" : "default"}
                  onClick={() => setViewMode("week")}
                >
                  Hafta
                </Button>
                <Button
                  size="small"
                  type={viewMode === "month" ? "primary" : "default"}
                  onClick={() => setViewMode("month")}
                >
                  Oy
                </Button>
                <Button size="small" type="primary" onClick={() => openCreateForDate(selectedDate)}>
                  Dars qo'shish
                </Button>
              </div>
            </div>
            <div className="lesson-week__grid-wrap">
              <div className={viewMode === "week" ? "lesson-week__grid" : "lesson-month__grid"}>
                {(viewMode === "week" ? weekDays : monthDays).map((day) => {
                  const key = day.format("YYYY-MM-DD");
                  const dayLessons = (lessonsByDate[key] || [])
                    .slice()
                    .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
                  const isToday = day.isSame(dayjs(), "day");
                  const isSelected = day.isSame(selectedDate, "day");
                  const isOutside = viewMode === "month" && day.month() !== selectedDate.month();
                  return (
                    <div
                      key={key}
                      className={`lesson-week__day${viewMode === "month" ? " lesson-month__day" : ""}${
                        isToday ? " is-today" : ""
                      }${isSelected ? " is-selected" : ""}${isOutside ? " is-outside" : ""}`}
                      onClick={() => {
                        setSelectedDate(day);
                        setDayOpen(true);
                      }}
                    >
                      <div className={`lesson-week__day-header${viewMode === "month" ? " lesson-month__day-header" : ""}`}>
                        <div className="lesson-week__weekday">{weekdayNames[day.day()]}</div>
                        <div className="lesson-week__date">
                          {viewMode === "month" ? day.format("D") : day.format("DD.MM")}
                        </div>
                      </div>
                      <div className={`lesson-week__items${viewMode === "month" ? " lesson-month__items" : ""}`}>
                        {dayLessons.map((l) => {
                          const meta = teacherSubjectMap.get(l.teacher_subject);
                          const subjectLabel =
                            l.subject_name ||
                            subjectMap.get(meta?.subject || 0) ||
                            (meta?.subject ? `Fan #${meta.subject}` : "Fan");
                          const groupLabel = groupMap.get(l.group) || `Guruh #${l.group}`;
                          const timeLabel =
                            l.start_time && l.end_time
                              ? `${dayjs(l.start_time).format("HH:mm")} - ${dayjs(l.end_time).format("HH:mm")}`
                              : "-";
                          return (
                            <button
                              key={l.id}
                              type="button"
                              className="lesson-week__chip lesson-week__chip--clickable"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDayOpen(false);
                                openEditLesson(l);
                              }}
                            >
                              <div className="lesson-week__chip-title">
                                {subjectLabel} - {groupLabel}
                              </div>
                              <div className="lesson-week__chip-time">{timeLabel}</div>
                            </button>
                          );
                        })}
                        {!dayLessons.length && <div className="lesson-week__empty">Bo'sh</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={`Kundagi darslar: ${selectedDate.format("DD.MM.YYYY")}`}
        open={dayOpen}
        onCancel={() => setDayOpen(false)}
        styles={{ body: { maxHeight: 460, overflowY: "auto" } }}
        footer={[
          <Button key="close" onClick={() => setDayOpen(false)}>
            Yopish
          </Button>,
          <Button
            key="add"
            type="primary"
            onClick={() => {
              setDayOpen(false);
              openCreateForDate(selectedDate);
            }}
          >
            Dars qo'shish
          </Button>,
        ]}
      >
        <List
          dataSource={selectedLessons}
          locale={{ emptyText: "Bu kunda dars yo'q" }}
          renderItem={(item) => {
            const meta = teacherSubjectMap.get(item.teacher_subject);
            const subjectLabel =
              item.subject_name ||
              subjectMap.get(meta?.subject || 0) ||
              (meta?.subject ? `Fan #${meta.subject}` : "Fan");
            const groupLabel = groupMap.get(item.group) || `Guruh #${item.group}`;
            const timeLabel =
              item.start_time && item.end_time
                ? `${dayjs(item.start_time).format("HH:mm")} - ${dayjs(item.end_time).format("HH:mm")}`
                : "-";
            return (
              <List.Item
                actions={[
                  <Button
                    key="edit"
                    size="small"
                    onClick={() => {
                      setDayOpen(false);
                      openEditLesson(item);
                    }}
                  >
                    Tahrirlash
                  </Button>,
                  <Button key="delete" size="small" danger onClick={() => confirmDelete(item)}>
                    O'chirish
                  </Button>,
                ]}
              >
                <Space direction="vertical" size={0}>
                  <div>{`${subjectLabel} - ${groupLabel}`}</div>
                  <div style={{ fontSize: 'var(--font-size-tiny)', color: "var(--color-text-secondary)" }}>{timeLabel}</div>
                </Space>
              </List.Item>
            );
          }}
        />
      </Modal>

      <Modal
        title="Dars jadvali qo'shish"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          try {
            const vals = await createForm.validateFields();
            createMut.mutate(vals);
          } catch {
            // validation errors
          }
        }}
        confirmLoading={createMut.isPending}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="teacher_subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Fan tanlang"
              options={(teacherSubjects || []).map((ts) => ({
                value: ts.id,
                label: teacherSubjectLabel.get(ts.id) || `#${ts.id}`,
              }))}
              onChange={(value) => {
                const next = value ?? null;
                setCreateTeacherSubject(next);
                createForm.setFieldsValue({ group: undefined });
              }}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select showSearch placeholder="Guruh" options={createGroupOptions} disabled={!createTeacherSubject} />
          </Form.Item>
          <Form.Item
            name="start_time"
            label="Boshlanish"
            rules={[{ required: true }]}
            extra="Tugash vaqti avtomatik 1.5 soat qo'shiladi"
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Darsni tahrirlash"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditTeacherSubject(null);
          setEditItem(null);
        }}
        footer={[
          <Button key="delete" danger onClick={() => confirmDelete(editItem)} disabled={!editItem}>
            O'chirish
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setEditOpen(false);
              setEditTeacherSubject(null);
              setEditItem(null);
            }}
          >
            Bekor qilish
          </Button>,
          <Button key="save" type="primary" onClick={handleUpdate} loading={editLoading}>
            Saqlash
          </Button>,
        ]}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="teacher_subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Fan tanlang"
              options={(teacherSubjects || []).map((ts) => ({
                value: ts.id,
                label: teacherSubjectLabel.get(ts.id) || `#${ts.id}`,
              }))}
              onChange={(value) => {
                const next = value ?? null;
                setEditTeacherSubject(next);
                editForm.setFieldsValue({ group: undefined });
              }}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select showSearch placeholder="Guruh" options={editGroupOptions} disabled={!editTeacherSubject} />
          </Form.Item>
          <Form.Item
            name="start_time"
            label="Boshlanish"
            rules={[{ required: true }]}
            extra="Tugash vaqti avtomatik 1.5 soat qo'shiladi"
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminLessonsPage;
