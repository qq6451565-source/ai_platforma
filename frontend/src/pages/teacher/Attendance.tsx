import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button, Card, Col, Empty, Input, Modal, Progress,
  Row, Select, Table, Tabs, Tag, Tooltip, Typography, message,
} from "antd";
import {
  BarChartOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { fetchLessons } from "../../api/lessons";
import { fetchTeacherStudents } from "../../api/user";
import {
  fetchAttendanceOverrideHistory,
  fetchLessonAttendance,
  fetchLessonActivityDetail,
  markAttendance,
  type AttendanceOverrideLog,
  type LessonActivityLog,
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

const formatRatio = (value?: number | null) =>
  value == null ? "-" : `${Math.round(value * 100)}%`;

// ── Activity Tab ──────────────────────────────────────────
const ACTIVITY_STATUS_CONFIG = {
  active: { color: "#52c41a", label: "Faol qatnashdi", tagColor: "success" as const },
  partial: { color: "#faad14", label: "Qisman qatnashdi", tagColor: "warning" as const },
  absent: { color: "#ff4d4f", label: "Qatnashmadi", tagColor: "error" as const },
};

const BoolCell = ({ value }: { value: boolean }) =>
  value ? (
    <CheckCircleFilled style={{ color: "#52c41a", fontSize: 16 }} />
  ) : (
    <CloseCircleFilled style={{ color: "#d9d9d9", fontSize: 16 }} />
  );

const ActivityTab = ({ lessonId }: { lessonId: number }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["lesson-activity", lessonId],
    queryFn: () => fetchLessonActivityDetail(lessonId),
    enabled: !!lessonId,
  });

  const columns = [
    {
      title: "Talaba",
      dataIndex: "student_name",
      key: "student_name",
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: "Sahifa",
      key: "lesson_opened",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) => <BoolCell value={r.lesson_opened} />,
    },
    {
      title: "Material",
      key: "material_viewed",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) => <BoolCell value={r.material_viewed} />,
    },
    {
      title: "Test",
      key: "test",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) =>
        r.test_attended ? (
          <Tag color={r.test_score >= 60 ? "green" : "orange"}>
            {Math.round(r.test_score)}%
          </Tag>
        ) : (
          <CloseCircleFilled style={{ color: "#d9d9d9", fontSize: 16 }} />
        ),
    },
    {
      title: "Topshiriq",
      key: "assignment",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) => <BoolCell value={r.assignment_submitted} />,
    },
    {
      title: "Ball",
      key: "total_score",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) => {
        const color =
          r.total_score >= 70 ? "#52c41a" : r.total_score >= 40 ? "#faad14" : "#ff4d4f";
        return (
          <Tooltip title={`${r.total_score}/100`}>
            <Progress
              percent={Math.round(r.total_score)}
              size="small"
              strokeColor={color}
              style={{ minWidth: 80 }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Holat",
      key: "status",
      render: (_: unknown, r: LessonActivityLog) => {
        const cfg = ACTIVITY_STATUS_CONFIG[r.status] || ACTIVITY_STATUS_CONFIG.absent;
        return <Tag color={cfg.tagColor}>{cfg.label}</Tag>;
      },
    },
  ];

  if (isLoading) return <Empty description="Yuklanmoqda..." />;
  if (!data) return <Empty description="Ma'lumot topilmadi" />;

  const { summary, records } = data;

  return (
    <div>
      {/* Statistika */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: "Jami", value: summary.total, color: "#1677ff", icon: "👥" },
          { label: "Faol", value: summary.active, color: "#52c41a", icon: "✅" },
          { label: "Qisman", value: summary.partial, color: "#faad14", icon: "⚠️" },
          { label: "Qatnashmadi", value: summary.absent, color: "#ff4d4f", icon: "❌" },
        ].map((s) => (
          <Col xs={12} sm={6} key={s.label}>
            <Card
              style={{
                borderRadius: 10,
                textAlign: "center",
                border: `1.5px solid ${s.color}33`,
                background: `linear-gradient(135deg,#fff,${s.color}11)`,
              }}
              bodyStyle={{ padding: "12px 8px" }}
            >
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {s.label}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      {records.length ? (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 700 }}
          size="small"
        />
      ) : (
        <Empty description="Bu darsda hali faoliyat qayd etilmagan" />
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────
const TeacherAttendancePage = () => {
  usePageTitle("nav.attendance");
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
  const [activeTab, setActiveTab] = useState("live");

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
    return (lessons || []).filter(
      (lesson: LessonItem) => lesson.subject_name === selectedSubject
    );
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
    queryFn: () =>
      fetchAttendanceOverrideHistory(historyTarget!.lesson, historyTarget!.student),
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
    mutationFn: (payload: {
      student: number;
      lesson: number;
      status: "present" | "absent";
      reason: string;
    }) => markAttendance(payload),
    onSuccess: async () => {
      message.success(t("teacherAttendance.overrideSuccess"));
      setOverrideDraft(null);
      setOverrideReason("");
      await qc.invalidateQueries({ queryKey: ["teacher-attendance", selectedLessonId] });
      await qc.invalidateQueries({ queryKey: ["attendance-override-history"] });
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.reason?.[0] ||
        error?.response?.data?.detail ||
        t("teacherAttendance.overrideError")
      );
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
      message.warning(t("teacherAttendance.overrideMinReason"));
      return;
    }
    markMut.mutate({ ...overrideDraft, reason });
  };

  const liveColumns = [
    { title: t("teacherAttendance.student"), dataIndex: "name", key: "name" },
    { title: t("teacherAttendance.group"), dataIndex: "groupName", key: "groupName" },
    {
      title: t("teacherAttendance.attendance"),
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
            { value: "present", label: t("teacherAttendance.present") },
            { value: "absent", label: t("teacherAttendance.absent") },
          ]}
        />
      ),
    },
    {
      title: t("teacherAttendance.lastMarked"),
      key: "timestamp",
      render: (_: unknown, row: StudentRow) =>
        row.timestamp ? dayjs(row.timestamp).format("DD.MM.YYYY HH:mm") : "-",
    },
    {
      title: t("teacherAttendance.override"),
      key: "override",
      render: (_: unknown, row: StudentRow) =>
        row.manualOverride ? (
          <Tag
            color="blue"
            title={`${row.overrideReason || t("teacherAttendance.noReason")}${row.overriddenByName ? ` | ${row.overriddenByName}` : ""
              }${row.overriddenAt ? ` | ${dayjs(row.overriddenAt).format("DD.MM.YYYY HH:mm")}` : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() =>
              selectedLessonId &&
              setHistoryTarget({ lesson: selectedLessonId, student: row.id, studentName: row.name })
            }
          >
            {t("teacherAttendance.manual")}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: t("teacherAttendance.final"),
      key: "finalized",
      render: (_: unknown, row: StudentRow) => (
        <Tag color={row.finalized ? "green" : "gold"}>
          {row.finalized ? t("teacherAttendance.finalized") : t("teacherAttendance.inProgress")}
        </Tag>
      ),
    },
    {
      title: t("teacherAttendance.participation"),
      key: "joinedRatio",
      render: (_: unknown, row: StudentRow) => formatRatio(row.joinedRatio),
    },
    {
      title: t("teacherAttendance.faceRatio"),
      key: "faceVerifiedRatio",
      render: (_: unknown, row: StudentRow) => formatRatio(row.faceVerifiedRatio),
    },
  ];

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">
        {t("nav.attendance")}
      </Typography.Title>

      {!selectedSubject ? (
        loadingLessons ? (
          <Empty description="Yuklanmoqda..." />
        ) : subjectCards.length ? (
          <div className="card-grid">
            {subjectCards.map((subject) => (
              <Card
                key={subject.name}
                hoverable
                onClick={() => setSelectedSubject(subject.name)}
              >
                <Typography.Text strong>{subject.name}</Typography.Text>
                <div style={{ marginTop: "var(--space-1-5)", color: "var(--color-text-muted)" }}>
                  {t("teacherAttendance.lessonsCount", { count: subject.count })}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description={t("teacherAttendance.noSubjects")} />
        )
      ) : (
        <>
          <div className="page-header-row">
            <Button
              onClick={() => {
                setSelectedSubject(null);
                setSelectedLessonId(null);
                setSearch("");
                setActiveTab("live");
              }}
            >
              {t("common.back")}
            </Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          <div className="filters-row" style={{ marginBottom: 16 }}>
            <Select
              placeholder={t("teacherAttendance.selectLesson")}
              style={{ flex: "1 1 240px", minWidth: 0 }}
              value={selectedLessonId ?? undefined}
              onChange={(value) => setSelectedLessonId(value)}
              options={subjectLessons.map((lesson: LessonItem) => ({
                value: lesson.id,
                label: `${lesson.topic || t("teacherAttendance.lesson")} | ${lesson.group_name || t("teacherAttendance.group")
                  } | ${dayjs(lesson.start_time).format("DD.MM HH:mm")}`,
              }))}
            />
            <Input
              placeholder={t("teacherAttendance.searchStudent")}
              style={{ flex: "1 1 160px", minWidth: 0 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {selectedLesson ? (
              <Tag color="blue">{selectedLesson.group_name || t("teacherAttendance.group")}</Tag>
            ) : null}
          </div>

          {!selectedLessonId ? (
            <Empty description={t("teacherAttendance.selectLessonPrompt")} />
          ) : (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "live",
                  label: (
                    <span>
                      <TeamOutlined /> Live davomat
                    </span>
                  ),
                  children: loadingAttendance ? (
                    <Empty description={t("teacherAttendance.loadingAttendance")} />
                  ) : rows.length ? (
                    <div className="table-scroll">
                      <Table
                        rowKey="id"
                        columns={liveColumns}
                        dataSource={rows}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 1080 }}
                        size="small"
                      />
                    </div>
                  ) : (
                    <Empty description={t("teacherAttendance.noStudents")} />
                  ),
                },
                {
                  key: "activity",
                  label: (
                    <span>
                      <BarChartOutlined /> Dars faoliyati hisoboti
                    </span>
                  ),
                  children: <ActivityTab lessonId={selectedLessonId} />,
                },
              ]}
            />
          )}
        </>
      )}

      {/* Override modal */}
      <Modal
        title={t("teacherAttendance.overrideTitle")}
        open={!!overrideDraft}
        onCancel={() => {
          if (markMut.isPending) return;
          setOverrideDraft(null);
          setOverrideReason("");
        }}
        onOk={submitOverride}
        okText={t("common.save")}
        confirmLoading={markMut.isPending}
      >
        <Typography.Paragraph style={{ marginBottom: "var(--space-3)" }}>
          {overrideDraft?.studentName}{" "}
          <strong>
            {overrideDraft?.status === "present"
              ? t("teacherAttendance.present")
              : t("teacherAttendance.absent")}
          </strong>{" "}
          {t("teacherAttendance.overrideSet")}
        </Typography.Paragraph>
        <Input.TextArea
          rows={4}
          value={overrideReason}
          onChange={(event) => setOverrideReason(event.target.value)}
          placeholder={t("teacherAttendance.overrideReason")}
          maxLength={500}
        />
      </Modal>

      {/* History modal */}
      <Modal
        title={`${t("teacherAttendance.historyTitle")}${historyTarget ? `: ${historyTarget.studentName}` : ""
          }`}
        open={!!historyTarget}
        onCancel={() => setHistoryTarget(null)}
        footer={null}
        width="min(760px, calc(100vw - 32px))"
      >
        {loadingOverrideHistory ? (
          <Empty description={t("common.loading")} />
        ) : !overrideHistory?.length ? (
          <Empty description={t("teacherAttendance.historyNoRecords")} />
        ) : (
          <Table<AttendanceOverrideLog>
            rowKey="id"
            pagination={false}
            dataSource={overrideHistory}
            columns={[
              {
                title: t("teacherAttendance.historyTime"),
                dataIndex: "created_at",
                key: "created_at",
                render: (value: string | undefined) =>
                  value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-",
              },
              {
                title: t("teacherAttendance.historyWho"),
                dataIndex: "changed_by_name",
                key: "changed_by_name",
                render: (value: string | null | undefined) => value || "-",
              },
              {
                title: t("teacherAttendance.historyStatus"),
                key: "status_change",
                render: (_: unknown, row: AttendanceOverrideLog) =>
                  `${row.previous_status || "-"} → ${row.new_status}`,
              },
              {
                title: t("teacherAttendance.historyReason"),
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
