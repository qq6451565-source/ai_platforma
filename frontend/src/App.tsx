import { Spin } from "antd";
import type { MenuProps } from "antd";
import { ToastProvider } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
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
import { Suspense, lazy, useEffect, useMemo, type ComponentType, type LazyExoticComponent } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentRoute from "./components/StudentRoute";
import { clearTokens } from "./utils/token";
import { logout } from "./api/auth";
import { syncLiveRooms } from "./api/live";
import TeacherRoute from "./components/TeacherRoute";
import AdminRoute from "./components/AdminRoute";
import { getAccessToken } from "./utils/token";
import { getDefaultRedirect } from "./utils/roleRedirect";
import { useMe } from "./hooks/useMe";
import { ResponsiveLayout } from "./components/Layout";
import "./App.css";

type LazyPageComponent = LazyExoticComponent<ComponentType<object>>;

const LandingPage = lazy(() => import("./pages/Landing"));
const LoginPage = lazy(() => import("./pages/Login"));
const RegisterPage = lazy(() => import("./pages/Register"));
const AdminLoginPage = lazy(() => import("./pages/AdminLogin"));
const LiveRoomPage = lazy(() => import("./pages/live/Room"));
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const StudentSchedule = lazy(() => import("./pages/student/Schedule"));
const StudentAssignments = lazy(() => import("./pages/student/Assignments"));
const StudentMaterials = lazy(() => import("./pages/student/Materials"));
const StudentTests = lazy(() => import("./pages/student/Tests"));
const StudentGrades = lazy(() => import("./pages/student/Grades"));
const StudentProfile = lazy(() => import("./pages/student/Profile"));
const StudentAttendance = lazy(() => import("./pages/student/Attendance"));
const StudentVideoLesson = lazy(() => import("./pages/student/VideoLesson"));
const TeacherDashboard = lazy(() => import("./pages/teacher/Dashboard"));
const TeacherLessons = lazy(() => import("./pages/teacher/Lessons"));
const TeacherLive = lazy(() => import("./pages/teacher/Live"));
const TeacherAssignments = lazy(() => import("./pages/teacher/Assignments"));
const TeacherTests = lazy(() => import("./pages/teacher/Tests"));
const TeacherGrades = lazy(() => import("./pages/teacher/Grades"));
const TeacherAttendance = lazy(() => import("./pages/teacher/Attendance"));
const TeacherMaterials = lazy(() => import("./pages/teacher/Materials"));
const TeacherSubmissions = lazy(() => import("./pages/teacher/Submissions"));
const TeacherProfile = lazy(() => import("./pages/teacher/Profile"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsersHub = lazy(() => import("./pages/admin/UsersHub"));
const AdminEnrollmentHub = lazy(() => import("./pages/admin/EnrollmentHub"));
const AdminAISettings = lazy(() => import("./pages/admin/AISettings"));
const AdminUniversityHub = lazy(() => import("./pages/admin/UniversityHub"));
const AdminLearningHub = lazy(() => import("./pages/admin/LearningHub"));
const AdminProfile = lazy(() => import("./pages/admin/Profile"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));

const PageFallback = ({ fullscreen = false }: { fullscreen?: boolean }) => (
  <div
    className={fullscreen ? "flex-center h-screen" : "flex-center"}
    style={fullscreen ? undefined : { minHeight: "40vh" }}
  >
    <Spin size="large" />
  </div>
);

const LazyPageRoute = ({ component: Component, fullscreen = false }: { component: LazyPageComponent; fullscreen?: boolean }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageFallback fullscreen={fullscreen} />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

const AppLayout = ({ user, isLoading }: { user: any; isLoading: boolean }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isPendingStudent = isStudent && !user?.group;

  const studentGroup = useMemo((): MenuProps['items'] => [
    { key: "student/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { key: "student/schedule", label: t('nav.schedule'), icon: <CalendarOutlined /> },
    { key: "student/materials", label: t('nav.materials'), icon: <ReadOutlined /> },
    { key: "student/assignments", label: t('nav.assignments'), icon: <FileTextOutlined /> },
    { key: "student/tests", label: t('nav.tests'), icon: <ExperimentOutlined /> },
    { key: "student/grades", label: t('nav.grades'), icon: <FileDoneOutlined /> },
    { key: "student/attendance", label: t('nav.attendance'), icon: <TeamOutlined /> },
  ], [t]);

  const pendingStudentGroup = useMemo((): MenuProps['items'] => [], [t]);

  const teacherGroup = useMemo((): MenuProps['items'] => [
    { key: "teacher/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { key: "teacher/lessons", label: t('nav.schedule'), icon: <CalendarOutlined /> },
    { key: "teacher/assignments", label: t('nav.assignments'), icon: <FileTextOutlined /> },
    { key: "teacher/tests", label: t('nav.tests'), icon: <ExperimentOutlined /> },
    { key: "teacher/grades", label: t('nav.grades'), icon: <FileDoneOutlined /> },
    { key: "teacher/attendance", label: t('nav.attendance'), icon: <TeamOutlined /> },
    { key: "teacher/materials", label: t('nav.materials'), icon: <ReadOutlined /> },
    { key: "teacher/submissions", label: t('nav.submissions'), icon: <FileDoneOutlined /> },
  ], [t]);

  const adminGroup = useMemo((): MenuProps['items'] => [
    { key: "admin/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { key: "admin/users", label: t('nav.users'), icon: <TeamOutlined /> },
    { key: "admin/university", label: t('nav.university'), icon: <BookOutlined /> },
    { key: "admin/learning", label: t('nav.learning'), icon: <CalendarOutlined /> },
    { key: "admin/enrollment", label: t('nav.enrollment'), icon: <FileTextOutlined /> },
    { key: "admin/audit-logs", label: t('nav.auditLogs'), icon: <FileDoneOutlined /> },
    { key: "admin/ai-settings", label: t('nav.aiSettings'), icon: <SettingOutlined /> },
  ], [t]);

  const items = isAdmin ? adminGroup : isTeacher ? teacherGroup : isPendingStudent ? pendingStudentGroup : studentGroup;

  useEffect(() => {
    if (!user || isLoading) return;
    const role = user.role;
    const canSync = role === "teacher" || role === "admin";
    const liveRouteActive = location.pathname.startsWith("/app/live/");
    if (!canSync || liveRouteActive) return;

    const runSync = async () => {
      try { await syncLiveRooms(); } catch { }
    };
    runSync();
    const timer = setInterval(runSync, 60_000);
    return () => clearInterval(timer);
  }, [user, isLoading, location.pathname]);

  const selectedPath = location.pathname.startsWith("/app/") ? location.pathname.replace("/app/", "") : "";
  const isLiveRoute = selectedPath.startsWith("live/");

  const handleLogout = async () => {
    try { await logout(); } catch { }
    clearTokens();
    qc.clear();
    window.location.href = isAdmin ? "/admin-login" : "/login";
  };

  const title = useMemo(() => {
    if (isAdmin) return t('roles.admin');
    if (isTeacher) return t('roles.teacher');
    return t('roles.student');
  }, [isAdmin, isTeacher, t]);

  if (isLiveRoute) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageFallback fullscreen />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ResponsiveLayout user={user} items={items} onLogout={handleLogout} title={title}>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </ResponsiveLayout>
  );
};

const App = () => {
  const token = getAccessToken();
  const { data: user, isLoading, isError, error } = useMe();
  const qc = useQueryClient();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isPendingStudent = isStudent && !user?.group;
  const meStatus = (error as any)?.response?.status;
  const authResolving = !!token && !user && (isLoading || (isError && meStatus !== 401 && meStatus !== 403));
  const isAuthenticated = !!token && !!user;

  // Public routes that should never be blocked by auth resolution
  const isPublicRoute = ['/', '/login', '/register', '/admin-login'].includes(location.pathname);

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

  // Only show auth-resolving spinner on protected routes (e.g. /app/*),
  // never block public pages like Landing, Login, Register
  if (authResolving && !isPublicRoute) {
    return (
      <div className="flex-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LazyPageRoute component={LandingPage} fullscreen />} />
          <Route path="/login" element={<LazyPageRoute component={LoginPage} fullscreen />} />
          <Route path="/admin-login" element={<LazyPageRoute component={AdminLoginPage} fullscreen />} />
          <Route path="/register" element={<LazyPageRoute component={RegisterPage} fullscreen />} />
          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} loading={isLoading} />}>
            <Route path="/app" element={<AppLayout user={user} isLoading={isLoading} />}>
              <Route path="live/:lessonId" element={<LiveRoomPage />} />
              <Route path="lesson-video/:lessonId" element={<StudentVideoLesson />} />
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
                <Route path="live" element={<TeacherLive />} />
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
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="*" element={<Navigate to="/app/admin/dashboard" replace />} />
              </Route>
              <Route index element={<Navigate to={getDefaultRedirect(user?.role, isPendingStudent)} replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
