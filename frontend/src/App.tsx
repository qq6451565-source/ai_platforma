import { Layout, Menu, Spin, Popconfirm } from "antd";
import {
  CalendarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  BookOutlined,
  TeamOutlined,
  NotificationOutlined,
  MessageOutlined,
  UserOutlined,
  VideoCameraOutlined,
  ReadOutlined,
  DashboardOutlined,
  BarChartOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Navigate, Route, Routes, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useEffect } from "react";
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
import StudentAnnouncements from "./pages/student/Announcements";
import StudentProfile from "./pages/student/Profile";
import StudentAttendance from "./pages/student/Attendance";
import StudentChat from "./pages/student/Chat";
import StudentLive from "./pages/student/Live";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherLessons from "./pages/teacher/Lessons";
import TeacherAssignments from "./pages/teacher/Assignments";
import TeacherTests from "./pages/teacher/Tests";
import TeacherLive from "./pages/teacher/Live";
import TeacherMaterials from "./pages/teacher/Materials";
import TeacherSubmissions from "./pages/teacher/Submissions";
import TeacherAnnouncements from "./pages/teacher/Announcements";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsersHub from "./pages/admin/UsersHub";
import AdminEnrollmentHub from "./pages/admin/EnrollmentHub";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminAISettings from "./pages/admin/AISettings";
import AdminUniversityHub from "./pages/admin/UniversityHub";
import AdminLearningHub from "./pages/admin/LearningHub";
import AdminAssessmentHub from "./pages/admin/AssessmentHub";
import AdminCommsHub from "./pages/admin/CommsHub";
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
      { key: "student/schedule", label: "Jadval", icon: <CalendarOutlined /> },
      { key: "student/materials", label: "Materiallar", icon: <ReadOutlined /> },
      { key: "student/assignments", label: "Topshiriqlar", icon: <FileTextOutlined /> },
      { key: "student/tests", label: "Testlar", icon: <ExperimentOutlined /> },
      { key: "student/grades", label: "Baholar", icon: <FileDoneOutlined /> },
      { key: "student/attendance", label: "Davomat", icon: <TeamOutlined /> },
      { key: "student/announcements", label: "E'lonlar", icon: <NotificationOutlined /> },
      { key: "student/chat", label: "Chat", icon: <MessageOutlined /> },
      { key: "student/live", label: "Live", icon: <VideoCameraOutlined /> },
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
      { key: "teacher/lessons", label: "Darslar", icon: <CalendarOutlined /> },
      { key: "teacher/assignments", label: "Topshiriqlar", icon: <FileTextOutlined /> },
      { key: "teacher/tests", label: "Testlar", icon: <ExperimentOutlined /> },
      { key: "teacher/materials", label: "Materiallar", icon: <ReadOutlined /> },
      { key: "teacher/submissions", label: "Yuborilganlar", icon: <FileDoneOutlined /> },
      { key: "teacher/live", label: "Live", icon: <VideoCameraOutlined /> },
      { key: "teacher/announcements", label: "E'lonlar", icon: <NotificationOutlined /> },
    ],
  },
];

const adminGroup: MenuProps["items"] = [
  {
    type: "group",
    label: "Admin",
    children: [
      { key: "admin/dashboard", label: "Boshqaruv paneli", icon: <DashboardOutlined /> },
      { key: "admin/users", label: "Foydalanuvchilar", icon: <UserOutlined /> },
      { key: "admin/enrollment", label: "Qabul / Ro'yxat", icon: <TeamOutlined /> },
      { key: "admin/university", label: "Universitet", icon: <BookOutlined /> },
      { key: "admin/learning", label: "O'quv jarayoni", icon: <CalendarOutlined /> },
      { key: "admin/assessment", label: "Baholash / Nazorat", icon: <ExperimentOutlined /> },
      { key: "admin/comms", label: "Aloqa", icon: <MessageOutlined /> },
      { key: "admin/analytics", label: "Analitika", icon: <BarChartOutlined /> },
      { key: "admin/ai-settings", label: "AI sozlamalari", icon: <SettingOutlined /> },
    ],
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

  const selected = location.pathname.startsWith("/app/")
    ? location.pathname.replace("/app/", "")
    : "";

  // Rolga mos yo'lga majburlash: admin faqat admin blokida, teacher student blokiga, student teacher blokiga kira olmaydi
  useEffect(() => {
    if (!user) return;
    if (isAdmin && !selected.startsWith("admin/") && selected) {
      return navigate("/app/admin/dashboard", { replace: true });
    }
    if (!isAdmin && isTeacher && selected.startsWith("student/")) {
      return navigate("/app/teacher/dashboard", { replace: true });
    }
    if (!isTeacher && selected.startsWith("teacher/")) {
      return navigate("/app/student/dashboard", { replace: true });
    }
  }, [isTeacher, isAdmin, selected, navigate, user]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
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
      <Layout>
        <Sider breakpoint="lg" collapsedWidth="0" width={220}>
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={items}
            onClick={(e) => navigate(`/app/${e.key}`)}
            style={{ height: "100%" }}
          />
        </Sider>
        <Content>
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
          <Route path="student" element={<StudentRoute role={user?.role} loading={isLoading} />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="materials" element={<StudentMaterials />} />
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="tests" element={<StudentTests />} />
            <Route path="grades" element={<StudentGrades />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
            <Route path="chat" element={<StudentChat />} />
            <Route path="live" element={<StudentLive />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="*" element={<Navigate to="/app/student/dashboard" replace />} />
          </Route>

          <Route path="teacher" element={<TeacherRoute isTeacher={isTeacher} role={user?.role} loading={isLoading} />}>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="lessons" element={<TeacherLessons />} />
            <Route path="assignments" element={<TeacherAssignments />} />
            <Route path="tests" element={<TeacherTests />} />
            <Route path="live" element={<TeacherLive />} />
            <Route path="materials" element={<TeacherMaterials />} />
            <Route path="submissions" element={<TeacherSubmissions />} />
            <Route path="announcements" element={<TeacherAnnouncements />} />
            <Route path="*" element={<Navigate to="/app/teacher/dashboard" replace />} />
          </Route>

          <Route path="admin" element={<AdminRoute isAdmin={isAdmin} role={user?.role} loading={isLoading} />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersHub />} />
            <Route path="enrollment" element={<AdminEnrollmentHub />} />
            <Route path="university" element={<AdminUniversityHub />} />
            <Route path="learning" element={<AdminLearningHub />} />
            <Route path="assessment" element={<AdminAssessmentHub />} />
            <Route path="comms" element={<AdminCommsHub />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="ai-settings" element={<AdminAISettings />} />

            <Route path="profiles" element={<Navigate to="/app/admin/users?tab=profiles" replace />} />
            <Route path="passports" element={<Navigate to="/app/admin/users?tab=passports" replace />} />
            <Route path="audit-logs" element={<Navigate to="/app/admin/users?tab=audit" replace />} />
            <Route path="auth-groups" element={<Navigate to="/app/admin/users?tab=auth-groups" replace />} />
            <Route path="auth-tokens" element={<Navigate to="/app/admin/users?tab=auth-tokens" replace />} />
            <Route path="token-blacklist" element={<Navigate to="/app/admin/users?tab=token-blacklist" replace />} />

            <Route path="enrollment-windows" element={<Navigate to="/app/admin/enrollment?tab=windows" replace />} />
            <Route path="enrollment-documents" element={<Navigate to="/app/admin/enrollment?tab=documents" replace />} />
            <Route
              path="enrollment-verifications"
              element={<Navigate to="/app/admin/enrollment?tab=verifications" replace />}
            />

            <Route path="directions" element={<Navigate to="/app/admin/university?section=directions" replace />} />
            <Route path="semesters" element={<Navigate to="/app/admin/university?section=semesters" replace />} />
            <Route path="curriculum" element={<Navigate to="/app/admin/university?section=curriculum" replace />} />
            <Route path="subjects" element={<Navigate to="/app/admin/university?section=subjects" replace />} />
            <Route path="teacher-subjects" element={<Navigate to="/app/admin/university?section=teacher-subjects" replace />} />
            <Route path="groups" element={<Navigate to="/app/admin/university?section=groups" replace />} />

            <Route path="schedule" element={<Navigate to="/app/admin/learning?section=schedule" replace />} />
            <Route path="lessons" element={<Navigate to="/app/admin/learning?section=lessons" replace />} />
            <Route path="materials" element={<Navigate to="/app/admin/learning?section=materials" replace />} />
            <Route path="assignments" element={<Navigate to="/app/admin/learning?section=assignments" replace />} />

            <Route path="tests" element={<Navigate to="/app/admin/assessment?section=tests" replace />} />
            <Route path="proctoring" element={<Navigate to="/app/admin/assessment?section=proctoring" replace />} />
            <Route path="attendance" element={<Navigate to="/app/admin/assessment?section=attendance" replace />} />
            <Route path="gradebook" element={<Navigate to="/app/admin/assessment?section=gradebook" replace />} />
            <Route path="journal" element={<Navigate to="/app/admin/assessment?section=journal" replace />} />

            <Route path="announcements" element={<Navigate to="/app/admin/comms?section=announcements" replace />} />
            <Route path="chat" element={<Navigate to="/app/admin/comms?section=chat" replace />} />
            <Route path="live" element={<Navigate to="/app/admin/comms?section=live" replace />} />

            <Route path="test-questions" element={<Navigate to="/app/admin/assessment?section=tests&tab=questions" replace />} />
            <Route path="test-options" element={<Navigate to="/app/admin/assessment?section=tests&tab=options" replace />} />
            <Route path="student-tests" element={<Navigate to="/app/admin/assessment?section=tests&tab=student-tests" replace />} />

            <Route path="live-rooms" element={<Navigate to="/app/admin/comms?section=live&tab=rooms" replace />} />
            <Route path="live-participants" element={<Navigate to="/app/admin/comms?section=live&tab=participants" replace />} />

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
