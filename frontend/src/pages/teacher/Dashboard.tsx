import { Card, Col, Row, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";

const TeacherDashboard = () => {
  const { data: lessons } = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });
  const { data: assignments } = useQuery({ queryKey: ["assignments"], queryFn: fetchAssignments });
  const { data: tests } = useQuery({ queryKey: ["tests"], queryFn: fetchTests });

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>O'qituvchi paneli</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Darslar" bordered={false}>
            {lessons?.length || 0} ta dars
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Topshiriqlar" bordered={false}>
            {assignments?.length || 0} ta topshiriq
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Testlar" bordered={false}>
            {tests?.length || 0} ta test
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherDashboard;
