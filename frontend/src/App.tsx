import { Layout, Menu, Spin, Popconfirm } from "antd";
import {
  CalendarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  BookOutlined,
  TeamOutlined,
  UserOutlined,
  ReadOutlined,
  DashboardOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Navigate, Route, Routes, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import AdminLoginPage from "./pages/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentRoute from "./components/StudentRoute";
import { clearTokens } from "./utils/token";
import { logout } from "./api/auth";
import StudentDashboard from "./pages/student/Dashboard";
import StudentSchedule from "./pages/student/Schedule";
import StudentAssignments from "./pages/student/Assignments";
import StudentMaterials from "./pages/student/Materials";
import StudentTests from "./pages/student/Tests";
import StudentGrades from "./pages/student/Grades";
import StudentProfile from "./pages/student/Profile";
import StudentAttendance from "./pages/student/Attendance";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherLessons from "./pages/teacher/Lessons";
import TeacherAssignments from "./pages/teacher/Assignments";
import TeacherTests from "./pages/teacher/Tests";
import TeacherGrades from "./pages/teacher/Grades";
import TeacherAttendance from "./pages/teacher/Attendance";
import TeacherMaterials from "./pages/teacher/Materials";
import TeacherSubmissions from "./pages/teacher/Submissions";
import TeacherProfile from "./pages/teacher/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsersHub from "./pages/admin/UsersHub";
import AdminEnrollmentHub from "./pages/admin/EnrollmentHub";
import AdminAISettings from "./pages/admin/AISettings";
import AdminUniversityHub from "./pages/admin/UniversityHub";
import AdminLearningHub from "./pages/admin/LearningHub";
import AdminProfile from "./pages/admin/Profile";
import LiveRoomPage from "./pages/live/Room";
import TeacherRoute from "./components/TeacherRoute";
import AdminRoute from "./components/AdminRoute";
import { getAccessToken } from "./utils/token";
import { getDefaultRedirect } from "./utils/roleRedirect";
import { useMe } from "./hooks/useMe";

const { Header, Content, Sider } = Layout;

type AppLayoutProps = {
  user: any;
  isLoading: boolean;
};

const studentGroup: MenuProps["items"] = [
  {
    type: "group",
    label: "Talaba",
    children: [
      { key: "student/dashboard", label: "Bosh sahifa", icon: <DashboardOutlined /> },
      { key: "student/schedule", label: "Dars jadvali", icon: <CalendarOutlined /> },
      { key: "student/materials", label: "Materiallar", icon: <ReadOutlined /> },
      { key: "student/assignments", label: "Topshiriqlar", icon: <FileTextOutlined /> },
      { key: "student/tests", label: "Testlar", icon: <ExperimentOutlined /> },
      { key: "student/grades", label: "Baholar", icon: <FileDoneOutlined /> },
      { key: "student/attendance", label: "Davomat", icon: <TeamOutlined /> },
      { key: "student/profile", label: "Profil", icon: <UserOutlined /> },
    ],
  },
];

const teacherGroup: MenuProps["items"] = [
  {
    type: "group",
    label: "O'qituvchi",
    children: [
      { key: "teacher/dashboard", label: "Panel", icon: <DashboardOutlined /> },
      { key: "teacher/lessons", label: "Dars jadvali", icon: <CalendarOutlined /> },
      { key: "teacher/assignments", label: "Topshiriqlar", icon: <FileTextOutlined /> },
      { key: "teacher/tests", label: "Testlar", icon: <ExperimentOutlined /> },
      { key: "teacher/grades", label: "Baholar", icon: <FileDoneOutlined /> },
      { key: "teacher/attendance", label: "Davomat", icon: <TeamOutlined /> },
      { key: "teacher/materials", label: "Materiallar", icon: <ReadOutlined /> },
      { key: "teacher/submissions", label: "Yuborilganlar", icon: <FileDoneOutlined /> },
      { key: "teacher/profile", label: "Profil", icon: <UserOutlined /> },
    ],
  },
];

const adminGroup: MenuProps["items"] = [
  {
    key: "admin-main",
    label: "Asosiy",
    icon: <DashboardOutlined />,
    children: [
      { key: "admin/dashboard", label: "Boshqaruv paneli" },
      { key: "admin/profile", label: "Profil" },
    ],
  },
  {
    key: "admin-users",
    label: "Foydalanuvchilar",
    icon: <UserOutlined />,
    children: [
      { key: "admin/users?tab=users", label: "Barchasi" },
      { key: "admin/users?tab=users&role=student", label: "Talabalar" },
      { key: "admin/users?tab=users&role=teacher", label: "O'qituvchilar" },
      { key: "admin/users?tab=users&role=admin", label: "Adminlar" },
    ],
  },
  {
    key: "admin-enrollment",
    label: "Qabul",
    icon: <TeamOutlined />,
    children: [
      { key: "admin/enrollment?tab=applicants", label: "Arizachilar" },
      { key: "admin/enrollment?tab=windows", label: "Ro'yxatdan o'tish" },
    ],
  },
  {
    key: "admin-university",
    label: "Akademik",
    icon: <BookOutlined />,
    children: [
      { key: "admin/university?section=directions", label: "Yo'nalishlar" },
      { key: "admin/university?section=subjects", label: "Fanlar" },
      { key: "admin/university?section=teacher-subjects", label: "O'qituvchi-Fan" },
      { key: "admin/university?section=groups", label: "Guruhlar" },
    ],
  },
  {
    key: "admin-learning",
    label: "O'quv jarayoni",
    icon: <CalendarOutlined />,
    children: [
      { key: "admin/learning?section=lessons", label: "Dars jadvali" },
      { key: "admin/learning?section=materials", label: "Materiallar" },
      { key: "admin/learning?section=assignments", label: "Topshiriqlar" },
      { key: "admin/learning?section=submissions", label: "Yuborilganlar" },
      { key: "admin/learning?section=tests", label: "Testlar" },
      { key: "admin/learning?section=attendance", label: "Davomat" },
      { key: "admin/learning?section=gradebook", label: "Baholar" },
    ],
  },
  {
    key: "admin-system",
    label: "Tizim",
    icon: <SettingOutlined />,
    children: [{ key: "admin/ai-settings", label: "AI sozlamalari" }],
  },
];

const AppLayout = ({ user, isLoading }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Agar user hali yuklanmagan bo'lsa, spinner
  if (isLoading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const items = isAdmin ? adminGroup : isTeacher ? teacherGroup : studentGroup;

  const selectedPath = location.pathname.startsWith("/app/")
    ? location.pathname.replace("/app/", "")
    : "";
  const isLiveRoute = selectedPath.startsWith("live/");
  const selectedKey = useMemo(() => {
    if (!selectedPath.startsWith("admin/")) return selectedPath;
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const section = params.get("section");
    if (selectedPath.startsWith("admin/users")) {
      const resolvedTab = tab || "users";
      if (resolvedTab === "users") {
        const role = params.get("role");
        if (role === "admin" || role === "teacher" || role === "student") {
          return `admin/users?tab=users&role=${role}`;
        }
        return "admin/users?tab=users";
      }
      return "admin/users?tab=users";
    }
    if (selectedPath.startsWith("admin/enrollment")) {
      const allowedTabs = ["applicants", "windows"];
      const resolvedTab = tab && allowedTabs.includes(tab) ? tab : "applicants";
      return `admin/enrollment?tab=${resolvedTab}`;
    }
    if (selectedPath.startsWith("admin/university")) {
      const allowedSections = ["directions", "subjects", "teacher-subjects", "groups"];
      const resolvedSection = section && allowedSections.includes(section) ? section : "directions";
      return `admin/university?section=${resolvedSection}`;
    }
    if (selectedPath.startsWith("admin/learning")) {
      const allowedSections = ["lessons", "materials", "assignments", "submissions", "tests", "attendance", "gradebook"];
      const resolvedSection = section && allowedSections.includes(section) ? section : "lessons";
      return `admin/learning?section=${resolvedSection}`;
    }
    if (selectedPath.startsWith("admin/assessment") && section) {
      if (section === "tests") {
        const testTab = params.get("tab");
        if (testTab) {
          return `admin/assessment?section=tests&tab=${testTab}`;
        }
      }
      return `admin/assessment?section=${section}`;
    }
    return selectedPath;
  }, [selectedPath, location.search]);

  const getAdminOpenKey = (key: string) => {
    if (key.startsWith("admin/dashboard")) return "admin-main";
    if (key.startsWith("admin/users")) return "admin-users";
    if (key.startsWith("admin/enrollment")) return "admin-enrollment";
    if (key.startsWith("admin/university")) return "admin-university";
    if (key.startsWith("admin/learning")) return "admin-learning";
    if (key.startsWith("admin/ai-settings")) return "admin-system";
    return "";
  };

  const [openKeys, setOpenKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedKey.startsWith("admin/")) return;
    const nextOpen = getAdminOpenKey(selectedKey);
    if (!nextOpen) return;
    setOpenKeys((prev) => (prev.includes(nextOpen) && prev.length === 1 ? prev : [nextOpen]));
  }, [selectedKey]);

  // Rolga mos yo'lga majburlash: admin faqat admin blokida, teacher student blokiga, student teacher blokiga kira olmaydi
  useEffect(() => {
    if (!user) return;
    if (isLiveRoute) return;
    if (isAdmin && !selectedPath.startsWith("admin/") && selectedPath) {
      return navigate("/app/admin/dashboard", { replace: true });
    }
    if (!isAdmin && isTeacher && selectedPath.startsWith("student/")) {
      return navigate("/app/teacher/dashboard", { replace: true });
    }
    if (!isTeacher && selectedPath.startsWith("teacher/")) {
      return navigate("/app/student/dashboard", { replace: true });
    }
  }, [isTeacher, isAdmin, selectedPath, navigate, user]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isLiveRoute && (
        <Header style={{ display: "flex", alignItems: "center" }}>
          <div style={{ color: "#fff", fontWeight: 600, marginRight: 24 }}>
            {isAdmin ? "Admin paneli" : isTeacher ? "O'qituvchi paneli" : "Talaba paneli"}
          </div>
          <div style={{ color: "#d9d9d9" }}>
            {isLoading ? <Spin size="small" /> : user ? `${user.first_name} ${user.last_name} (${user.role})` : ""}
          </div>
          <div style={{ marginLeft: "auto", color: "#fff" }}>
            <Popconfirm
              title="Chiqishni tasdiqlaysizmi?"
              okText="Ha"
              cancelText="Yo'q"
              onConfirm={async () => {
                try {
                  await logout();
                } catch {
                  // ignore
                }
                clearTokens();
                qc.clear();
                window.location.href = isAdmin ? "/admin-login" : "/login";
              }}
            >
              <span style={{ cursor: "pointer" }}>Chiqish</span>
            </Popconfirm>
          </div>
        </Header>
      )}
      <Layout>
        {!isLiveRoute && (
          <Sider breakpoint="lg" collapsedWidth="0" width={220}>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={items}
              openKeys={isAdmin ? openKeys : undefined}
              onOpenChange={(keys) => setOpenKeys(keys as string[])}
              onClick={(e) => navigate(`/app/${e.key}`)}
              style={{ height: "100%" }}
            />
          </Sider>
        )}
        <Content style={isLiveRoute ? { padding: 0 } : undefined}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

const App = () => {
  const token = getAccessToken();
  const { data: user, isLoading, isError } = useMe();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isAuthenticated = !!token && !!user && !isError;

  useEffect(() => {
    if (isError) {
      clearTokens();
    }
  }, [isError]);

  if (isLoading && !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={isLoading} />}>
        <Route path="/app" element={<AppLayout user={user} isLoading={isLoading} />}>
          <Route path="live/:lessonId" element={<LiveRoomPage />} />
          <Route path="student" element={<StudentRoute role={user?.role} loading={isLoading} />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="materials" element={<StudentMaterials />} />
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="tests" element={<StudentTests />} />
            <Route path="grades" element={<StudentGrades />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="*" element={<Navigate to="/app/student/dashboard" replace />} />
          </Route>

          <Route path="teacher" element={<TeacherRoute isTeacher={isTeacher} role={user?.role} loading={isLoading} />}>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="lessons" element={<TeacherLessons />} />
            <Route path="assignments" element={<TeacherAssignments />} />
            <Route path="tests" element={<TeacherTests />} />
            <Route path="grades" element={<TeacherGrades />} />
            <Route path="attendance" element={<TeacherAttendance />} />
            <Route path="materials" element={<TeacherMaterials />} />
            <Route path="submissions" element={<TeacherSubmissions />} />
            <Route path="profile" element={<TeacherProfile />} />
            <Route path="*" element={<Navigate to="/app/teacher/dashboard" replace />} />
          </Route>

          <Route path="admin" element={<AdminRoute isAdmin={isAdmin} role={user?.role} loading={isLoading} />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="users" element={<AdminUsersHub />} />
            <Route path="enrollment" element={<AdminEnrollmentHub />} />
            <Route path="university" element={<AdminUniversityHub />} />
            <Route path="learning" element={<AdminLearningHub />} />
            <Route path="ai-settings" element={<AdminAISettings />} />

            <Route path="enrollment-windows" element={<Navigate to="/app/admin/enrollment?tab=windows" replace />} />

            <Route path="directions" element={<Navigate to="/app/admin/university?section=directions" replace />} />
            <Route path="subjects" element={<Navigate to="/app/admin/university?section=subjects" replace />} />
            <Route path="teacher-subjects" element={<Navigate to="/app/admin/university?section=teacher-subjects" replace />} />
            <Route path="groups" element={<Navigate to="/app/admin/university?section=groups" replace />} />

            <Route path="schedule" element={<Navigate to="/app/admin/learning?section=lessons" replace />} />
            <Route path="lessons" element={<Navigate to="/app/admin/learning?section=lessons" replace />} />
            <Route path="materials" element={<Navigate to="/app/admin/learning?section=materials" replace />} />
            <Route path="assignments" element={<Navigate to="/app/admin/learning?section=assignments" replace />} />
            <Route path="attendance" element={<Navigate to="/app/admin/learning?section=attendance" replace />} />
            <Route path="gradebook" element={<Navigate to="/app/admin/learning?section=gradebook" replace />} />

            <Route path="tests" element={<Navigate to="/app/admin/learning?section=tests" replace />} />
            <Route path="assessment" element={<Navigate to="/app/admin/learning?section=tests" replace />} />
            <Route path="proctoring" element={<Navigate to="/app/admin/dashboard" replace />} />
            <Route path="journal" element={<Navigate to="/app/admin/dashboard" replace />} />
            <Route path="test-questions" element={<Navigate to="/app/admin/dashboard" replace />} />
            <Route path="test-options" element={<Navigate to="/app/admin/dashboard" replace />} />
            <Route path="student-tests" element={<Navigate to="/app/admin/dashboard" replace />} />

            <Route path="*" element={<Navigate to="/app/admin/dashboard" replace />} />
          </Route>

          <Route index element={<Navigate to={getDefaultRedirect(user?.role)} replace />} />
          <Route path="*" element={<Navigate to={getDefaultRedirect(user?.role)} replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
