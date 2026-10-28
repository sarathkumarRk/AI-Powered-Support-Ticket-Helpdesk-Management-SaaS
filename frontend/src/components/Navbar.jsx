import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LogOut, UserCircle } from "lucide-react";
import toast from "react-hot-toast";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const token = localStorage.getItem("access_token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const role = String(user?.role || "").toLowerCase();

  const links = {
    admin: [
      { label: "Dashboard", path: "/admin" },
      { label: "Manage Users", path: "/admin/users" },
      { label: "Assign Tickets", path: "/admin/assign-tickets" },
    ],
    agent: [
      { label: "My Tickets", path: "/agent" },
    ],
    customer: [
      { label: "My Tickets", path: "/customer" },
    ],
  };

  const navLinks = links[role] || [];

  // Determine a safe dashboard path for the logged-in role.
  const dashboardPath = {
    admin: "/admin",
    agent: "/dashboard",
    customer: "/customer",
  }[role] || "/login";

  // Ticket Details requires a ticket ID.
  const ticketId = location.pathname.match(/^\/tickets\/([^/]+)\/?$/)?.[1];

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    toast.success("Logged out successfully!");

    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const handleTicketDetailsClick = () => {
    setMenuOpen(false);

    if (ticketId) {
      navigate(`/tickets/${ticketId}`);
      return;
    }

    // No ticket ID is available from the navbar.
    // Open the user's ticket list so they can select a ticket.
    if (role === "customer") {
      navigate("/customer");
    } else if (role === "agent") {
      navigate("/agent");
    } else if (role === "admin") {
      navigate("/admin/assign-tickets");
    } else {
      navigate("/login");
    }
  };

  if (!token || !user) {
    return null;
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          to={dashboardPath}
          className="text-lg font-bold text-red-600 sm:text-xl"
        >
          Support Tickets
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition hover:text-red-600 ${
                location.pathname === link.path
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={handleTicketDetailsClick}
            className={`text-sm font-medium transition hover:text-red-600 ${
              location.pathname.startsWith("/tickets/")
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            Ticket Details
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-700">
            <UserCircle size={20} className="text-gray-500" />

            <span>
              {user.name || user.email || "User"}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen((previous) => !previous)}
          className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-red-600"
              >
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={handleTicketDetailsClick}
              className="text-left text-sm font-medium text-gray-700 hover:text-red-600"
            >
              Ticket Details
            </button>

            <div className="border-t border-gray-200 pt-3 text-sm text-gray-600">
              {user.name || user.email || "User"}

              <span className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs uppercase">
                {role}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;