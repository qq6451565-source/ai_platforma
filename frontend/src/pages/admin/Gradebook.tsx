import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Card,
  Select,
  InputNumber,
  Button,
  List,
  Table,
  Empty,
  Modal,
  message,
  Typography,
  Input,
  Space,
  Skeleton,
  Divider,
} from "antd";
import dayjs from "dayjs";
import { gradeSubmission } from "../../api/submissions";
import { updateStudentTestRecord } from "../../api/studentTests";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminGradebookPage = () => {
  const qc = useQueryClient();
  const { data: entries, isLoading } = useQuery(adminQueryOptions.gradebook());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: directions, isLoading: directionsLoading } = useQuery(adminQueryOptions.directions());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: students } = useQuery(adminQueryOptions.students());
  const { data: teacherSubjects } = useQuery(adminQueryOptions.teacherSubjects());
  const { data: submissions } = useQuery(adminQueryOptions.submissions());
  const { data: testResults } = useQuery(adminQueryOptions.studentTests());

  const [selectedDirection, setSelectedDirection] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [editStudent, setEditStudent] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<"assignment" | "test" | null>(null);
  const [detailScore, setDetailScore] = useState<number | null>(null);
  const [detailComment, setDetailComment] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);

  const groupMap = useMemo(() => new Map((groups || []).map((g) => [g.id, g])), [groups]);

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

  const subjectEntries = useMemo(() => {
    if (!selectedSubject) return [];
    return (entries || []).filter((e) => e.subject === selectedSubject.id);
  }, [entries, selectedSubject]);

  const entryMap = useMemo(
    () => new Map(subjectEntries.map((entry) => [entry.student, entry])),
    [subjectEntries]
  );

  const subjectKey = useMemo(
    () => (selectedSubject?.name || "").trim().toLowerCase(),
    [selectedSubject]
  );

  const submissionsForSubject = useMemo(() => {
    if (!selectedSubject || !subjectKey) return [];
    return (submissions || []).filter(
      (sub) => (sub.subject_name || "").trim().toLowerCase() === subjectKey
    );
  }, [submissions, selectedSubject, subjectKey]);

  const testsForSubject = useMemo(() => {
    if (!selectedSubject || !subjectKey) return [];
    return (testResults || []).filter((t) => {
      const sameSubject = (t.subject_name || "").trim().toLowerCase() === subjectKey;
      return sameSubject && t.is_finished;
    });
  }, [testResults, selectedSubject, subjectKey]);

  const submissionsByStudent = useMemo(() => {
    const map = new Map<number, any[]>();
    submissionsForSubject.forEach((sub) => {
      if (!sub.student) return;
      const list = map.get(sub.student) || [];
      list.push(sub);
      map.set(sub.student, list);
    });
    return map;
  }, [submissionsForSubject]);

  const testsByStudent = useMemo(() => {
    const map = new Map<number, any[]>();
    testsForSubject.forEach((t) => {
      if (!t.student) return;
      const list = map.get(t.student) || [];
      list.push(t);
      map.set(t.student, list);
    });
    return map;
  }, [testsForSubject]);

  const subjectGroupIds = useMemo(() => {
    if (!selectedSubject) return new Set<number>();
    return new Set(
      (teacherSubjects || [])
        .filter((ts) => ts.subject === selectedSubject.id)
        .flatMap((ts) => ts.groups || [])
    );
  }, [teacherSubjects, selectedSubject]);

  const studentsForSubject = useMemo(() => {
    if (!selectedSubject) return [];
    if (!subjectGroupIds.size) return studentsForDirection || [];
    return (studentsForDirection || []).filter(
      (student) => student.group && subjectGroupIds.has(student.group)
    );
  }, [studentsForDirection, subjectGroupIds, selectedSubject]);

  const relevantGroupIds = useMemo(() => {
    if (!selectedSubject) return new Set<number>();
    return new Set(
      (studentsForSubject || [])
        .filter((s) => s.group)
        .map((s) => s.group as number)
    );
  }, [studentsForSubject, selectedSubject]);

  const filteredStudents = useMemo(() => {
    if (!selectedSubject) return [];
    const q = search.trim().toLowerCase();
    return (studentsForSubject || []).filter((student) => {
      const group = student?.group ? groupMap.get(student.group) : null;
      if (groupFilter && student?.group !== groupFilter) return false;
      if (languageFilter && group?.language !== languageFilter) return false;
      if (levelFilter && group?.level !== levelFilter) return false;
      if (q) {
        const name = `${student?.first_name || ""} ${student?.last_name || ""}`.trim().toLowerCase();
        const username = (student?.username || "").toLowerCase();
        const groupName = group?.name?.toLowerCase() || "";
        if (!name.includes(q) && !username.includes(q) && !groupName.includes(q)) return false;
      }
      return true;
    });
  }, [
    studentsForSubject,
    groupFilter,
    languageFilter,
    levelFilter,
    search,
    groupMap,
    selectedSubject,
  ]);

  const currentSubmissions = useMemo(() => {
    if (!editStudent) return [];
    return submissionsByStudent.get(editStudent.id) || [];
  }, [editStudent, submissionsByStudent]);

  const currentTests = useMemo(() => {
    if (!editStudent) return [];
    return testsByStudent.get(editStudent.id) || [];
  }, [editStudent, testsByStudent]);

  const lessonBuckets = useMemo(() => {
    const map = new Map<string, { lesson: string; submissions: any[]; tests: any[] }>();
    const addBucket = (lesson: string) => {
      if (!map.has(lesson)) {
        map.set(lesson, { lesson, submissions: [], tests: [] });
      }
      return map.get(lesson)!;
    };

    (currentSubmissions || []).forEach((item) => {
      const lesson = item.lesson_topic || "Dars";
      addBucket(lesson).submissions.push(item);
    });
    (currentTests || []).forEach((item) => {
      const lesson = item.lesson_topic || "Dars";
      addBucket(lesson).tests.push(item);
    });

    return Array.from(map.values()).sort((a, b) => a.lesson.localeCompare(b.lesson));
  }, [currentSubmissions, currentTests]);

  const formatDate = (value?: string) => (value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-");
  const getTestTotal = (item: any) => {
    const raw = item?.test_total_score ?? item?.total_score ?? 0;
    const total = Number(raw);
    return Number.isFinite(total) ? total : 0;
  };
  const getTestScore = (item: any) => {
    const percent = Number(item?.score_percent);
    if (!Number.isFinite(percent)) return null;
    const total = getTestTotal(item);
    if (!total) return percent;
    return (percent / 100) * total;
  };
  const formatScore = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  };

  const openDetail = (item: any, type: "assignment" | "test") => {
    setDetailItem(item);
    setDetailType(type);
    setDetailOpen(true);
    if (type === "assignment") {
      setDetailScore(typeof item.grade === "number" ? item.grade : 0);
      setDetailComment(item.teacher_comment || "");
    } else {
      const score = getTestScore(item);
      setDetailScore(typeof score === "number" ? score : 0);
      setDetailComment("");
    }
  };
  const saveDetail = async () => {
    if (!detailItem || !detailType) return;
    setDetailSaving(true);
    try {
      if (detailType === "assignment") {
        await gradeSubmission(detailItem.id, {
          grade: typeof detailScore === "number" ? detailScore : 0,
          teacher_comment: detailComment || undefined,
        });
        await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.submissions });
      } else {
        const total = getTestTotal(detailItem);
        const scoreValue = typeof detailScore === "number" ? detailScore : 0;
        const percent = total > 0 ? (scoreValue / total) * 100 : scoreValue;
        await updateStudentTestRecord(detailItem.id, {
          score_percent: Number.isFinite(percent) ? Number(percent.toFixed(2)) : 0,
        });
        await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentTests });
      }
      message.success("Yangilandi");
      setDetailOpen(false);
      setDetailItem(null);
      setDetailType(null);
    } catch (err) {
      message.error("Xatolik");
    } finally {
      setDetailSaving(false);
    }
  };

  const groupOptions = useMemo(() => {
    if (!selectedSubject) return [];
    return Array.from(relevantGroupIds)
      .map((id) => groupMap.get(id))
      .filter(Boolean)
      .map((g: any) => ({ value: g.id, label: g.name }));
  }, [relevantGroupIds, groupMap, selectedSubject]);

  const openEdit = (student: any) => {
    setEditStudent(student);
  };

  const tableData = useMemo(() => {
    return (filteredStudents || []).map((student) => {
      const entry = entryMap.get(student.id);
      const group = student?.group ? groupMap.get(student.group) : null;
      const studentSubmissions = submissionsByStudent.get(student.id) || [];
      const studentTests = testsByStudent.get(student.id) || [];
      const assignmentTotal = studentSubmissions.reduce((sum, sub) => {
        return typeof sub.grade === "number" ? sum + sub.grade : sum;
      }, 0);
      const testTotal = studentTests.reduce((sum, t) => {
        const score = getTestScore(t);
        return typeof score === "number" ? sum + score : sum;
      }, 0);
      const assignmentScore = studentSubmissions.length ? assignmentTotal : entry?.assignment_score ?? 0;
      const testScore = studentTests.length ? testTotal : entry?.midterm_score ?? 0;
      return {
        key: student.id,
        student,
        student_name:
          `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
          student?.username ||
          `#${student.id}`,
        group_name: group?.name || "-",
        assignment_score: assignmentScore,
        midterm_score: testScore,
        assignment_count: studentSubmissions.length,
        test_count: studentTests.length,
      };
    });
  }, [filteredStudents, entryMap, groupMap, submissionsByStudent, testsByStudent]);

  const tableColumns = useMemo(
    () => [
      { title: "Talaba", dataIndex: "student_name", key: "student_name" },
      { title: "Guruh", dataIndex: "group_name", key: "group_name" },
      {
        title: "Topshiriq",
        dataIndex: "assignment_score",
        key: "assignment_score",
        render: (_: any, record: any) =>
          record.assignment_count
            ? `${record.assignment_score} (${record.assignment_count})`
            : record.assignment_score,
      },
      {
        title: "Test",
        dataIndex: "midterm_score",
        key: "midterm_score",
        render: (_: any, record: any) =>
          record.test_count ? `${record.midterm_score} (${record.test_count})` : record.midterm_score,
      },
    ],
    []
  );

  return (
    <Card title="Baholar" style={{ marginBottom: 16 }}>
      {!selectedDirection ? (
        directionsLoading ? (
          <Skeleton active />
        ) : directions?.length ? (
          <List
            grid={{ gutter: 12, column: 3 }}
            dataSource={directions}
            renderItem={(dir) => (
              <List.Item>
                <Card hoverable onClick={() => setSelectedDirection(dir)}>
                  <Typography.Text strong>{dir.name}</Typography.Text>
                  <div style={{ marginTop: 6, color: "#94a3b8" }}>
                    {dir.language?.toUpperCase() || "LANG"} - {dir.degree || "bachelor"}
                  </div>
                </Card>
              </List.Item>
            )}
          />
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
            <List
              grid={{ gutter: 12, column: 3 }}
              dataSource={subjectCards}
              renderItem={(subject) => (
                <List.Item>
                  <Card hoverable onClick={() => setSelectedSubject(subject)}>
                    <Typography.Text strong>{subject.name}</Typography.Text>
                  </Card>
                </List.Item>
              )}
            />
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
            <Select
              allowClear
              placeholder="Til"
              style={{ width: 140 }}
              value={languageFilter ?? undefined}
              onChange={(v) => setLanguageFilter(v ?? null)}
              options={[
                { value: "uz", label: "UZ" },
                { value: "ru", label: "RU" },
                { value: "en", label: "EN" },
              ]}
            />
            <Select
              allowClear
              placeholder="Bosqich"
              style={{ width: 140 }}
              value={levelFilter ?? undefined}
              onChange={(v) => setLevelFilter(v ?? null)}
              options={Array.from({ length: 10 }).map((_, idx) => ({
                value: idx + 1,
                label: `${idx + 1}-bosqich`,
              }))}
            />
            <Input
              placeholder="Qidirish"
              style={{ width: 220 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Space>

          {isLoading ? (
            <Skeleton active />
          ) : filteredStudents.length ? (
            <Table
              columns={tableColumns}
              dataSource={tableData}
              pagination={{ pageSize: 10 }}
              rowKey="key"
              onRow={(record) => ({
                onClick: () => openEdit(record.student),
                className: "clickable-row",
              })}
            />
          ) : (
            <Empty description="Ma'lumot yo'q" />
          )}
        </>
      )}

      <Modal
        title="Talaba baholari"
        open={!!editStudent}
        onCancel={() => {
          setEditStudent(null);
        }}
        footer={null}
      >
        {editStudent ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text type="secondary">Talaba</Typography.Text>
              <div style={{ fontWeight: 600 }}>
                {`${editStudent.first_name || ""} ${editStudent.last_name || ""}`.trim() ||
                  editStudent.username ||
                  `#${editStudent.id}`}
              </div>
            </div>
            <Divider orientation="left">Darslar bo'yicha</Divider>
            {lessonBuckets.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {lessonBuckets.map((bucket) => (
                  <Card key={bucket.lesson} size="small" title={bucket.lesson}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <Typography.Text type="secondary">Topshiriqlar</Typography.Text>
                        {bucket.submissions.length ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            {bucket.submissions.map((item: any) => (
                              <Card
                                key={item.id}
                                size="small"
                                title={item.assignment_title || "Topshiriq"}
                                hoverable
                                onClick={() => openDetail(item, "assignment")}
                              >
                                <div style={{ marginTop: 6, fontWeight: 600 }}>
                                  {typeof item.grade === "number" ? `Ball: ${item.grade}` : "Baholanmagan"}
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Topshiriq yo'q" />
                        )}
                      </div>
                      <div>
                        <Typography.Text type="secondary">Testlar</Typography.Text>
                        {bucket.tests.length ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            {bucket.tests.map((item: any) => (
                              <Card
                                key={item.id}
                                size="small"
                                title={item.test_title || "Test"}
                                hoverable
                                onClick={() => openDetail(item, "test")}
                              >
                                <div style={{ marginTop: 6, fontWeight: 600 }}>
                                  Ball: {formatScore(getTestScore(item))} / {formatScore(getTestTotal(item))}
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Test yo'q" />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty description="Darslar bo'yicha ma'lumot yo'q" />
            )}
          </>
        ) : null}
      </Modal>

      <Modal
        title={detailType === "assignment" ? "Topshiriq tafsilotlari" : "Test tafsilotlari"}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailType(null);
        }}
        footer={null}
      >
        {detailItem ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <Typography.Text type="secondary">Sarlavha</Typography.Text>
              <div style={{ fontWeight: 600 }}>
                {detailType === "assignment"
                  ? detailItem.assignment_title || "Topshiriq"
                  : detailItem.test_title || "Test"}
              </div>
            </div>
            <div>
              <Typography.Text type="secondary">Dars</Typography.Text>
              <div>{detailItem.lesson_topic || "Dars"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Fan</Typography.Text>
              <div>{detailItem.subject_name || "-"}</div>
            </div>
            <div>
              <Typography.Text type="secondary">Guruh</Typography.Text>
              <div>{detailItem.group_name || "-"}</div>
            </div>
            {detailType === "assignment" ? (
              <>
                <div>
                  <Typography.Text type="secondary">Topshirilgan vaqt</Typography.Text>
                  <div>{formatDate(detailItem.submitted_at)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Baho</Typography.Text>
                  <div>{typeof detailItem.grade === "number" ? detailItem.grade : "Baholanmagan"}</div>
                </div>
                {detailItem.comment ? (
                  <div>
                    <Typography.Text type="secondary">Izoh</Typography.Text>
                    <div>{detailItem.comment}</div>
                  </div>
                ) : null}
                {detailItem.teacher_comment ? (
                  <div>
                    <Typography.Text type="secondary">O'qituvchi izohi</Typography.Text>
                    <div>{detailItem.teacher_comment}</div>
                  </div>
                ) : null}
                {detailItem.file ? (
                  <div>
                    <Typography.Text type="secondary">Fayl</Typography.Text>
                    <div>
                      <a href={detailItem.file} target="_blank" rel="noreferrer">
                        Yuklab olish
                      </a>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div>
                  <Typography.Text type="secondary">Boshlagan vaqt</Typography.Text>
                  <div>{formatDate(detailItem.started_at)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Yakunlangan vaqt</Typography.Text>
                  <div>{formatDate(detailItem.finished_at)}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">Ball</Typography.Text>
                  <div>
                    {formatScore(getTestScore(detailItem))} / {formatScore(getTestTotal(detailItem))}
                  </div>
                </div>
              </>
            )}
            <Divider orientation="left">Tahrirlash</Divider>
            <div style={{ display: "grid", gap: 8 }}>
              <InputNumber
                min={0}
                max={
                  detailType === "test" && detailItem
                    ? getTestTotal(detailItem) || 100
                    : 100
                }
                step={0.1}
                style={{ width: "100%" }}
                value={detailScore ?? undefined}
                onChange={(val) => setDetailScore(typeof val === "number" ? val : null)}
                placeholder={detailType === "assignment" ? "Ball" : "Natija (%)"}
              />
              {detailType === "assignment" ? (
                <Input.TextArea
                  rows={3}
                  value={detailComment}
                  onChange={(e) => setDetailComment(e.target.value)}
                  placeholder="O'qituvchi izohi"
                />
              ) : null}
              <Button type="primary" loading={detailSaving} onClick={saveDetail}>
                Saqlash
              </Button>
            </div>
          </div>
        ) : (
          <Empty description="Ma'lumot yo'q" />
        )}
      </Modal>
    </Card>
  );
};

export default AdminGradebookPage;
