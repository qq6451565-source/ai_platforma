import { useQuery } from "@tanstack/react-query";
import { Card, Select, Table, Empty } from "antd";
import { useState } from "react";
import { fetchLessonsAdmin, fetchLessonAttendance } from "../../api/admin";

const AdminAttendancePage = () => {
  const [lessonId, setLessonId] = useState<number | null>(null);
  const { data: lessons } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: fetchLessonsAdmin,
  });
  const { data: records, isLoading } = useQuery({
    queryKey: ["admin-attendance", lessonId],
    queryFn: () => fetchLessonAttendance(lessonId as number),
    enabled: !!lessonId,
  });

  return (
    <Card title="Davomat" style={{ marginBottom: 16 }}>
      <Select
        showSearch
        placeholder="Darsni tanlang"
        style={{ width: 320, marginBottom: 12 }}
        value={lessonId ?? undefined}
        onChange={(v) => setLessonId(v)}
        options={(lessons || []).map((l) => ({
          value: l.id,
          label: `${l.topic} (${l.group_name || l.group})`,
        }))}
      />

      {!lessonId ? (
        <Empty description="Dars tanlang" />
      ) : (
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={records || []}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "ID", dataIndex: "id", width: 60 },
            { title: "Student", dataIndex: "student" },
            { title: "Status", dataIndex: "status" },
            { title: "Vaqt", dataIndex: "timestamp" },
          ]}
        />
      )}
    </Card>
  );
};

export default AdminAttendancePage;
