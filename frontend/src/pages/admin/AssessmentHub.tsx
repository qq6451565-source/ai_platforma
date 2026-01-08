import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminTestsHub from "./TestsHub";
import AdminAssessment from "./Assessment";
import AdminProctoring from "./Proctoring";
import AdminAttendance from "./Attendance";
import AdminGradebook from "./Gradebook";
import AdminJournal from "./Journal";

const AssessmentHubPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sections = ["tests", "exams", "proctoring", "attendance", "gradebook", "journal"];
  const getSection = () => {
    const next = new URLSearchParams(location.search).get("section");
    return next && sections.includes(next) ? next : "tests";
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
        { key: "tests", label: "Test bank", children: renderTab("tests", <AdminTestsHub />) },
        { key: "exams", label: "Imtihonlar", children: renderTab("exams", <AdminAssessment />) },
        { key: "proctoring", label: "Proktor", children: renderTab("proctoring", <AdminProctoring />) },
        { key: "attendance", label: "Davomat", children: renderTab("attendance", <AdminAttendance />) },
        { key: "gradebook", label: "Baholar", children: renderTab("gradebook", <AdminGradebook />) },
        { key: "journal", label: "Jurnal", children: renderTab("journal", <AdminJournal />) },
      ]}
    />
  );
};

export default AssessmentHubPage;
