import { Skeleton, Statistic, Row, Col } from "antd";
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
import { Card } from "../../components/ui";

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
  ];

  return (
    <div className="page-container animate-fade-in">
      <h1 className="mb-6">Boshqaruv paneli</h1>
      
      {loading ? (
        <Skeleton active />
      ) : (
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {stats.map((stat) => (
            <Card
              key={stat.key}
              hoverable
              onClick={() => navigate(stat.to)}
              className="clickable-row"
            >
              <Statistic title={stat.title} value={stat.value} />
            </Card>
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-8">
          <h2 className="mb-4 h4">Tizim bo'limlari</h2>
          <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <Card title="Qabul">
               <div className="d-flex flex-direction-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=windows")}>Ro'yxatdan o'tish</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/enrollment?tab=applicants")}>Arizachilar</div>
               </div>
            </Card>
            <Card title="Akademik">
              <div className="d-flex flex-direction-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=directions")}>Yo'nalishlar</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=subjects")}>Fanlar</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/university?section=groups")}>Guruhlar</div>
               </div>
            </Card>
            <Card title="O'quv jarayoni">
              <div className="d-flex flex-direction-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=lessons")}>Dars jadvali</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=materials")}>Materiallar</div>
                 <div className="p-2 clickable-row sidebar-link" onClick={() => navigate("/app/admin/learning?section=tests")}>Testlar</div>
               </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
