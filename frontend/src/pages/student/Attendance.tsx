import { Card, List, Skeleton, Typography, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchAttendance } from "../../api/attendance";
import { useMe } from "../../hooks/useMe";

const statusColor: Record<string, string> = {
  present: "green",
  absent: "red",
  late: "orange",
};

const StudentAttendance = () => {
  const { data: user } = useMe();
  const studentId = user?.id;
  const { data: items, isLoading } = useQuery({
    queryKey: ["attendance", studentId],
    queryFn: () => fetchAttendance(studentId as number),
    enabled: !!studentId,
  });

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Davomat</Typography.Title>
      <Card>
        {isLoading ? (
          <Skeleton active />
        ) : (
          <List
            dataSource={items || []}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={`Dars #${item.lesson}`}
                  description={new Date(item.timestamp).toLocaleString()}
                />
                <Tag color={statusColor[item.status] || "blue"}>{item.status}</Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default StudentAttendance;
