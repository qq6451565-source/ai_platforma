import { Card, Row, Col, Skeleton, Statistic, Typography } from "antd";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminQueryOptions } from "./utils/adminQueryOptions";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const results = useQueries({
    queries: [
      adminQueryOptions.users(),
      adminQueryOptions.groups(),
      adminQueryOptions.directions(),
      adminQueryOptions.subjects(),
      adminQueryOptions.lessons(),
      adminQueryOptions.materials(),
      adminQueryOptions.assignments(),
      adminQueryOptions.tests(),
    ],
  });

  const loading = results.some((r) => r.isLoading);
  const [
    users,
    groups,
    directions,
    subjects,
    lessons,
    materials,
    assignments,
    tests,
  ] = results.map((r) => r.data || []);
  const userList = Array.isArray(users) ? users : [];
  const userCounts = useMemo(() => {
    return {
      total: userList.length,
      student: userList.filter((u: any) => u.role === "student").length,
      teacher: userList.filter((u: any) => u.role === "teacher").length,
      admin: userList.filter((u: any) => u.role === "admin").length,
    };
  }, [userList]);

  const stats = [
    {
      key: "users",
      title: t('nav.users'),
      value: userCounts.total,
      to: "/app/admin/users?tab=users",
    },
    {
      key: "students",
      title: t('nav.students'),
      value: userCounts.student,
      to: "/app/admin/users?tab=users&role=student",
    },
    {
      key: "teachers",
      title: t('nav.teachers'),
      value: userCounts.teacher,
      to: "/app/admin/users?tab=users&role=teacher",
    },
    {
      key: "admins",
      title: t('roles.admin'),
      value: userCounts.admin,
      to: "/app/admin/users?tab=users&role=admin",
    },
    {
      key: "groups",
      title: t('nav.groups'),
      value: Array.isArray(groups) ? groups.length : 0,
      to: "/app/admin/university?section=groups",
    },
    {
      key: "directions",
      title: t('nav.curriculum'),
      value: Array.isArray(directions) ? directions.length : 0,
      to: "/app/admin/university?section=directions",
    },
    {
      key: "subjects",
      title: t('nav.subjects'),
      value: Array.isArray(subjects) ? subjects.length : 0,
      to: "/app/admin/university?section=subjects",
    },
    {
      key: "lessons",
      title: t('nav.schedule'),
      value: Array.isArray(lessons) ? lessons.length : 0,
      to: "/app/admin/learning?section=lessons",
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>{t('nav.dashboard')}</Typography.Title>
      {loading ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          {stats.map((stat) => (
            <Col key={stat.key} xs={24} sm={12} md={6}>
              <Card hoverable onClick={() => navigate(stat.to)} style={{ cursor: 'pointer' }}>
                <Statistic title={stat.title} value={stat.value} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {!loading && (
        <div style={{ marginTop: 32 }}>
          <Typography.Title level={5} style={{ marginBottom: 16, color: '#6b7280' }}>
            {t('nav.main')}
          </Typography.Title>
        <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card title={t('nav.enrollment')} hoverable>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=windows")}>
                  {t('nav.enrollment')}
                </div>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=applicants")}>
                  {t('nav.students')}
                </div>
              </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title={t('nav.academic')} hoverable>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=directions")}>
                  {t('nav.curriculum')}
                </div>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=subjects")}>
                  {t('nav.subjects')}
                </div>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=groups")}>
                  {t('nav.groups')}
                </div>
              </div>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card title={t('nav.learning')} hoverable>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=lessons")}>
                  {t('nav.schedule')}
                </div>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=materials")}>
                  {t('nav.materials')}
                </div>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=tests")}>
                  {t('nav.tests')}
                </div>
              </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
