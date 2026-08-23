import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminRoute() {
  const { user } = useAuth();

  if (!user?.is_admin) {
    return <Navigate to="/agenda" replace />;
  }

  return <Outlet />;
}
