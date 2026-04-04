import AdminUsers from "./Users";
import { usePageTitle } from "../../hooks/usePageTitle";

const UsersHubPage = () => {
  usePageTitle('nav.users');
  return <AdminUsers />;
};

export default UsersHubPage;
