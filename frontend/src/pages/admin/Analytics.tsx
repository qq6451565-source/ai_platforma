import { useQuery } from "@tanstack/react-query";
import { Card, Row, Col, Statistic, Spin } from "antd";
import { useTranslation } from 'react-i18next';
import { adminQueryOptions } from "./utils/adminQueryOptions";

const AdminAnalyticsPage = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(adminQueryOptions.analytics());

  if (isLoading) {
    return (
      <div className="admin-page">
        <Spin />
      </div>
    );
  }

  return (
    <Card title={t('adminAnalytics.pageTitle')}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.users')} value={data?.users?.total || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.students')} value={data?.users?.students || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.teachers')} value={data?.users?.teachers || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.admins')} value={data?.users?.admins || 0} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 'var(--space-4)' }}>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.groups')} value={data?.groups || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.lessonsTotal')} value={data?.lessons_total || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.testsTotal')} value={data?.tests_total || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.assignmentsTotal')} value={data?.assignments_total || 0} />
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 'var(--space-4)' }}>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.todayLessons')} value={data?.today?.lessons || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.todayTests')} value={data?.today?.tests || 0} />
        </Col>
        <Col xs={24} md={6}>
          <Statistic title={t('adminAnalytics.teacherSubject')} value={data?.teacher_subject_links || 0} />
        </Col>
      </Row>
    </Card>
  );
};

export default AdminAnalyticsPage;
