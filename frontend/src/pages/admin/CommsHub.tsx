import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminAnnouncements from "./Announcements";
import AdminChat from "./Chat";
import AdminLiveHub from "./LiveHub";

const CommsHubPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sections = ["announcements", "chat", "live"];
  const getSection = () => {
    const next = new URLSearchParams(location.search).get("section");
    return next && sections.includes(next) ? next : "announcements";
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
        { key: "announcements", label: "E'lonlar", children: renderTab("announcements", <AdminAnnouncements />) },
        { key: "chat", label: "Chat", children: renderTab("chat", <AdminChat />) },
        { key: "live", label: "Live darslar", children: renderTab("live", <AdminLiveHub />) },
      ]}
    />
  );
};

export default CommsHubPage;
