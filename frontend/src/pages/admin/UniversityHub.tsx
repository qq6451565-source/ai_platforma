import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminUniversity from "./University";
import AdminDirections from "./Directions";
import AdminSemesters from "./Semesters";
import AdminCurriculum from "./Curriculum";
import AdminSubjects from "./Subjects";
import AdminTeacherSubjects from "./TeacherSubjects";
import AdminGroups from "./Groups";

const UniversityHubPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sections = [
    "structure",
    "directions",
    "semesters",
    "curriculum",
    "subjects",
    "teacher-subjects",
    "groups",
  ];
  const getSection = () => {
    const next = new URLSearchParams(location.search).get("section");
    return next && sections.includes(next) ? next : "structure";
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
        { key: "structure", label: "Tuzilma", children: renderTab("structure", <AdminUniversity />) },
        { key: "directions", label: "Yo'nalishlar", children: renderTab("directions", <AdminDirections />) },
        { key: "semesters", label: "Semestrlar", children: renderTab("semesters", <AdminSemesters />) },
        { key: "curriculum", label: "O'quv reja", children: renderTab("curriculum", <AdminCurriculum />) },
        { key: "subjects", label: "Fanlar", children: renderTab("subjects", <AdminSubjects />) },
        { key: "teacher-subjects", label: "O'qituvchi-Fan", children: renderTab("teacher-subjects", <AdminTeacherSubjects />) },
        { key: "groups", label: "Guruhlar", children: renderTab("groups", <AdminGroups />) },
      ]}
    />
  );
};

export default UniversityHubPage;
