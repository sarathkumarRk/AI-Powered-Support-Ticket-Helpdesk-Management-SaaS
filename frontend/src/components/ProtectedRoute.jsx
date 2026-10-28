import { Navigate, Outlet, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const ROLE_ROUTES = {
  admin: "/admin",
  agent: "/agent",
  customer: "/customer",
};

const ProtectedRoute = ({ allowedRoles }) => {
  const location = useLocation();

  const token = localStorage.getItem("access_token");

  let user = null;

  try {
    const storedUser = localStorage.getItem("user");
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    localStorage.removeItem("user");
  }

  // Check authentication
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Normalize role
  const role = String(user.role || "").toLowerCase();

  // Check authorization
  if (allowedRoles && !allowedRoles.includes(role)) {
    toast.error("You are not authorized to access this page.");

    return (
      <Navigate
        to={ROLE_ROUTES[role] || "/login"}
        replace
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;