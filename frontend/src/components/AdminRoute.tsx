import { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";

type Props = {
  isAdmin: boolean;
  role?: string;
  loading?: boolean;
  children?: ReactNode;
};

const AdminRoute = ({ isAdmin, role, loading, children }: Props) => {
  if (loading) return <Spin style={{ margin: 24 }} />;
  if (!isAdmin) {
    if (role === "teacher") return <Navigate to="/app/teacher/dashboard" replace />;
    if (role === "student") return <Navigate to="/app/student/dashboard" replace />;
    return <Navigate to="/admin-login" replace />;
  }
  return <>{children ?? <Outlet />}</>;
};

export default AdminRoute;
