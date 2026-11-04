import { useParams } from "react-router";
import { AccountScreen } from "../admin/AccountScreen.tsx";

/** `/admin/users/:id`: one account and the admin's actions on it, under the admin layout. */
export default function AdminUserRoute() {
  const { id = "" } = useParams();
  return <AccountScreen key={id} userId={id} />;
}
