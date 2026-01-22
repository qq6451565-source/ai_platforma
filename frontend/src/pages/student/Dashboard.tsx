import { Button, Card, Col, Row, Typography, List, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

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
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Student panel</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Bugungi darslar" bordered={false}>
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
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate("/app/student/schedule")}
                      actions={[
                        <Button
                          key="live"
                          size="small"
                          type={liveStatus.canJoin ? "primary" : "default"}
                          disabled={!liveStatus.canJoin}
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/app/live/${item.id}`);
                          }}
                        >
                          {liveStatus.label}
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={`${item.subject_name || "Fan"} | ${item.topic || "Mavzu"}`}
                        description={`${item.group_name || `Guruh #${item.group}`} | ${dayjs(item.start_time).format(
                          "HH:mm"
                        )} - ${dayjs(item.end_time).format("HH:mm")}`}
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Bugungi topshiriqlar" bordered={false}>
            {loadingAssignments ? (
              <Skeleton active />
            ) : (
              <List
                size="small"
                dataSource={todayAssignments}
                locale={{ emptyText: "Bugun topshiriq yo'q" }}
                renderItem={(item) => (
                  <List.Item style={{ cursor: "pointer" }} onClick={() => navigate("/app/student/assignments")}>
                    <List.Item.Meta
                      title={item.title}
                      description={`${item.subject || "Fan"} | ${item.group_names?.join(", ") || "Guruh yo'q"}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Bugungi testlar" bordered={false}>
            {loadingTests ? (
              <Skeleton active />
            ) : (
              <List
                size="small"
                dataSource={todayTests}
                locale={{ emptyText: "Bugun test yo'q" }}
                renderItem={(item) => (
                  <List.Item style={{ cursor: "pointer" }} onClick={() => navigate("/app/student/tests")}>
                    <List.Item.Meta
                      title={item.title}
                      description={`${item.subject_name || "Fan"} | ${item.lesson_topic || "Mavzu"}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
