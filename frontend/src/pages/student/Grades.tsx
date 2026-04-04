import { Card, Divider, Empty, List, Modal, Table, Typography } from "antd";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGradebook } from "../../api/gradebook";
import { fetchMySubmissions } from "../../api/submissions";
import { fetchStudentTestRecords } from "../../api/studentTests";
import { usePageTitle } from "../../hooks/usePageTitle";

const StudentGrades = () => {
  usePageTitle('nav.grades');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const { data: grades, isLoading } = useQuery({
    queryKey: ["gradebook"],
    queryFn: fetchGradebook,
  });
  const { data: submissions } = useQuery({
    queryKey: ["student-submissions"],
    queryFn: fetchMySubmissions,
  });
  const { data: testResults } = useQuery({
    queryKey: ["student-test-records"],
    queryFn: fetchStudentTestRecords,
  });

  const submissionsBySubject = useMemo(() => {
    const map = new Map<string, any[]>();
    (submissions || []).forEach((sub) => {
      const key = (sub.subject_name || "").trim().toLowerCase();
      if (!key) return;
      const list = map.get(key) || [];
      list.push(sub);
      map.set(key, list);
    });
    return map;
  }, [submissions]);

  const testsBySubject = useMemo(() => {
    const map = new Map<string, any[]>();
    (testResults || []).forEach((t) => {
      if (!t.is_finished) return;
      const key = (t.subject_name || "").trim().toLowerCase();
      if (!key) return;
      const list = map.get(key) || [];
      list.push(t);
      map.set(key, list);
    });
    return map;
  }, [testResults]);

  const data = useMemo(() => {
    return (grades || []).map((g) => {
      const subjectName = g.subject_name || `${g.subject}`;
      const subjectKey = subjectName.trim().toLowerCase();
      const subjectSubmissions = submissionsBySubject.get(subjectKey) || [];
      const subjectTests = testsBySubject.get(subjectKey) || [];
      const assignmentTotal = subjectSubmissions.reduce((sum, sub) => {
        return typeof sub.grade === "number" ? sum + sub.grade : sum;
      }, 0);
      const testTotal = subjectTests.reduce((sum, t) => {
        return typeof t.score_percent === "number" ? sum + t.score_percent : sum;
      }, 0);
      const assignmentScore = subjectSubmissions.length ? assignmentTotal : g.assignment_score ?? 0;
      const testScore = subjectTests.length ? testTotal : g.midterm_score ?? 0;
      return {
        key: g.id,
        subject_name: subjectName,
        subject_key: subjectKey,
        assignment_score: assignmentScore,
        midterm_score: testScore,
        assignment_count: subjectSubmissions.length,
        test_count: subjectTests.length,
      };
    });
  }, [grades, submissionsBySubject, testsBySubject]);

  const columns = useMemo(
    () => [
      { title: "Fan", dataIndex: "subject_name", key: "subject_name" },
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

  const currentSubmissions = useMemo(() => {
    if (!selectedSubject) return [];
    return submissionsBySubject.get(selectedSubject.subject_key) || [];
  }, [selectedSubject, submissionsBySubject]);

  const currentTests = useMemo(() => {
    if (!selectedSubject) return [];
    return testsBySubject.get(selectedSubject.subject_key) || [];
  }, [selectedSubject, testsBySubject]);

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Baholar</Typography.Title>
      <Card>
        <div className="table-scroll">
          <Table
            columns={columns}
            loading={isLoading}
            dataSource={data}
            pagination={false}
            size="small"
            scroll={{ x: 520 }}
            onRow={(record) => ({
              onClick: () => setSelectedSubject(record),
              className: "clickable-row",
            })}
          />
        </div>
      </Card>

      <Modal
        title={selectedSubject ? `${selectedSubject.subject_name}` : "Baholar"}
        open={!!selectedSubject}
        onCancel={() => setSelectedSubject(null)}
        footer={null}
      >
        <Divider orientation="left">Topshiriqlar</Divider>
        {currentSubmissions.length ? (
        <List
          dataSource={currentSubmissions}
          renderItem={(item: any) => (
            <List.Item>
              <div style={{ flex: 1 }}>
                <Typography.Text strong>{item.assignment_title || "Topshiriq"}</Typography.Text>
                <div className="caption">
                  {item.lesson_topic || "Dars"}
                </div>
              </div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {typeof item.grade === "number" ? item.grade : "Baholanmagan"}
              </div>
            </List.Item>
          )}
        />
        ) : (
        <Empty description="Topshiriqlar yo'q" />
        )}
        <Divider orientation="left">Testlar</Divider>
        {currentTests.length ? (
        <List
          dataSource={currentTests}
          renderItem={(item: any) => (
            <List.Item>
              <div style={{ flex: 1 }}>
                <Typography.Text strong>{item.test_title || "Test"}</Typography.Text>
                <div className="caption">
                  {item.lesson_topic || "Dars"}
                </div>
              </div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                {typeof item.score_percent === "number" ? `${item.score_percent}%` : "-"}
              </div>
            </List.Item>
          )}
        />
        ) : (
        <Empty description="Testlar yo'q" />
        )}
      </Modal>
    </div>
  );
};

export default StudentGrades;
