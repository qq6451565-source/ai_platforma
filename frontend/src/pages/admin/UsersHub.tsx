import { lazy, Suspense } from "react";
import { Spin } from "antd";
import { usePageTitle } from "../../hooks/usePageTitle";

const AdminUsers = lazy(() => import("./Users"));

const UsersHubPage = () => {
  usePageTitle('nav.users');
  return (
    <Suspense fallback={<Spin style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }} />}>
      <AdminUsers />
    </Suspense>
  );
};

export default UsersHubPage;
