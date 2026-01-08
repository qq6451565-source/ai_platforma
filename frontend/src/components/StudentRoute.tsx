import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";

type Props = {
  role?: "student" | "teacher" | "admin";
  loading?: boolean;
  children?: ReactNode;
};

const StudentRoute = ({ role, loading, children }: Props) => {
  if (loading) return <Spin style={{ margin: 24 }} />;
  if (role === "teacher") return <Navigate to="/app/teacher/dashboard" replace />;
  if (role === "admin") return <Navigate to="/app/admin/dashboard" replace />;
  if (role !== "student") return <Navigate to="/login" replace />;
  return <>{children ?? <Outlet />}</>;
};

export default StudentRoute;
