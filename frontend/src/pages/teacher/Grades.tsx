import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Card,
  List,
  Table,
  Typography,
  Button,
  Select,
  Input,
  Space,
  Empty,
  Skeleton,
  Modal,
  InputNumber,
  message,
  Divider,
} from "antd";
import dayjs from "dayjs";
import { fetchGradebook } from "../../api/gradebook";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import { fetchSubjects } from "../../api/subjects";
import { fetchGroups } from "../../api/groups";
import { fetchTeacherStudents } from "../../api/user";
import { fetchMySubmissions, gradeSubmission } from "../../api/submissions";
import { fetchStudentTestRecords, updateStudentTestRecord } from "../../api/studentTests";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTranslation } from "react-i18next";

const TeacherGradesPage = () => {
  usePageTitle('nav.grades');
  const { t } = useTranslation();
  const qc = useQueryClient();
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

  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const { data: students } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: fetchTeacherStudents,
  });
  const { data: entries, isLoading } = useQuery({
    queryKey: ["teacher-gradebook"],
    queryFn: fetchGradebook,
  });
  const { data: submissions } = useQuery({
    queryKey: ["teacher-submissions"],
    queryFn: fetchMySubmissions,
  });
  const { data: testResults } = useQuery({
    queryKey: ["teacher-student-tests"],
    queryFn: fetchStudentTestRecords,
  });

  const groupMap = useMemo(() => new Map((groups || []).map((g) => [g.id, g])), [groups]);

  const subjectCards = useMemo(() => {
    const ids = new Set((teacherSubjects || []).map((ts) => ts.subject));
    return (subjects || [])
      .filter((s) => ids.has(s.id))
      .map((s) => ({ id: s.id, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherSubjects, subjects]);

  const entryMap = useMemo(() => {
    if (!selectedSubject) return new Map<number, any>();
    const subjectEntries = (entries || []).filter((e) => e.subject === selectedSubject.id);
    return new Map(subjectEntries.map((entry) => [entry.student, entry]));
  }, [entries, selectedSubject]);

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
    if (!subjectGroupIds.size) return students || [];
    return (students || []).filter(
      (student) => student.group && subjectGroupIds.has(student.group)
    );
  }, [students, subjectGroupIds, selectedSubject]);

  const filteredStudents = useMemo(() => {
    if (!selectedSubject) return [];
    const q = search.trim().toLowerCase();
    return (studentsForSubject || []).filter((student) => {
      const group = student.group ? groupMap.get(student.group) : null;
      if (groupFilter && student.group !== groupFilter) return false;
      if (languageFilter && group?.language !== languageFilter) return false;
      if (levelFilter && group?.level !== levelFilter) return false;
      if (q) {
        const name = `${student.first_name} ${student.last_name}`.trim().toLowerCase();
        const username = (student.username || "").toLowerCase();
        const groupName = group?.name?.toLowerCase() || "";
        if (!name.includes(q) && !username.includes(q) && !groupName.includes(q)) return false;
      }
      return true;
    });
  }, [studentsForSubject, groupFilter, languageFilter, levelFilter, search, groupMap, selectedSubject]);

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
        await qc.invalidateQueries({ queryKey: ["teacher-submissions"] });
      } else {
        const total = getTestTotal(detailItem);
        const scoreValue = typeof detailScore === "number" ? detailScore : 0;
        const percent = total > 0 ? (scoreValue / total) * 100 : scoreValue;
        await updateStudentTestRecord(detailItem.id, {
          score_percent: Number.isFinite(percent) ? Number(percent.toFixed(2)) : 0,
        });
        await qc.invalidateQueries({ queryKey: ["teacher-student-tests"] });
      }
      message.success(t('common.updated'));
      setDetailOpen(false);
      setDetailItem(null);
      setDetailType(null);
    } catch (err) {
      message.error(t('common.error'));
    } finally {
      setDetailSaving(false);
    }
  };

  const groupOptions = useMemo(() => {
    if (!selectedSubject) return [];
    const ids = new Set(
      (studentsForSubject || [])
        .filter((s) => s.group)
        .map((s) => s.group as number)
    );
    return Array.from(ids)
      .map((id) => groupMap.get(id))
      .filter(Boolean)
      .map((g: any) => ({ value: g.id, label: g.name }));
  }, [studentsForSubject, groupMap, selectedSubject]);

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
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('nav.grades')}</Typography.Title>
      <Card title={t('nav.grades')} style={{ marginBottom: 'var(--space-4)' }}>
      {!selectedSubject ? (
        subjectCards.length ? (
          <List
            grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
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
        )
      ) : (
        <>
          <div className="page-header-row">
            <Button onClick={() => setSelectedSubject(null)}>Orqaga</Button>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {selectedSubject.name}
            </Typography.Title>
          </div>
          <Space wrap className="filters-row">
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
            <div className="table-scroll">
              <Table
                columns={tableColumns}
                dataSource={tableData}
                pagination={{ pageSize: 10 }}
                rowKey="key"
                scroll={{ x: 720 }}
                size="small"
                onRow={(record) => ({
                  onClick: () => openEdit(record.student),
                  className: "clickable-row",
                })}
              />
            </div>
          ) : (
            <Empty description={t('common.noData')} />
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
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <Typography.Text type="secondary">Talaba</Typography.Text>
              <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {`${editStudent?.first_name || ""} ${editStudent?.last_name || ""}`.trim() ||
                  editStudent?.username ||
                  `#${editStudent?.id}`}
              </div>
            </div>
            <Divider orientation="left">Darslar bo'yicha</Divider>
            {lessonBuckets.length ? (
              <div style={{ display: "grid", gap: 'var(--space-3)' }}>
                {lessonBuckets.map((bucket) => (
                  <Card key={bucket.lesson} size="small" title={bucket.lesson}>
                    <div className="detail-two-col">
                      <div>
                        <Typography.Text type="secondary">Topshiriqlar</Typography.Text>
                        {bucket.submissions.length ? (
                          <div className="mini-card-grid">
                            {bucket.submissions.map((item: any) => (
                              <Card
                                key={item.id}
                                size="small"
                                title={item.assignment_title || "Topshiriq"}
                                hoverable
                                onClick={() => openDetail(item, "assignment")}
                              >
                                <div style={{ marginTop: 'var(--space-1-5)', fontWeight: 'var(--font-weight-semibold)' }}>
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
                          <div className="mini-card-grid">
                            {bucket.tests.map((item: any) => (
                              <Card
                                key={item.id}
                                size="small"
                                title={item.test_title || "Test"}
                                hoverable
                                onClick={() => openDetail(item, "test")}
                              >
                                <div style={{ marginTop: 'var(--space-1-5)', fontWeight: 'var(--font-weight-semibold)' }}>
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
          <div style={{ display: "grid", gap: 'var(--space-2)' }}>
            <div>
              <Typography.Text type="secondary">Sarlavha</Typography.Text>
              <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
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
            <Divider orientation="left">{t('common.edit')}</Divider>
            <div style={{ display: "grid", gap: 'var(--space-2)' }}>
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
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : (
          <Empty description={t('common.noData')} />
        )}
      </Modal>
    </Card>
    </div>
  );
};

export default TeacherGradesPage;
