import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "../components/Navbar";
import ProtectedRoute from "../components/ProtectedRoute";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import Dashboard from "../pages/dashboard/Dashboard";
import CustomerPortal from "../pages/customer/CustomerPortal";
import AgentWorkspace from "../pages/agent/AgentWorkspace";

import AdminDashboard from "../pages/admin/AdminDashboard";
import ManageUsers from "../pages/admin/ManageUsers";
import AssignTickets from "../pages/admin/AssignTickets";

import TicketDetails from "../pages/tickets/TicketDetails";

function AppRoutes() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Common Dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Customer Routes */}
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/customer" element={<CustomerPortal />} />
        </Route>

        {/* Agent Routes */}
        <Route element={<ProtectedRoute allowedRoles={["agent"]} />}>
          <Route path="/agent" element={<AgentWorkspace />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/assign-tickets" element={<AssignTickets />} />
        </Route>

        {/* Ticket Details */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={["admin", "agent", "customer"]}
            />
          }
        >
          <Route
            path="/tickets/:ticketId"
            element={<TicketDetails />}
          />
        </Route>

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default AppRoutes;