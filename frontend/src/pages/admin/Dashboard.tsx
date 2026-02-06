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
import { Card } from "../../components/ui";

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
    <div className="page-container animate-fade-in">
      <h1 className="mb-6 neon-text-gradient">{t('nav.dashboard')}</h1>
      
      {loading ? (
        <Skeleton active />
      ) : (
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {stats.map((stat) => (
            <div
              key={stat.key}
              className="clickable-row"
              onClick={() => navigate(stat.to)}
              style={{ cursor: 'pointer' }}
            >
              <Card hoverable hasBeam>
                <Statistic title={stat.title} value={stat.value} />
              </Card>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-8">
          <h2 className="mb-4 h4 text-secondary">{t('nav.main')}</h2>
          <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <Card title={t('nav.enrollment')} hasBeam>
               <div className="d-flex flex-direction-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=windows")}>{t('nav.enrollment')}</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=applicants")}>{t('nav.students')}</div>
               </div>
            </Card>
            <Card title={t('nav.academic')} hasBeam>
              <div className="d-flex flex-direction-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=directions")}>{t('nav.curriculum')}</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=subjects")}>{t('nav.subjects')}</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=groups")}>{t('nav.groups')}</div>
               </div>
            </Card>
            <Card title={t('nav.learning')} hasBeam>
              <div className="d-flex flex-direction-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=lessons")}>{t('nav.schedule')}</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=materials")}>{t('nav.materials')}</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=tests")}>{t('nav.tests')}</div>
               </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
