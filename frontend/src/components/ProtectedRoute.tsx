import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";

type Props = {
  isAuthenticated: boolean;
  loading?: boolean;
};

const ProtectedRoute = ({ isAuthenticated, loading }: Props) => {
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (isAuthenticated) return <Outlet />;
  if (location.pathname.startsWith("/app/admin")) {
    return <Navigate to="/admin-login" replace />;
  }
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
