import { Card, Col, Row, Skeleton, Statistic, Typography } from "antd";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

const AdminDashboard = () => {
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
      title: "Foydalanuvchilar",
      value: userCounts.total,
      to: "/app/admin/users?tab=users",
    },
    {
      key: "students",
      title: "Talabalar",
      value: userCounts.student,
      to: "/app/admin/users?tab=users&role=student",
    },
    {
      key: "teachers",
      title: "O'qituvchilar",
      value: userCounts.teacher,
      to: "/app/admin/users?tab=users&role=teacher",
    },
    {
      key: "admins",
      title: "Adminlar",
      value: userCounts.admin,
      to: "/app/admin/users?tab=users&role=admin",
    },
    {
      key: "groups",
      title: "Guruhlar",
      value: Array.isArray(groups) ? groups.length : 0,
      to: "/app/admin/university?section=groups",
    },
    {
      key: "directions",
      title: "Yo'nalishlar",
      value: Array.isArray(directions) ? directions.length : 0,
      to: "/app/admin/university?section=directions",
    },
    {
      key: "subjects",
      title: "Fanlar",
      value: Array.isArray(subjects) ? subjects.length : 0,
      to: "/app/admin/university?section=subjects",
    },
    {
      key: "lessons",
      title: "Dars jadvali",
      value: Array.isArray(lessons) ? lessons.length : 0,
      to: "/app/admin/learning?section=lessons",
    },
    {
      key: "materials",
      title: "Materiallar",
      value: Array.isArray(materials) ? materials.length : 0,
      to: "/app/admin/learning?section=materials",
    },
    {
      key: "assignments",
      title: "Topshiriqlar",
      value: Array.isArray(assignments) ? assignments.length : 0,
      to: "/app/admin/learning?section=assignments",
    },
    {
      key: "tests",
      title: "Testlar",
      value: Array.isArray(tests) ? tests.length : 0,
      to: "/app/admin/learning?section=tests",
    },
  ];
  const actionSections = [
    {
      key: "enrollment",
      title: "Qabul",
      items: [
        { key: "windows", label: "Ro'yxatdan o'tish", to: "/app/admin/enrollment?tab=windows" },
        { key: "applicants", label: "Arizachilar", to: "/app/admin/enrollment?tab=applicants" },
      ],
    },
    {
      key: "university",
      title: "Akademik",
      items: [
        { key: "directions", label: "Yo'nalishlar", to: "/app/admin/university?section=directions" },
        { key: "subjects", label: "Fanlar", to: "/app/admin/university?section=subjects" },
        { key: "groups", label: "Guruhlar", to: "/app/admin/university?section=groups" },
        { key: "teacher-subjects", label: "O'qituvchi-Fan", to: "/app/admin/university?section=teacher-subjects" },
      ],
    },
    {
      key: "learning",
      title: "O'quv jarayoni",
      items: [
        { key: "lessons", label: "Dars jadvali", to: "/app/admin/learning?section=lessons" },
        { key: "materials", label: "Materiallar", to: "/app/admin/learning?section=materials" },
        { key: "assignments", label: "Topshiriqlar", to: "/app/admin/learning?section=assignments" },
        { key: "tests", label: "Testlar", to: "/app/admin/learning?section=tests" },
        { key: "attendance", label: "Davomat", to: "/app/admin/learning?section=attendance" },
        { key: "gradebook", label: "Baholar", to: "/app/admin/learning?section=gradebook" },
      ],
    },
  ];

  return (
    <div className="admin-dashboard">
      {loading ? (
        <Skeleton active />
      ) : (
        <>
          <Card title="Asosiy ko'rsatkichlar" className="admin-dashboard__section">
            <Row gutter={[16, 16]}>
              {stats.map((stat) => (
                <Col xs={24} sm={12} md={8} lg={6} key={stat.key}>
                  <Card
                    hoverable
                    onClick={() => navigate(stat.to)}
                    className="admin-dashboard__tile admin-dashboard__tile--stat"
                    style={{ height: "100%" }}
                  >
                    <Statistic title={stat.title} value={stat.value} />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {actionSections.map((section) => (
            <Card key={section.key} title={section.title} className="admin-dashboard__section">
              <Row gutter={[16, 16]}>
                {section.items.map((item) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                    <Card
                      hoverable
                      onClick={() => navigate(item.to)}
                      className="admin-dashboard__tile admin-dashboard__tile--action"
                      style={{ height: "100%" }}
                    >
                      <Typography.Text className="admin-dashboard__tile-title">
                        {item.label}
                      </Typography.Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
