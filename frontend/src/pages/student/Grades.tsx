import { Table, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchGradebook } from "../../api/gradebook";

const columns = [
  { title: "Subject", dataIndex: "subject_name", key: "subject_name" },
  { title: "Attendance", dataIndex: "attendance_score", key: "attendance_score" },
  { title: "Assignment", dataIndex: "assignment_score", key: "assignment_score" },
  { title: "Midterm", dataIndex: "midterm_score", key: "midterm_score" },
  { title: "Final", dataIndex: "final_score", key: "final_score" },
  { title: "Total", dataIndex: "total_score", key: "total_score" },
];

const StudentGrades = () => {
  const { data: grades, isLoading } = useQuery({
    queryKey: ["gradebook"],
    queryFn: fetchGradebook,
  });

  const data = (grades || []).map((g) => ({
    key: g.id,
    subject_name: g.subject_name || g.subject,
    attendance_score: g.attendance_score,
    assignment_score: g.assignment_score,
    midterm_score: g.midterm_score,
    final_score: g.final_score,
    total_score: g.total_score,
  }));

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Baholar / Jurnal</Typography.Title>
      <Table columns={columns} loading={isLoading} dataSource={data} pagination={false} />
    </div>
  );
};

export default StudentGrades;
