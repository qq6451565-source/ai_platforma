import { Skeleton, Statistic, Row, Col } from "antd";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  fetchUsers,
  fetchGroupsAdmin,
  fetchDirections,
  fetchSubjectsAdmin,
  fetchLessonsAdmin,
} from "../../api/admin";
import { fetchMaterials } from "../../api/materials";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";
import { PageContainer, SectionCard, GridLayout } from "../../components/ui";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const results = useQueries({
    queries: [
      { queryKey: ["admin-users"], queryFn: () => fetchUsers() },
      { queryKey: ["admin-groups"], queryFn: fetchGroupsAdmin },
      { queryKey: ["admin-directions"], queryFn: fetchDirections },
      { queryKey: ["admin-subjects"], queryFn: fetchSubjectsAdmin },
      { queryKey: ["admin-lessons"], queryFn: fetchLessonsAdmin },
      { queryKey: ["admin-materials"], queryFn: fetchMaterials },
      { queryKey: ["admin-assignments"], queryFn: fetchAssignments },
      { queryKey: ["admin-tests"], queryFn: fetchTests },
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
    <PageContainer title={t('nav.dashboard')}>
      {loading ? (
        <Skeleton active />
      ) : (
        <GridLayout columns="auto" minColumnWidth="240px" gap="md">
          {stats.map((stat) => (
            <SectionCard
              key={stat.key}
              hoverable
              onClick={() => navigate(stat.to)}
              noPadding
            >
              <div style={{ padding: 'var(--space-5)' }}>
                <Statistic title={stat.title} value={stat.value} />
              </div>
            </SectionCard>
          ))}
        </GridLayout>
      )}

      {!loading && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>
            {t('nav.main')}
          </h2>
          <GridLayout columns="auto" minColumnWidth="300px" gap="lg">
            <SectionCard title={t('nav.enrollment')} hoverable>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=windows")}>
                  {t('nav.enrollment')}
                </div>
                <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=applicants")}>
                  {t('nav.students')}
                </div>
              </div>
            </SectionCard>
            
            <SectionCard title={t('nav.academic')} hoverable>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
            </SectionCard>
            
            <SectionCard title={t('nav.learning')} hoverable>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
            </SectionCard>
          </GridLayout>
        </div>
      )}
    </PageContainer>
  );
};

export default AdminDashboard;
