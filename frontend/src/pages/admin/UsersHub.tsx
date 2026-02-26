import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminUsers from "./Users";

const UsersHubPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = ["users"];
  const getTab = () => {
    const next = new URLSearchParams(location.search).get("tab");
    return next && tabs.includes(next) ? next : "users";
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
        { key: "users", label: t("adminHub.users.users"), children: renderTab("users", <AdminUsers />) },
      ]}
    />
  );
};

export default UsersHubPage;
