import { lazy, Suspense, useEffect, useState } from "react";
import { Tabs, Spin } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";

const AdminLessons = lazy(() => import("./Lessons"));
const AdminMaterials = lazy(() => import("./Materials"));
const AdminAssignments = lazy(() => import("./Assignments"));
const AdminSubmissions = lazy(() => import("./Submissions"));
const AdminTests = lazy(() => import("./Tests"));
const AdminAttendance = lazy(() => import("./Attendance"));
const AdminGradebook = lazy(() => import("./Gradebook"));

const LearningHubPage = () => {
  const { t } = useTranslation();
  usePageTitle('nav.learning');
  const location = useLocation();
  const navigate = useNavigate();
  const sections = ["lessons", "materials", "assignments", "submissions", "tests", "attendance", "gradebook"];
  const getSection = () => {
    const next = new URLSearchParams(location.search).get("section");
    return next && sections.includes(next) ? next : "lessons";
  };
  const [activeKey, setActiveKey] = useState(getSection());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const next = getSection();
    if (params.get("section") !== next) {
      params.set("section", next);
      navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
    }
    if (next !== activeKey) {
      setActiveKey(next);
    }
  }, [location.search, location.pathname, activeKey, navigate]);

  const onChange = (key: string) => {
    setActiveKey(key);
    const params = new URLSearchParams(location.search);
    params.set("section", key);
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
        { key: "lessons", label: t("adminHub.learning.lessons"), children: renderTab("lessons", <AdminLessons />) },
        { key: "materials", label: t("adminHub.learning.materials"), children: renderTab("materials", <AdminMaterials />) },
        { key: "assignments", label: t("adminHub.learning.assignments"), children: renderTab("assignments", <AdminAssignments />) },
        { key: "submissions", label: t("adminHub.learning.submissions"), children: renderTab("submissions", <AdminSubmissions />) },
        { key: "tests", label: t("adminHub.learning.tests"), children: renderTab("tests", <AdminTests />) },
        { key: "attendance", label: t("adminHub.learning.attendance"), children: renderTab("attendance", <AdminAttendance />) },
        { key: "gradebook", label: t("adminHub.learning.gradebook"), children: renderTab("gradebook", <AdminGradebook />) },
      ]}
    />
  );
};

export default LearningHubPage;
