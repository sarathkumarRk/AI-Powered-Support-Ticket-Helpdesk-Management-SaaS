import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  ArrowRight,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import api from "../../api/axios";

const statusStyles = {
  Open: "border-gray-300 bg-gray-100 text-gray-700",
  "In Progress": "border-red-200 bg-red-50 text-red-700",
  Resolved: "border-gray-400 bg-gray-200 text-gray-800",
  Closed: "border-gray-300 bg-white text-gray-600",
};

const priorityStyles = {
  Low: "border-gray-300 bg-gray-100 text-gray-600",
  Medium: "border-gray-400 bg-gray-200 text-gray-700",
  High: "border-red-200 bg-red-50 text-red-700",
  Urgent: "border-red-300 bg-red-100 text-red-800",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/tickets/"),
        api.get("/analytics/"),
        api.get("/auth/users"),
      ]);

      const [ticketResult, analyticsResult, usersResult] = results;

      if (ticketResult.status === "fulfilled") {
        const data = ticketResult.value.data;

        setTickets(
          Array.isArray(data)
            ? data
            : data.items || data.tickets || []
        );
      } else {
        throw ticketResult.reason;
      }

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value.data || {});
      } else {
        setAnalytics({});
        console.error(
          "Analytics could not be loaded:",
          analyticsResult.reason
        );
      }

      if (usersResult.status === "fulfilled") {
        const data = usersResult.value.data;

        setUsers(
          Array.isArray(data)
            ? data
            : data.items || data.users || []
        );
      } else {
        setUsers([]);
        console.error(
          "User list could not be loaded:",
          usersResult.reason
        );
      }
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to load the admin dashboard.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const openTickets = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressTickets = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  const closedTickets = tickets.filter(
    (ticket) => ticket.status === "Closed"
  ).length;

  const agents = users.filter(
    (user) => user.role?.toLowerCase() === "agent"
  );

  const recentTickets = [...tickets]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    )
    .slice(0, 5);

  const totalTickets =
    analytics.total_tickets ?? tickets.length;

  const totalResolved =
    analytics.resolved_tickets ?? resolvedTickets;

  const totalOpen =
    analytics.open_tickets ?? openTickets;

  const overdueTickets = analytics.overdue_tickets ?? 0;

  const averageResolution =
    analytics.average_resolution_time_hours;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <RefreshCw
          size={32}
          className="animate-spin text-red-600"
        />
        <p className="mt-4 text-sm text-gray-600">
          Loading admin dashboard...
        </p>
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle
            size={40}
            className="mx-auto text-red-600"
          />

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Dashboard unavailable
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            {error}
          </p>

          <button
            type="button"
            onClick={fetchDashboard}
            className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-700">
              Administration
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Monitor support tickets, users, and team workload.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDashboard}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <RefreshCw size={16} />
            Refresh Dashboard
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Tickets"
            value={totalTickets}
            icon={<Ticket size={21} />}
          />

          <SummaryCard
            title="Open Tickets"
            value={totalOpen}
            icon={<AlertCircle size={21} />}
          />

          <SummaryCard
            title="In Progress"
            value={inProgressTickets}
            icon={<Clock size={21} />}
          />

          <SummaryCard
            title="Resolved Tickets"
            value={totalResolved}
            icon={<CheckCircle2 size={21} />}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            title="Registered Agents"
            value={agents.length}
            description="Agents returned by the user API"
            icon={<Users size={20} />}
          />

          <MetricCard
            title="Overdue Tickets"
            value={overdueTickets}
            description="Based on available analytics data"
            icon={<AlertCircle size={20} />}
          />

          <MetricCard
            title="Average Resolution Time"
            value={
              averageResolution != null
                ? `${averageResolution} hrs`
                : "N/A"
            }
            description="Reported by the analytics service"
            icon={<BarChart3 size={20} />}
          />
        </div>

        {/* Ticket Status Overview */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-red-700">
              <ClipboardList size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Ticket Status Overview
              </h2>

              <p className="text-sm text-gray-500">
                Current status distribution.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <StatusProgress
              label="Open"
              count={openTickets}
              total={tickets.length}
            />

            <StatusProgress
              label="In Progress"
              count={inProgressTickets}
              total={tickets.length}
            />

            <StatusProgress
              label="Resolved"
              count={resolvedTickets}
              total={tickets.length}
            />

            <StatusProgress
              label="Closed"
              count={closedTickets}
              total={tickets.length}
            />
          </div>
        </section>

        {/* Recent Tickets */}
        <section className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-lg font-bold">
                Recent Tickets
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                The five most recently created tickets.
              </p>
            </div>

            <Link
              to="/tickets"
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800"
            >
              View Tickets
              <ArrowRight size={16} />
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Ticket
                size={36}
                className="mx-auto text-gray-400"
              />

              <p className="mt-3 font-semibold text-gray-800">
                No tickets available
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Tickets will appear here when created.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Ticket
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Priority
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Status
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Created
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {ticket.title}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          #{ticket.id} ·{" "}
                          {ticket.category || "General"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          value={ticket.priority || "Medium"}
                          styles={priorityStyles}
                        />
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          value={ticket.status || "Open"}
                          styles={statusStyles}
                        />
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(ticket.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                        >
                          View
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Agent Workload */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-red-700">
                <Users size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold">
                  Agent Workload
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Assigned ticket counts for available agent data.
                </p>
              </div>
            </div>
          </div>

          {agents.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Users
                size={34}
                className="mx-auto text-gray-400"
              />

              <p className="mt-3 font-semibold text-gray-800">
                Agent information unavailable
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Check whether the user service provides an agent list.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {agents.map((agent) => {
                const assignedCount = tickets.filter(
                  (ticket) =>
                    String(ticket.assigned_agent_id) ===
                    String(agent.id)
                ).length;

                const activeCount = tickets.filter(
                  (ticket) =>
                    String(ticket.assigned_agent_id) ===
                      String(agent.id) &&
                    ["Open", "In Progress"].includes(ticket.status)
                ).length;

                return (
                  <div
                    key={agent.id}
                    className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-gray-100 font-bold text-gray-700">
                        {(agent.name || agent.email || "A")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900">
                          {agent.name || "Unnamed Agent"}
                        </p>

                        <p className="text-sm text-gray-500">
                          {agent.email || "No email available"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-6 sm:gap-8">
                      <div>
                        <p className="text-xs text-gray-500">
                          Assigned
                        </p>

                        <p className="mt-1 text-lg font-bold">
                          {assignedCount}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Active
                        </p>

                        <p className="mt-1 text-lg font-bold text-red-700">
                          {activeCount}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">
          {title}
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-red-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function MetricCard({ title, value, description, icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">
          {title}
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-red-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}

function StatusProgress({ label, count, total }) {
  const percentage =
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">
          {label}
        </span>

        <span className="text-sm font-semibold text-gray-900">
          {count}{" "}
          <span className="font-normal text-gray-500">
            ({percentage}%)
          </span>
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-red-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Badge({ value, styles }) {
  const className =
    styles[value] || "border-gray-300 bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  );
}