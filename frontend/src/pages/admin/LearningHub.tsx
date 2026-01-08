import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSchedule from "./Schedule";
import AdminLessons from "./Lessons";
import AdminMaterials from "./Materials";
import AdminAssignments from "./Assignments";

const LearningHubPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sections = ["schedule", "lessons", "materials", "assignments"];
  const getSection = () => {
    const next = new URLSearchParams(location.search).get("section");
    return next && sections.includes(next) ? next : "schedule";
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
        { key: "schedule", label: "Jadval", children: renderTab("schedule", <AdminSchedule />) },
        { key: "lessons", label: "Darslar", children: renderTab("lessons", <AdminLessons />) },
        { key: "materials", label: "Materiallar", children: renderTab("materials", <AdminMaterials />) },
        { key: "assignments", label: "Topshiriqlar", children: renderTab("assignments", <AdminAssignments />) },
      ]}
    />
  );
};

export default LearningHubPage;
