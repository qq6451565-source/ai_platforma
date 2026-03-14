import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import {
  fetchDirections,
  fetchSubjectsAdmin,
  fetchGroupsAdmin,
  fetchUsers,
  fetchLessonsAdmin,
  fetchTeacherSubjects,
  fetchLessonAttendance,
} from "../../api/admin";
import { markAttendance } from "../../api/attendance";

type AbsentLesson = {
  lessonId: number;
  topic: string;
  subject: string;
  group: string;
  startTime?: string;
  status: "present" | "absent";
  joinedRatio?: number;
  faceVerifiedRatio?: number;
  finalized?: boolean;
};

type StudentRow = {
  studentId: number;
  studentName: string;
  groupName: string;
  levelLabel: string;
  absentCount: number;
  absentLessons: AbsentLesson[];
};

const formatRatio = (value?: number | null) => (value == null ? "-" : `${Math.round(value * 100)}%`);

const AdminAttendancePage = () => {
  const qc = useQueryClient();
  const { data: directions, isLoading: loadingDirections } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });
  const { data: students } = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => fetchUsers("student"),
  });
  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: fetchLessonsAdmin,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["admin-teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });

  const [selectedDirection, setSelectedDirection] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  const groupMap = useMemo(() => new Map((groups || []).map((g) => [g.id, g])), [groups]);
  const lessonMap = useMemo(() => new Map((lessons || []).map((l) => [l.id, l])), [lessons]);

  const studentsForDirection = useMemo(() => {
    if (!selectedDirection) return students || [];
    return (students || []).filter((s) => {
      if (!s.group) return false;
      const grp = groupMap.get(s.group);
      return grp?.direction === selectedDirection.id;
    });
  }, [students, groupMap, selectedDirection]);

  const subjectCards = useMemo(() => {
    if (!selectedDirection) return [];
    return (subjects || [])
      .filter((s) => (s.directions || []).includes(selectedDirection.id))
      .map((s) => ({ id: s.id, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, selectedDirection]);

  const lessonSubjectMap = useMemo(() => {
    const map = new Map<number, number>();
    (teacherSubjects || []).forEach((ts) => {
      map.set(ts.id, ts.subject);
    });
    return map;
  }, [teacherSubjects]);

  const lessonsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    return (lessons || []).filter((lesson) => lessonSubjectMap.get(lesson.teacher_subject) === selectedSubject.id);
  }, [lessons, selectedSubject, lessonSubjectMap]);

  const lessonIds = useMemo(() => lessonsForSubject.map((lesson) => lesson.id), [lessonsForSubject]);

  const { data: attendanceRecords, isLoading: loadingAttendance } = useQuery({
    queryKey: ["admin-attendance", lessonIds.join(",")],
    queryFn: async () => {
      if (!lessonIds.length) return [];
      const results = await Promise.all(
        lessonIds.map((id) => fetchLessonAttendance(id).catch(() => []))
      );
      return results.flat();
    },
    enabled: lessonIds.length > 0,
  });

  const lessonGroupIds = useMemo(() => new Set(lessonsForSubject.map((l) => l.group).filter(Boolean)), [
    lessonsForSubject,
  ]);

  const studentsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    if (!lessonGroupIds.size) return studentsForDirection || [];
    return (studentsForDirection || []).filter((student) => student.group && lessonGroupIds.has(student.group));
  }, [studentsForDirection, lessonGroupIds, selectedSubject]);

  const relevantGroupIds = useMemo(() => {
    if (!selectedSubject) return new Set<number>();
    return new Set((studentsForSubject || []).filter((s) => s.group).map((s) => s.group as number));
  }, [studentsForSubject, selectedSubject]);

  const groupOptions = useMemo(() => {
    if (!selectedSubject) return [];
    return Array.from(relevantGroupIds)
      .map((id) => groupMap.get(id))
      .filter(Boolean)
      .map((g: any) => ({ value: g.id, label: g.name }));
  }, [relevantGroupIds, groupMap, selectedSubject]);

  const attendanceByStudent = useMemo(() => {
    const map = new Map<number, any[]>();
    (attendanceRecords || []).forEach((record) => {
      const list = map.get(record.student) || [];
      list.push(record);
      map.set(record.student, list);
    });
    return map;
  }, [attendanceRecords]);

  const filteredStudents = useMemo(() => {
    if (!selectedSubject) return [];
    const q = search.trim().toLowerCase();
    return (studentsForSubject || []).filter((student) => {
      const group = student?.group ? groupMap.get(student.group) : null;
      if (groupFilter && student?.group !== groupFilter) return false;
      if (q) {
        const name = `${student?.first_name || ""} ${student?.last_name || ""}`.trim().toLowerCase();
        const username = (student?.username || "").toLowerCase();
        const groupName = group?.name?.toLowerCase() || "";
        if (!name.includes(q) && !username.includes(q) && !groupName.includes(q)) return false;
      }
      return true;
    });
  }, [studentsForSubject, groupFilter, search, groupMap, selectedSubject]);

  const rows = useMemo<StudentRow[]>(() => {
    return (filteredStudents || []).map((student) => {
      const group = student.group ? groupMap.get(student.group) : null;
      const records = attendanceByStudent.get(student.id) || [];
      const absentLessons = records
        .filter((record) => record.status === "absent")
        .map((record) => {
          const lesson = lessonMap.get(record.lesson);
          return {
            lessonId: record.lesson,
            topic: lesson?.topic || `Dars #${record.lesson}`,
            subject: lesson?.subject_name || "-",
            group: lesson?.group_name || group?.name || "-",
            startTime: lesson?.start_time,
            status: record.status,
            joinedRatio: record.joined_ratio,
            faceVerifiedRatio: record.face_verified_ratio,
            finalized: record.finalized,
          };
        });

      return {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`.trim() || student.username,
        groupName: group?.name || "-",
        levelLabel: [group?.language, group?.level ? `${group.level}-bosqich` : null]
          .filter(Boolean)
          .join(" • ") || "-",
        absentCount: absentLessons.length,
        absentLessons,
      };
    });
  }, [filteredStudents, attendanceByStudent, lessonMap, groupMap]);

  useEffect(() => {
    if (!selectedStudent) return;
    const updated = rows.find((row) => row.studentId === selectedStudent.studentId);
    if (!updated) {
      setSelectedStudent(null);
    } else {
      setSelectedStudent(updated);
    }
  }, [rows, selectedStudent]);

  const markMut = useMutation({
    mutationFn: (payload: { student: number; lesson: number; status: "present" | "absent" }) =>
      markAttendance(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-attendance", lessonIds.join(",")] });
    },
  });

  const columns = [
    {
      title: "Talaba",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Guruh",
      dataIndex: "groupName",
      key: "groupName",
    },
    {
      title: "Davomat",
      key: "attendance",
      render: (_: unknown, row: StudentRow) => (
        <Button type="link" onClick={() => setSelectedStudent(row)}>
          {row.absentCount > 0 ? "Yoq" : "Bor"}
        </Button>
      ),
    },
    {
      title: "Davomat soni",
      dataIndex: "absentCount",
      key: "absentCount",
      render: (value: number) => <Tag color={value > 0 ? "red" : "green"}>{value}</Tag>,
    },
  ];

  return (
    <Card title="Davomat">
      {!selectedDirection ? (
        loadingDirections ? (
          <Empty description="Yuklanmoqda..." />
        ) : directions?.length ? (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {directions.map((dir) => (
              <Card key={dir.id} hoverable onClick={() => setSelectedDirection(dir)}>
                <Typography.Text strong>{dir.name}</Typography.Text>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="Yo'nalishlar yo'q" />
        )
      ) : !selectedSubject ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Button
              onClick={() => {
                setSelectedDirection(null);
                setSelectedSubject(null);
              }}
            >
              Orqaga
            </Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {selectedDirection.name}
            </Typography.Title>
          </div>
          {subjectCards.length ? (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {subjectCards.map((subject) => (
                <Card key={subject.id} hoverable onClick={() => setSelectedSubject(subject)}>
                  <Typography.Text strong>{subject.name}</Typography.Text>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="Fanlar yo'q" />
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Button onClick={() => setSelectedSubject(null)}>Orqaga</Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {selectedSubject.name}
            </Typography.Title>
          </div>

          <Space wrap style={{ marginBottom: 12 }}>
            <Select
              allowClear
              placeholder="Guruh"
              style={{ width: 200 }}
              value={groupFilter ?? undefined}
              onChange={(v) => setGroupFilter(v ?? null)}
              options={groupOptions}
            />
            <Input
              placeholder="Qidirish"
              style={{ width: 220 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Space>

          {loadingAttendance ? (
            <Empty description="Yuklanmoqda..." />
          ) : rows.length ? (
            <Table
              rowKey="studentId"
              columns={columns}
              dataSource={rows}
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty description="Ma'lumot yo'q" />
          )}
        </>
      )}

      <Modal
        title="Davomat tafsilotlari"
        open={!!selectedStudent}
        onCancel={() => setSelectedStudent(null)}
        footer={null}
      >
        {selectedStudent && selectedStudent.absentLessons.length === 0 ? (
          <Empty description="Qoldirilgan dars yo'q" />
        ) : (
          <Table
            rowKey={(row) => `${row.lessonId}-${row.status}`}
            pagination={false}
            dataSource={selectedStudent?.absentLessons || []}
            columns={[
              {
                title: "Dars",
                dataIndex: "topic",
                key: "topic",
              },
              {
                title: "Fan/Guruh",
                key: "subject",
                render: (_: unknown, row: AbsentLesson) => `${row.subject} • ${row.group}`,
              },
              {
                title: "Vaqt",
                dataIndex: "startTime",
                key: "startTime",
                render: (value: string | undefined) => (value ? new Date(value).toLocaleString() : "-"),
              },
              {
                title: "Holat",
                key: "status",
                render: (_: unknown, row: AbsentLesson) => (
                  <Select
                    value={row.status}
                    style={{ width: 110 }}
                    onChange={(value) =>
                      markMut.mutate({
                        lesson: row.lessonId,
                        student: selectedStudent!.studentId,
                        status: value,
                      })
                    }
                    options={[
                      { value: "present", label: "Bor" },
                      { value: "absent", label: "Yoq" },
                    ]}
                  />
                ),
              },
              {
                title: "Final",
                key: "finalized",
                render: (_: unknown, row: AbsentLesson) => (
                  <Tag color={row.finalized ? "green" : "gold"}>{row.finalized ? "Yakunlangan" : "Jarayonda"}</Tag>
                ),
              },
              {
                title: "Qatnashuv",
                key: "joinedRatio",
                render: (_: unknown, row: AbsentLesson) => formatRatio(row.joinedRatio),
              },
              {
                title: "Face ratio",
                key: "faceVerifiedRatio",
                render: (_: unknown, row: AbsentLesson) => formatRatio(row.faceVerifiedRatio),
              },
            ]}
          />
        )}
      </Modal>
    </Card>
  );
};

export default AdminAttendancePage;
