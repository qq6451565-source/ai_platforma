import { Card, Col, Row, Typography, List, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessonSlots } from "../../api/schedule";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";

const StudentDashboard = () => {
  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ["lesson-slots"],
    queryFn: fetchLessonSlots,
  });

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });

  const { data: tests, isLoading: loadingTests } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
  });

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Student panel</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Darslar" bordered={false}>
            {loadingSlots ? (
              <Skeleton active />
            ) : (
              <List
                size="small"
                dataSource={(slots || []).slice(0, 3)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.subject_name || `Subject #${item.subject}`}
                      description={`${new Date(item.start_time).toLocaleString()} - ${new Date(
                        item.end_time
                      ).toLocaleTimeString()} (${item.mode || "offline"}) | ${item.teacher_name || ""}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Topshiriqlar" bordered={false}>
            {loadingAssignments ? (
              <Skeleton active />
            ) : (
              <List
                size="small"
                dataSource={(assignments || []).slice(0, 3)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={`Deadline: ${new Date(item.deadline).toLocaleString()}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Testlar" bordered={false}>
            {loadingTests ? (
              <Skeleton active />
            ) : (
              <List
                size="small"
                dataSource={(tests || []).slice(0, 3)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={`Status: ${item.is_active ? "Active" : "Inactive"}`}
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
