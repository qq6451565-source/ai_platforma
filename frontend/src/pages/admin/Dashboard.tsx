import { Skeleton } from "antd";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import {
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined,
  UserOutlined,
  ReadOutlined,
  ExperimentOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import "../student/Dashboard.css";

const AdminDashboard = () => {
  const { t } = useTranslation();
  usePageTitle('nav.dashboard');
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
    { key: "users", title: t('nav.users'), value: userCounts.total, to: "/app/admin/users?tab=users", icon: <TeamOutlined />, color: "var(--accent)" },
    { key: "students", title: t('nav.students'), value: userCounts.student, to: "/app/admin/users?tab=users&role=student", icon: <UserOutlined />, color: "var(--color-success)" },
    { key: "teachers", title: t('nav.teachers'), value: userCounts.teacher, to: "/app/admin/users?tab=users&role=teacher", icon: <UserOutlined />, color: "var(--accent-3)" },
    { key: "admins", title: t('roles.admin'), value: userCounts.admin, to: "/app/admin/users?tab=users&role=admin", icon: <UserOutlined />, color: "var(--color-warning)" },
    { key: "groups", title: t('nav.groups'), value: Array.isArray(groups) ? groups.length : 0, to: "/app/admin/university?section=groups", icon: <ApartmentOutlined />, color: "var(--color-info)" },
    { key: "directions", title: t('nav.curriculum'), value: Array.isArray(directions) ? directions.length : 0, to: "/app/admin/university?section=directions", icon: <BookOutlined />, color: "var(--accent-2)" },
    { key: "subjects", title: t('nav.subjects'), value: Array.isArray(subjects) ? subjects.length : 0, to: "/app/admin/university?section=subjects", icon: <ReadOutlined />, color: "var(--accent-2)" },
    { key: "lessons", title: t('nav.schedule'), value: Array.isArray(lessons) ? lessons.length : 0, to: "/app/admin/learning?section=lessons", icon: <CalendarOutlined />, color: "var(--color-info)" },
  ];

  const quickLinks = [
    {
      title: t('nav.enrollment'),
      items: [
        { label: t('nav.enrollment'), to: "/app/admin/enrollment?tab=windows" },
        { label: t('nav.students'), to: "/app/admin/enrollment?tab=applicants" },
      ],
    },
    {
      title: t('nav.university'),
      items: [
        { label: t('nav.curriculum'), to: "/app/admin/university?section=directions" },
        { label: t('nav.subjects'), to: "/app/admin/university?section=subjects" },
        { label: t('nav.groups'), to: "/app/admin/university?section=groups" },
      ],
    },
    {
      title: t('nav.learning'),
      items: [
        { label: t('nav.schedule'), to: "/app/admin/learning?section=lessons" },
        { label: t('nav.materials'), to: "/app/admin/learning?section=materials" },
        { label: t('nav.tests'), to: "/app/admin/learning?section=tests" },
      ],
    },
  ];

  return (
    <div className="hemis-dashboard">
      <div className="hemis-page-header">
        <h1 className="hemis-page-title">Dashboard</h1>
      </div>

      {loading ? (
        <Skeleton active />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="hemis-stats-grid">
            {stats.map((stat) => (
              <div key={stat.key} className="hemis-stat-card" role="button" tabIndex={0} onClick={() => navigate(stat.to)}>
                <div className="hemis-stat-icon" style={{ background: `${stat.color}12`, color: stat.color }}>
                  {stat.icon}
                </div>
                <div className="hemis-stat-info">
                  <span className="hemis-stat-value">{stat.value}</span>
                  <span className="hemis-stat-title">{stat.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="hemis-dashboard-grid" style={{ marginTop: 'var(--space-6)' }}>
            {quickLinks.map((section) => (
              <div key={section.title} className="hemis-card">
                <div className="hemis-card-header">
                  <h3 className="hemis-card-title">{section.title}</h3>
                </div>
                <div className="hemis-card-body">
                  <div className="hemis-assignment-list">
                    {section.items.map((item) => (
                      <div key={item.to} className="hemis-assignment-item" role="button" tabIndex={0} onClick={() => navigate(item.to)}>
                        <div className="hemis-assignment-info">
                          <span className="hemis-assignment-title">{item.label}</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
