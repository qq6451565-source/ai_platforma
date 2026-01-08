import { Card, Col, Row, Typography } from "antd";

const DashboardPage = () => {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Dashboard</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Bugungi darslar" bordered={false}>
            Tez orada ma'lumotlar.
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Topshiriqlar" bordered={false}>
            Tez orada ma'lumotlar.
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Testlar" bordered={false}>
            Tez orada ma'lumotlar.
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
