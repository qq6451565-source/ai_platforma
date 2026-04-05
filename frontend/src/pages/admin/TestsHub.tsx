import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminTests from "./Tests";
import AdminTestQuestions from "./TestQuestions";
import AdminTestOptions from "./TestOptions";
import AdminStudentTests from "./StudentTests";

const TestsHubPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = ["tests", "questions", "options", "student-tests"];
  const getTab = () => {
    const next = new URLSearchParams(location.search).get("tab");
    return next && tabs.includes(next) ? next : "tests";
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
        { key: "tests", label: t('adminTests.tests'), children: renderTab("tests", <AdminTests />) },
        { key: "questions", label: t('adminTests.questions'), children: renderTab("questions", <AdminTestQuestions />) },
        { key: "options", label: t('adminTests.options'), children: renderTab("options", <AdminTestOptions />) },
        { key: "student-tests", label: t('adminTests.studentTests'), children: renderTab("student-tests", <AdminStudentTests />) },
      ]}
    />
  );
};

export default TestsHubPage;
