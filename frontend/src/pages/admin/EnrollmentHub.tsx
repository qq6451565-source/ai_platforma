import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminEnrollment from "./Enrollment";
import EnrollmentWindowsPage from "./EnrollmentWindows";

const EnrollmentHubPage = () => {
  const { t } = useTranslation();
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

  const renderTab = (key: string, node: JSX.Element) => (activeKey === key ? node : null);

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
