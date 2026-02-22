import { Spin } from "antd";
import { ToastProvider } from "./components/ui";
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
import { Navigate, Route, Routes, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import Landing from "./pages/Landing";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import AdminLoginPage from "./pages/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentRoute from "./components/StudentRoute";
import { clearTokens } from "./utils/token";
import { logout } from "./api/auth";
import { syncLiveRooms } from "./api/live";
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
import { ResponsiveLayout } from "./components/Layout";
import "./App.css";

const AppLayout = ({ user, isLoading }: { user: any; isLoading: boolean }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isPendingStudent = isStudent && !user?.group;

  const studentGroup = useMemo(() => [
    {
      label: t('nav.student'),
      children: [
        { key: "student/dashboard", label: t('nav.dashboard'), icon: <DashboardOutlined /> },
        { key: "student/schedule", label: t('nav.schedule'), icon: <CalendarOutlined /> },
        { key: "student/materials", label: t('nav.materials'), icon: <ReadOutlined /> },
        { key: "student/assignments", label: t('nav.assignments'), icon: <FileTextOutlined /> },
        { key: "student/tests", label: t('nav.tests'), icon: <ExperimentOutlined /> },
        { key: "student/grades", label: t('nav.grades'), icon: <FileDoneOutlined /> },
        { key: "student/attendance", label: t('nav.attendance'), icon: <TeamOutlined /> },
        { key: "student/profile", label: t('nav.profile'), icon: <UserOutlined /> },
      ],
    },
  ], [t]);

  const pendingStudentGroup = useMemo(() => [
    {
      label: t('nav.student'),
      children: [
        { key: "student/profile", label: t('nav.profile'), icon: <UserOutlined /> },
      ],
    },
  ], [t]);

  const teacherGroup = useMemo(() => [
    {
      label: t('nav.teacher'),
      children: [
        { key: "teacher/dashboard", label: t('nav.dashboard'), icon: <DashboardOutlined /> },
        { key: "teacher/lessons", label: t('nav.schedule'), icon: <CalendarOutlined /> },
        { key: "teacher/assignments", label: t('nav.assignments'), icon: <FileTextOutlined /> },
        { key: "teacher/tests", label: t('nav.tests'), icon: <ExperimentOutlined /> },
        { key: "teacher/grades", label: t('nav.grades'), icon: <FileDoneOutlined /> },
        { key: "teacher/attendance", label: t('nav.attendance'), icon: <TeamOutlined /> },
        { key: "teacher/materials", label: t('nav.materials'), icon: <ReadOutlined /> },
        { key: "teacher/submissions", label: t('nav.submissions'), icon: <FileDoneOutlined /> },
        { key: "teacher/profile", label: t('nav.profile'), icon: <UserOutlined /> },
      ],
    },
  ], [t]);

  const adminGroup = useMemo(() => [
    {
      label: t('nav.main'),
      children: [
        { key: "admin/dashboard", label: t('nav.dashboard'), icon: <DashboardOutlined /> },
        { key: "admin/profile", label: t('nav.profile'), icon: <UserOutlined /> },
      ],
    },
    {
      label: t('nav.academic'),
      children: [
        { key: "admin/users", label: t('nav.users'), icon: <TeamOutlined /> },
        { key: "admin/university", label: t('nav.university'), icon: <BookOutlined /> },
        { key: "admin/learning", label: t('nav.learning'), icon: <CalendarOutlined /> },
        { key: "admin/enrollment", label: t('nav.enrollment'), icon: <FileTextOutlined /> },
      ],
    },
    {
      label: t('nav.system'),
      children: [{ key: "admin/ai-settings", label: t('nav.aiSettings'), icon: <SettingOutlined /> }],
    },
  ], [t]);

  const items = isAdmin ? adminGroup : isTeacher ? teacherGroup : isPendingStudent ? pendingStudentGroup : studentGroup;

  useEffect(() => {
    if (!user || isLoading) return;
    const runSync = async () => {
      try { await syncLiveRooms(); } catch {}
    };
    runSync();
    const timer = setInterval(runSync, 60_000);
    return () => clearInterval(timer);
  }, [user, isLoading]);

  const selectedPath = location.pathname.startsWith("/app/") ? location.pathname.replace("/app/", "") : "";
  const isLiveRoute = selectedPath.startsWith("live/");

  const handleLogout = async () => {
    try { await logout(); } catch {}
    clearTokens();
    qc.clear();
    window.location.href = isAdmin ? "/admin-login" : "/login";
  };

  const title = useMemo(() => {
    if (isAdmin) return t('roles.admin');
    if (isTeacher) return t('roles.teacher');
    return t('roles.student');
  }, [isAdmin, isTeacher, t]);

  if (isLiveRoute) return <Outlet />;

  return (
    <ResponsiveLayout user={user} items={items} onLogout={handleLogout} title={title}>
      <Outlet />
    </ResponsiveLayout>
  );
};

const App = () => {
  const token = getAccessToken();
  const { data: user, isLoading, isError, error } = useMe();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isPendingStudent = isStudent && !user?.group;
  const meStatus = (error as any)?.response?.status;
  const authResolving = !!token && !user && (isLoading || (isError && meStatus !== 401 && meStatus !== 403));
  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    if (!token || !isError) return;
    if (meStatus === 401 || meStatus === 403) {
      clearTokens();
      window.location.replace("/login");
      return;
    }
    const retryId = window.setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["me", token] });
    }, 1500);
    return () => window.clearTimeout(retryId);
  }, [token, isError, meStatus, qc]);

  if (authResolving) {
    return (
      <div className="flex-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={isLoading} />}>
          <Route path="/app" element={<AppLayout user={user} isLoading={isLoading} />}>
            <Route path="live/:lessonId" element={<LiveRoomPage />} />
            <Route path="student" element={<StudentRoute role={user?.role} loading={isLoading} isPending={isPendingStudent} />}>
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
              <Route path="*" element={<Navigate to="/app/admin/dashboard" replace />} />
            </Route>
            <Route index element={<Navigate to={getDefaultRedirect(user?.role, isPendingStudent)} replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
};

export default App;
