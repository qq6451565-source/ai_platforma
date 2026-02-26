import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminDirections from "./Directions";
import AdminSubjects from "./Subjects";
import AdminTeacherSubjects from "./TeacherSubjects";
import AdminGroups from "./Groups";

const UniversityHubPage = () => {
  const { t } = useTranslation();
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

  const renderTab = (key: string, node: JSX.Element) => (activeKey === key ? node : null);

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
