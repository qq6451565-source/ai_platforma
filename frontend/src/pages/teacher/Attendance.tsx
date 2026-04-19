import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Input, Modal, Select, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { fetchLessons } from "../../api/lessons";
import { fetchTeacherStudents } from "../../api/user";
import {
  fetchAttendanceOverrideHistory,
  fetchLessonAttendance,
  markAttendance,
  type AttendanceOverrideLog,
} from "../../api/attendance";
import { usePageTitle } from "../../hooks/usePageTitle";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import { fetchSubjects } from "../../api/subjects";
import { useTranslation } from "react-i18next";

type LessonItem = {
  id: number;
  subject_name?: string;
  group_name?: string;
  group?: number;
  topic?: string;
  start_time?: string;
};

type StudentRow = {
  id: number;
  name: string;
  groupName: string;
  status: "present" | "absent";
  timestamp?: string;
  joinedRatio?: number;
  faceVerifiedRatio?: number;
  finalized?: boolean;
  manualOverride?: boolean;
  overrideReason?: string;
  overriddenByName?: string | null;
  overriddenAt?: string | null;
};

type OverrideDraft = {
  lesson: number;
  student: number;
  status: "present" | "absent";
  studentName: string;
};

type HistoryTarget = {
  lesson: number;
  student: number;
  studentName: string;
};

const formatRatio = (value?: number | null) => (value == null ? "-" : `${Math.round(value * 100)}%`);

const TeacherAttendancePage = () => {
  usePageTitle('nav.attendance');
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: lessons, isLoading: loadingLessons } = useQuery({
    queryKey: ["teacher-lessons"],
    queryFn: fetchLessons,
  });
  const { data: students } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: fetchTeacherStudents,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);

  const subjectCards = useMemo(() => {
    const subjectNameById = new Map((subjects || []).map((s) => [s.id, s.name]));
    const counts = new Map<string, number>();

    (teacherSubjects || []).forEach((ts) => {
      const name = subjectNameById.get(ts.subject);
      if (!name) return;
      if (!counts.has(name)) counts.set(name, 0);
    });

    (lessons || []).forEach((lesson: LessonItem) => {
      if (!lesson.subject_name) return;
      counts.set(lesson.subject_name, (counts.get(lesson.subject_name) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lessons, teacherSubjects, subjects]);

  const subjectLessons = useMemo(() => {
    if (!selectedSubject) return [];
    return (lessons || []).filter((lesson: LessonItem) => lesson.subject_name === selectedSubject);
  }, [lessons, selectedSubject]);

  const selectedLesson = useMemo(
    () => subjectLessons.find((lesson: LessonItem) => lesson.id === selectedLessonId) || null,
    [subjectLessons, selectedLessonId]
  );

  const { data: attendanceRecords, isLoading: loadingAttendance } = useQuery({
    queryKey: ["teacher-attendance", selectedLessonId],
    queryFn: () => fetchLessonAttendance(selectedLessonId as number),
    enabled: !!selectedLessonId,
  });
  const { data: overrideHistory, isLoading: loadingOverrideHistory } = useQuery({
    queryKey: ["attendance-override-history", historyTarget?.lesson, historyTarget?.student],
    queryFn: () => fetchAttendanceOverrideHistory(historyTarget!.lesson, historyTarget!.student),
    enabled: !!historyTarget,
  });

  const attendanceMap = useMemo(() => {
    const map = new Map<
      number,
      {
        status: "present" | "absent";
        timestamp?: string;
        joinedRatio?: number;
        faceVerifiedRatio?: number;
        finalized?: boolean;
        manualOverride?: boolean;
        overrideReason?: string;
        overriddenByName?: string | null;
        overriddenAt?: string | null;
      }
    >();
    (attendanceRecords || []).forEach((rec) => {
      map.set(rec.student, {
        status: rec.status,
        timestamp: rec.timestamp,
        joinedRatio: rec.joined_ratio,
        faceVerifiedRatio: rec.face_verified_ratio,
        finalized: rec.finalized,
        manualOverride: rec.manual_override,
        overrideReason: rec.override_reason,
        overriddenByName: rec.overridden_by_name,
        overriddenAt: rec.overridden_at,
      });
    });
    return map;
  }, [attendanceRecords]);

  const studentsForLesson = useMemo(() => {
    if (!selectedLesson?.group) return [];
    return (students || []).filter((student) => student.group === selectedLesson.group);
  }, [students, selectedLesson]);

  const rows = useMemo<StudentRow[]>(() => {
    const q = search.trim().toLowerCase();
    return (studentsForLesson || [])
      .filter((student) => {
        if (!q) return true;
        const name = `${student.first_name || ""} ${student.last_name || ""}`.trim().toLowerCase();
        const username = (student.username || "").toLowerCase();
        return name.includes(q) || username.includes(q);
      })
      .map((student) => {
        const rec = attendanceMap.get(student.id);
        return {
          id: student.id,
          name: `${student.first_name} ${student.last_name}`.trim() || student.username,
          groupName: selectedLesson?.group_name || "-",
          status: rec?.status || "absent",
          timestamp: rec?.timestamp,
          joinedRatio: rec?.joinedRatio,
          faceVerifiedRatio: rec?.faceVerifiedRatio,
          finalized: rec?.finalized,
          manualOverride: rec?.manualOverride,
          overrideReason: rec?.overrideReason,
          overriddenByName: rec?.overriddenByName,
          overriddenAt: rec?.overriddenAt,
        };
      });
  }, [studentsForLesson, attendanceMap, search, selectedLesson]);

  const markMut = useMutation({
    mutationFn: (payload: { student: number; lesson: number; status: "present" | "absent"; reason: string }) =>
      markAttendance(payload),
    onSuccess: async () => {
      message.success(t('teacherAttendance.overrideSuccess'));
      setOverrideDraft(null);
      setOverrideReason("");
      await qc.invalidateQueries({ queryKey: ["teacher-attendance", selectedLessonId] });
      await qc.invalidateQueries({ queryKey: ["attendance-override-history"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.reason?.[0] || error?.response?.data?.detail || t('teacherAttendance.overrideError'));
    },
  });

  const openOverrideModal = (draft: OverrideDraft) => {
    setOverrideDraft(draft);
    setOverrideReason("");
  };

  const submitOverride = () => {
    if (!overrideDraft) return;
    const reason = overrideReason.trim();
    if (reason.length < 5) {
      message.warning(t('teacherAttendance.overrideMinReason'));
      return;
    }
    markMut.mutate({ ...overrideDraft, reason });
  };

  const columns = [
    {
      title: t('teacherAttendance.student'),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t('teacherAttendance.group'),
      dataIndex: "groupName",
      key: "groupName",
    },
    {
      title: t('teacherAttendance.attendance'),
      key: "status",
      render: (_: unknown, row: StudentRow) => (
        <Select
          value={row.status}
          style={{ width: 120 }}
          onChange={(value) => {
            if (!selectedLessonId) return;
            openOverrideModal({
              lesson: selectedLessonId,
              student: row.id,
              status: value,
              studentName: row.name,
            });
          }}
          options={[
            { value: "present", label: t('teacherAttendance.present') },
            { value: "absent", label: t('teacherAttendance.absent') },
          ]}
        />
      ),
    },
    {
      title: t('teacherAttendance.lastMarked'),
      key: "timestamp",
      render: (_: unknown, row: StudentRow) =>
        row.timestamp ? dayjs(row.timestamp).format("DD.MM.YYYY HH:mm") : "-",
    },
    {
      title: t('teacherAttendance.override'),
      key: "override",
      render: (_: unknown, row: StudentRow) =>
        row.manualOverride ? (
          <Tag
            color="blue"
          title={`${row.overrideReason || t('teacherAttendance.noReason')}${row.overriddenByName ? ` | ${row.overriddenByName}` : ""}${
              row.overriddenAt ? ` | ${dayjs(row.overriddenAt).format("DD.MM.YYYY HH:mm")}` : ""
            }`}
            style={{ cursor: "pointer" }}
            onClick={() =>
              selectedLessonId &&
              setHistoryTarget({
                lesson: selectedLessonId,
                student: row.id,
                studentName: row.name,
              })
            }
          >
            {t('teacherAttendance.manual')}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: t('teacherAttendance.final'),
      key: "finalized",
      render: (_: unknown, row: StudentRow) => (
        <Tag color={row.finalized ? "green" : "gold"}>{row.finalized ? t('teacherAttendance.finalized') : t('teacherAttendance.inProgress')}</Tag>
      ),
    },
    {
      title: t('teacherAttendance.participation'),
      key: "joinedRatio",
      render: (_: unknown, row: StudentRow) => formatRatio(row.joinedRatio),
    },
    {
      title: t('teacherAttendance.faceRatio'),
      key: "faceVerifiedRatio",
      render: (_: unknown, row: StudentRow) => formatRatio(row.faceVerifiedRatio),
    },
  ];

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('nav.attendance')}</Typography.Title>

      {!selectedSubject ? (
        loadingLessons ? (
          <Empty description="Yuklanmoqda..." />
        ) : subjectCards.length ? (
          <div className="card-grid">
            {subjectCards.map((subject) => (
              <Card key={subject.name} hoverable onClick={() => setSelectedSubject(subject.name)}>
                <Typography.Text strong>{subject.name}</Typography.Text>
                <div style={{ marginTop: 'var(--space-1-5)', color: "var(--color-text-muted)" }}>{t('teacherAttendance.lessonsCount', { count: subject.count })}</div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description={t('teacherAttendance.noSubjects')} />
        )
      ) : (
        <>
          <div className="page-header-row">
            <Button
              onClick={() => {
                setSelectedSubject(null);
                setSelectedLessonId(null);
                setSearch("");
              }}
            >
              {t('common.back')}
            </Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          <div className="filters-row">
            <Select
              placeholder={t('teacherAttendance.selectLesson')}
              style={{ flex: '1 1 240px', minWidth: 0 }}
              value={selectedLessonId ?? undefined}
              onChange={(value) => setSelectedLessonId(value)}
              options={subjectLessons.map((lesson: LessonItem) => ({
                value: lesson.id,
                label: `${lesson.topic || t('teacherAttendance.lesson')} | ${lesson.group_name || t('teacherAttendance.group')} | ${dayjs(
                  lesson.start_time
                ).format("DD.MM HH:mm")}`,
              }))}
            />
            <Input
              placeholder={t('teacherAttendance.searchStudent')}
              style={{ flex: '1 1 160px', minWidth: 0 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {selectedLesson ? (
              <Tag color="blue">{selectedLesson.group_name || t('teacherAttendance.group')}</Tag>
            ) : null}
          </div>

          {!selectedLessonId ? (
            <Empty description={t('teacherAttendance.selectLessonPrompt')} />
          ) : loadingAttendance ? (
            <Empty description={t('teacherAttendance.loadingAttendance')} />
          ) : rows.length ? (
            <div className="table-scroll">
              <Table rowKey="id" columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 1080 }} size="small" />
            </div>
          ) : (
            <Empty description={t('teacherAttendance.noStudents')} />
          )}
        </>
      )}

      <Modal
        title={t('teacherAttendance.overrideTitle')}
        open={!!overrideDraft}
        onCancel={() => {
          if (markMut.isPending) return;
          setOverrideDraft(null);
          setOverrideReason("");
        }}
        onOk={submitOverride}
        okText={t('common.save')}
        confirmLoading={markMut.isPending}
      >
        <Typography.Paragraph style={{ marginBottom: 'var(--space-3)' }}>
          {overrideDraft?.studentName} {t('teacherAttendance.overrideConfirm', { name: '' })}{" "}
          <strong>{overrideDraft?.status === "present" ? t('teacherAttendance.present') : t('teacherAttendance.absent')}</strong> {t('teacherAttendance.overrideSet')}
        </Typography.Paragraph>
        <Input.TextArea
          rows={4}
          value={overrideReason}
          onChange={(event) => setOverrideReason(event.target.value)}
          placeholder={t('teacherAttendance.overrideReason')}
          maxLength={500}
        />
      </Modal>

      <Modal
        title={`${t('teacherAttendance.historyTitle')}${historyTarget ? `: ${historyTarget.studentName}` : ""}`}
        open={!!historyTarget}
        onCancel={() => setHistoryTarget(null)}
        footer={null}
        width="min(760px, calc(100vw - 32px))"
      >
        {loadingOverrideHistory ? (
          <Empty description={t('common.loading')} />
        ) : !overrideHistory?.length ? (
          <Empty description={t('teacherAttendance.historyNoRecords')} />
        ) : (
          <Table<AttendanceOverrideLog>
            rowKey="id"
            pagination={false}
            dataSource={overrideHistory}
            columns={[
              {
                title: t('teacherAttendance.historyTime'),
                dataIndex: "created_at",
                key: "created_at",
                render: (value: string | undefined) =>
                  value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-",
              },
              {
                title: t('teacherAttendance.historyWho'),
                dataIndex: "changed_by_name",
                key: "changed_by_name",
                render: (value: string | null | undefined) => value || "-",
              },
              {
                title: t('teacherAttendance.historyStatus'),
                key: "status_change",
                render: (_: unknown, row: AttendanceOverrideLog) =>
                  `${row.previous_status || "-"} -> ${row.new_status}`,
              },
              {
                title: t('teacherAttendance.historyReason'),
                dataIndex: "reason",
                key: "reason",
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default TeacherAttendancePage;
