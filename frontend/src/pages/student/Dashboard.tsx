import { Skeleton, List } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../components/ui";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { data: lessons, isLoading: loadingLessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });

  const { data: tests, isLoading: loadingTests } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
  });

  const todayLessons = (lessons || [])
    .filter((lesson) => lesson.start_time && dayjs(lesson.start_time).isSame(dayjs(), "day"))
    .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());

  const todayLessonIds = new Set(todayLessons.map((lesson) => lesson.id));
  const todayAssignments = (assignments || []).filter((item) => item.lesson && todayLessonIds.has(item.lesson));
  const todayTests = (tests || []).filter((item) => item.lesson && todayLessonIds.has(item.lesson));

  const getLiveStatus = (lesson: any) => {
    if (!lesson?.start_time || !lesson?.end_time) {
      return { canJoin: false, label: "Jadval yo'q" };
    }
    const start = dayjs(lesson.start_time);
    const end = dayjs(lesson.end_time);
    const now = dayjs();
    if (now.isBefore(start)) return { canJoin: false, label: "Boshlanishini kuting" };
    if (now.isAfter(end)) return { canJoin: false, label: "Dars tugagan" };
    return { canJoin: true, label: "Live darsga o'tish" };
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="d-flex justify-between items-center mb-6">
        <h1 className="m-0">Talaba paneli</h1>
        <div className="body-sm text-secondary">{dayjs().format('DD.MM.YYYY')}</div>
      </div>

      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card title="Bugungi darslar" className="h-full">
          {loadingLessons ? (
            <Skeleton active />
          ) : (
            <List
              size="small"
              dataSource={todayLessons}
              locale={{ emptyText: "Bugun dars yo'q" }}
              renderItem={(item) => {
                const liveStatus = getLiveStatus(item);
                return (
                  <List.Item
                    style={{ cursor: "pointer", padding: '12px 0' }}
                    onClick={() => navigate("/app/student/schedule")}
                    extra={
                      <Button
                        size="sm"
                        variant={liveStatus.canJoin ? "primary" : "outline"}
                        disabled={!liveStatus.canJoin}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/app/live/${item.id}`);
                        }}
                      >
                        {liveStatus.label}
                      </Button>
                    }
                  >
                    <List.Item.Meta
                      title={<span className="font-bold">{item.subject_name || "Fan"}</span>}
                      description={
                        <div>
                          <div className="text-primary body-sm">{item.topic || "Mavzu ko'rsatilmagan"}</div>
                          <div className="caption">
                            {dayjs(item.start_time).format("HH:mm")} - {dayjs(item.end_time).format("HH:mm")}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Card>

        <Card title="Bugungi topshiriqlar" className="h-full">
          {loadingAssignments ? (
            <Skeleton active />
          ) : (
            <List
              size="small"
              dataSource={todayAssignments}
              locale={{ emptyText: "Bugun topshiriq yo'q" }}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: "pointer", padding: '12px 0' }}
                  onClick={() => navigate("/app/student/assignments")}
                >
                  <List.Item.Meta
                    title={<span className="font-medium">{item.title}</span>}
                    description={<span className="caption">{item.subject || "Fan"}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card title="Bugungi testlar" className="h-full">
          {loadingTests ? (
            <Skeleton active />
          ) : (
            <List
              size="small"
              dataSource={todayTests}
              locale={{ emptyText: "Bugun test yo'q" }}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: "pointer", padding: '12px 0' }}
                  onClick={() => navigate("/app/student/tests")}
                >
                  <List.Item.Meta
                    title={<span className="font-medium">{item.title}</span>}
                    description={<span className="caption">{item.subject_name || "Fan"}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
