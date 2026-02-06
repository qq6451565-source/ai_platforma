import { Empty, List, Skeleton, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchAttendance } from "../../api/attendance";
import { fetchLessons } from "../../api/lessons";
import { useMe } from "../../hooks/useMe";
import { Card } from "../../components/ui";

const StudentAttendance = () => {
  const { data: me } = useMe();
  const { data: attendance, isLoading } = useQuery({
    queryKey: ["attendance", me?.id],
    queryFn: () => fetchAttendance(me!.id),
    enabled: !!me?.id,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });

  const lessonMap = new Map(
    (lessons || []).map((lesson: any) => [
      lesson.id,
      {
        topic: lesson.topic || `Dars #${lesson.id}`,
        subject: lesson.subject_name || lesson.subject || "-",
        group: lesson.group_name || lesson.group || "-",
        start: lesson.start_time,
      },
    ])
  );

  const items = (attendance || [])
    .slice()
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Davomat</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : !items.length ? (
        <Empty description="Davomat yozuvlari yo'q" />
      ) : (
        <Card hasBeam>
          <List
            dataSource={items}
            renderItem={(record) => {
              const lesson = lessonMap.get(record.lesson);
              const statusLabel = record.status === "present" ? "Bor" : "Yoq";
              return (
                <List.Item>
                  <div style={{ width: "100%" }}>
                    <div className="kv-grid">
                      <span>Dars</span>
                      <strong>{lesson?.topic || `Dars #${record.lesson}`}</strong>
                      <span>Fan</span>
                      <span>{lesson?.subject || "-"}</span>
                      <span>Guruh</span>
                      <span>{lesson?.group || "-"}</span>
                      <span>Holat</span>
                      <Tag color={record.status === "present" ? "green" : "red"}>{statusLabel}</Tag>
                      <span>Vaqt</span>
                      <span>{lesson?.start ? new Date(lesson.start).toLocaleString() : "-"}</span>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default StudentAttendance;
