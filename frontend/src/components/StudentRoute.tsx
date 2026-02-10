import { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";

type Props = {
  role?: string;
  loading?: boolean;
  isPending?: boolean;
  children?: ReactNode;
};

const StudentRoute = ({ role, loading, isPending, children }: Props) => {
  const location = useLocation();
  if (loading) return <Spin style={{ margin: 24 }} />;
  if (role === "teacher") return <Navigate to="/app/teacher/dashboard" replace />;
  if (role === "admin") return <Navigate to="/app/admin/dashboard" replace />;
  if (role !== "student") return <Navigate to="/login" replace />;
  if (isPending && location.pathname !== "/app/student/profile") {
    return <Navigate to="/app/student/profile" replace />;
  }
  return <>{children ?? <Outlet />}</>;
};

export default StudentRoute;
