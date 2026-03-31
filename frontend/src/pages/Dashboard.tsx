import { Card, Col, Row, Typography } from "antd";
import { useTranslation } from "react-i18next";

const DashboardPage = () => {
  const { t } = useTranslation();
  
  return (
    <div className="page-container animate-fade-in">
      <div className="mb-6">
        <h1 className="m-0">{t('dashboard.title')}</h1>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card title={t('dashboard.todayLessons')}>
            <div className="text-secondary">
              {t('dashboard.noLessonsToday')}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('dashboard.todayAssignments')}>
            <div className="text-secondary">
              {t('dashboard.noAssignmentsToday')}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('dashboard.todayTests')}>
            <div className="text-secondary">
              {t('dashboard.noTestsToday')}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
