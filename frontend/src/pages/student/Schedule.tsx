import { List, Typography, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessonSlots } from "../../api/schedule";

const StudentSchedule = () => {
  const { data: slots, isLoading } = useQuery({
    queryKey: ["lesson-slots"],
    queryFn: fetchLessonSlots,
  });

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Jadval</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <List
          dataSource={slots || []}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.subject_name || `Subject #${item.subject}`}
                description={`${new Date(item.start_time).toLocaleString()} - ${new Date(
                  item.end_time
                ).toLocaleTimeString()} | ${item.mode || "offline"} | Room: ${item.room || "-"} | ${
                  item.teacher_name || ""
                }`}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default StudentSchedule;
