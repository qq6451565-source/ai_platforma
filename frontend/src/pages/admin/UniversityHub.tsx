import { lazy, Suspense, useEffect, useState } from "react";
import { Tabs, Spin } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";

const AdminDirections = lazy(() => import("./Directions"));
const AdminSubjects = lazy(() => import("./Subjects"));
const AdminTeacherSubjects = lazy(() => import("./TeacherSubjects"));
const AdminGroups = lazy(() => import("./Groups"));

const UniversityHubPage = () => {
  const { t } = useTranslation();
  usePageTitle('nav.university');
  const location = useLocation();
  const navigate = useNavigate();
  const sections = ["directions", "subjects", "teacher-subjects", "groups"];
  const getSection = () => {
    const next = new URLSearchParams(location.search).get("section");
    return next && sections.includes(next) ? next : "directions";
  };
  const [activeKey, setActiveKey] = useState(getSection());

  useEffect(() => {
    const next = getSection();
    if (next !== activeKey) {
      setActiveKey(next);
    }
  }, [location.search, activeKey]);

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
        { key: "directions", label: t("adminHub.university.directions"), children: renderTab("directions", <AdminDirections />) },
        { key: "subjects", label: t("adminHub.university.subjects"), children: renderTab("subjects", <AdminSubjects />) },
        { key: "teacher-subjects", label: t("adminHub.university.teacherSubjects"), children: renderTab("teacher-subjects", <AdminTeacherSubjects />) },
        { key: "groups", label: t("adminHub.university.groups"), children: renderTab("groups", <AdminGroups />) },
      ]}
    />
  );
};

export default UniversityHubPage;
