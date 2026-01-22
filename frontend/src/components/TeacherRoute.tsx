import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";

type Props = {
  isTeacher: boolean;
  role?: string;
  loading?: boolean;
  children?: ReactNode;
};

const TeacherRoute = ({ isTeacher, role, loading, children }: Props) => {
  if (loading) return <Spin style={{ margin: 24 }} />;
  if (!isTeacher) {
    if (role === "admin") return <Navigate to="/app/admin/dashboard" replace />;
    if (role === "student") return <Navigate to="/app/student/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  // Agar children berilgan bo'lsa shu, bo'lmasa Outlet
  return <>{children ?? <Outlet />}</>;
};

export default TeacherRoute;
