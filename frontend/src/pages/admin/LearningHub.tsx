import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLessons from "./Lessons";
import AdminMaterials from "./Materials";
import AdminAssignments from "./Assignments";
import AdminSubmissions from "./Submissions";
import AdminTests from "./Tests";
import AdminAttendance from "./Attendance";
import AdminGradebook from "./Gradebook";

const LearningHubPage = () => {
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

  const renderTab = (key: string, node: JSX.Element) => (activeKey === key ? node : null);

  return (
    <Tabs
      activeKey={activeKey}
      onChange={onChange}
      destroyInactiveTabPane
      items={[
        { key: "lessons", label: "Dars jadvali", children: renderTab("lessons", <AdminLessons />) },
        { key: "materials", label: "Materiallar", children: renderTab("materials", <AdminMaterials />) },
        { key: "assignments", label: "Topshiriqlar", children: renderTab("assignments", <AdminAssignments />) },
        { key: "submissions", label: "Yuborilganlar", children: renderTab("submissions", <AdminSubmissions />) },
        { key: "tests", label: "Testlar", children: renderTab("tests", <AdminTests />) },
        { key: "attendance", label: "Davomat", children: renderTab("attendance", <AdminAttendance />) },
        { key: "gradebook", label: "Baholar", children: renderTab("gradebook", <AdminGradebook />) },
      ]}
    />
  );
};

export default LearningHubPage;
