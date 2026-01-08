import { useEffect, useState } from "react";
import { Tabs } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import AdminUsers from "./Users";
import AdminProfiles from "./Profiles";
import PassportDataPage from "./PassportData";
import AuditLogsPage from "./AuditLogs";
import AuthGroupsPage from "./AuthGroups";
import AuthTokensPage from "./AuthTokens";
import TokenBlacklistPage from "./TokenBlacklist";

const UsersHubPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = ["users", "profiles", "passports", "audit", "auth-groups", "auth-tokens", "token-blacklist"];
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
        { key: "users", label: "Foydalanuvchilar", children: renderTab("users", <AdminUsers />) },
        { key: "profiles", label: "Profillar", children: renderTab("profiles", <AdminProfiles />) },
        { key: "passports", label: "Pasport ma'lumotlari", children: renderTab("passports", <PassportDataPage />) },
        { key: "audit", label: "Audit loglar", children: renderTab("audit", <AuditLogsPage />) },
        { key: "auth-groups", label: "Auth guruhlari", children: renderTab("auth-groups", <AuthGroupsPage />) },
        { key: "auth-tokens", label: "API tokenlar", children: renderTab("auth-tokens", <AuthTokensPage />) },
        { key: "token-blacklist", label: "Token qora ro'yxat", children: renderTab("token-blacklist", <TokenBlacklistPage />) },
      ]}
    />
  );
};

export default UsersHubPage;
