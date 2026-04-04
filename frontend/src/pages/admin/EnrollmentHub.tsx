import { lazy, Suspense, useEffect, useState } from "react";
import { Tabs, Spin } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";

const AdminEnrollment = lazy(() => import("./Enrollment"));
const EnrollmentWindowsPage = lazy(() => import("./EnrollmentWindows"));

const EnrollmentHubPage = () => {
  const { t } = useTranslation();
  usePageTitle('nav.enrollment');
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = ["applicants", "windows"];
  const getTab = () => {
    const next = new URLSearchParams(location.search).get("tab");
    return next && tabs.includes(next) ? next : "applicants";
  };
  const [activeKey, setActiveKey] = useState(getTab());

  useEffect(() => {
    const next = getTab();
    if (next !== activeKey) {
      setActiveKey(next);
    }
  }, [location.search, activeKey]);

  const onChange = (key: string) => {
    setActiveKey(key);
    const params = new URLSearchParams(location.search);
    params.set("tab", key);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const renderTab = (key: string, node: JSX.Element) =>
    activeKey === key ? <Suspense fallback={<Spin style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }} />}>{node}</Suspense> : null;

  return (
    <Tabs
      activeKey={activeKey}
      onChange={onChange}
      destroyInactiveTabPane
      items={[
        { key: "applicants", label: t("adminHub.enrollment.applicants"), children: renderTab("applicants", <AdminEnrollment />) },
        { key: "windows", label: t("adminHub.enrollment.windows"), children: renderTab("windows", <EnrollmentWindowsPage />) },
      ]}
    />
  );
};

export default EnrollmentHubPage;
