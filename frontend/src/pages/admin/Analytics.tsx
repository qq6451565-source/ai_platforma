import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Statistic, Spin } from "antd";
import { adminQueryOptions } from "./utils/adminQueryOptions";

const AdminAnalyticsPage = () => {
  const { data, isLoading } = useQuery(adminQueryOptions.analytics());

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title="Analitika (Admin Dashboard)">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Statistic title="Foydalanuvchilar" value={data?.users?.total || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="Talabalar" value={data?.users?.students || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="O'qituvchilar" value={data?.users?.teachers || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="Adminlar" value={data?.users?.admins || 0} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={6}>
          <Statistic title="Guruhlar" value={data?.groups || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="Darslar (jami)" value={data?.lessons_total || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="Testlar (jami)" value={data?.tests_total || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="Topshiriqlar (jami)" value={data?.assignments_total || 0} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={6}>
          <Statistic title="Bugungi darslar" value={data?.today?.lessons || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="Bugungi testlar" value={data?.today?.tests || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title="Teacher-Subject" value={data?.teacher_subject_links || 0} />
        </Col>
      </Row>
    </Card>
  );
};

export default AdminAnalyticsPage;
