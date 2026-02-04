import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Input, Select, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { fetchLessons } from "../../api/lessons";
import { fetchTeacherStudents } from "../../api/user";
import { fetchLessonAttendance, markAttendance } from "../../api/attendance";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import { fetchSubjects } from "../../api/subjects";

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
};

const TeacherAttendancePage = () => {
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

  const attendanceMap = useMemo(() => {
    const map = new Map<number, { status: "present" | "absent"; timestamp?: string }>();
    (attendanceRecords || []).forEach((rec) => {
      map.set(rec.student, { status: rec.status, timestamp: rec.timestamp });
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
        };
      });
  }, [studentsForLesson, attendanceMap, search, selectedLesson]);

  const markMut = useMutation({
    mutationFn: (payload: { student: number; lesson: number; status: "present" | "absent" }) =>
      markAttendance(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["teacher-attendance", selectedLessonId] });
    },
  });

  const columns = [
    {
      title: "Talaba",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Guruh",
      dataIndex: "groupName",
      key: "groupName",
    },
    {
      title: "Davomat",
      key: "status",
      render: (_: unknown, row: StudentRow) => (
        <Select
          value={row.status}
          style={{ width: 120 }}
          onChange={(value) => {
            if (!selectedLessonId) return;
            markMut.mutate({
              lesson: selectedLessonId,
              student: row.id,
              status: value,
            });
          }}
          options={[
            { value: "present", label: "Bor" },
            { value: "absent", label: "Yoq" },
          ]}
        />
      ),
    },
    {
      title: "Oxirgi belgilash",
      key: "timestamp",
      render: (_: unknown, row: StudentRow) =>
        row.timestamp ? dayjs(row.timestamp).format("DD.MM.YYYY HH:mm") : "-",
    },
  ];

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Davomat</Typography.Title>

      {!selectedSubject ? (
        loadingLessons ? (
          <Empty description="Yuklanmoqda..." />
        ) : subjectCards.length ? (
          <div className="card-grid">
            {subjectCards.map((subject) => (
              <Card key={subject.name} hoverable onClick={() => setSelectedSubject(subject.name)}>
                <Typography.Text strong>{subject.name}</Typography.Text>
                <div style={{ marginTop: 6, color: "#94a3b8" }}>{subject.count} ta dars</div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="Fanlar topilmadi" />
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
              Orqaga
            </Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          <div className="filters-row">
            <Select
              placeholder="Darsni tanlang"
              style={{ minWidth: 280 }}
              value={selectedLessonId ?? undefined}
              onChange={(value) => setSelectedLessonId(value)}
              options={subjectLessons.map((lesson: LessonItem) => ({
                value: lesson.id,
                label: `${lesson.topic || "Dars"} | ${lesson.group_name || "Guruh"} | ${dayjs(
                  lesson.start_time
                ).format("DD.MM HH:mm")}`,
              }))}
            />
            <Input
              placeholder="Talaba qidirish"
              style={{ width: 220 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {selectedLesson ? (
              <Tag color="blue">{selectedLesson.group_name || "Guruh"}</Tag>
            ) : null}
          </div>

          {!selectedLessonId ? (
            <Empty description="Dars tanlang" />
          ) : loadingAttendance ? (
            <Empty description="Davomat yuklanmoqda..." />
          ) : rows.length ? (
            <div className="table-scroll">
              <Table rowKey="id" columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 720 }} size="small" />
            </div>
          ) : (
            <Empty description="Talabalar topilmadi" />
          )}
        </>
      )}
    </div>
  );
};

export default TeacherAttendancePage;
