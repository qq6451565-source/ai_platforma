import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLiveRooms from "./LiveRooms";
import AdminLiveParticipants from "./LiveParticipants";

const LiveHubPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = ["rooms", "participants"];
  const getTab = () => {
    const next = new URLSearchParams(location.search).get("tab");
    return next && tabs.includes(next) ? next : "rooms";
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
        { key: "rooms", label: "Live xonalar", children: renderTab("rooms", <AdminLiveRooms />) },
        { key: "participants", label: "Qatnashuvchilar", children: renderTab("participants", <AdminLiveParticipants />) },
      ]}
    />
  );
};

export default LiveHubPage;
