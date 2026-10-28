import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios";

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [ticketsResponse, analyticsResponse] = await Promise.all([
        api.get("/tickets/"),
        api.get("/analytics/"),
      ]);

      const ticketData = ticketsResponse.data;
      const analyticsData = analyticsResponse.data;

      setTickets(
        Array.isArray(ticketData)
          ? ticketData
          : ticketData.items || ticketData.tickets || []
      );

      setAnalytics(analyticsData);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to load dashboard data.";

      setError(
        typeof message === "string" ? message : "Unable to load dashboard."
      );

      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const allTickets = tickets;

  const openTickets = allTickets.filter(
    (ticket) => ticket.status?.toLowerCase() === "open"
  ).length;

  const inProgressTickets = allTickets.filter(
    (ticket) => ticket.status?.toLowerCase() === "in_progress"
  ).length;

  const resolvedTickets = allTickets.filter((ticket) =>
    ["resolved", "closed"].includes(ticket.status?.toLowerCase())
  ).length;

  const summaryCards = [
    {
      title: "Total Tickets",
      value: analytics?.total_tickets ?? allTickets.length,
    },
    {
      title: "Open Tickets",
      value: analytics?.open_tickets ?? openTickets,
    },
    {
      title: "In Progress",
      value: inProgressTickets,
    },
    {
      title: "Resolved Tickets",
      value: analytics?.resolved_tickets ?? resolvedTickets,
    },
  ];

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-red-50 text-red-700";

      case "in_progress":
        return "bg-orange-50 text-orange-700";

      case "resolved":
        return "bg-green-50 text-green-700";

      case "closed":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatStatus = (status) =>
    status?.replaceAll("_", " ") || "Unknown";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-red-600">
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-6">
          <p className="font-medium text-red-600">{error}</p>

          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-gray-500">
              Support Ticket Management
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Welcome back{user.name ? `, ${user.name}` : ""}!
              Here's your ticket overview.
            </p>
          </div>

          <Link
            to="/customer"
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            + Create Ticket
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">
                {card.title}
              </p>

              <p className="mt-3 text-3xl font-bold text-gray-900">
                {card.value}
              </p>

              <div className="mt-4 h-1 w-12 rounded bg-red-600" />
            </div>
          ))}
        </div>

        {/* Ticket Statistics */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Ticket Statistics
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current ticket status overview
            </p>

            <div className="mt-6 space-y-5">
              {[
                { label: "Open", count: openTickets },
                { label: "In Progress", count: inProgressTickets },
                { label: "Resolved / Closed", count: resolvedTickets },
              ].map((item) => {
                const total = allTickets.length;

                const percentage =
                  total > 0 ? (item.count / total) * 100 : 0;

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {item.label}
                      </span>

                      <span className="text-sm font-semibold text-gray-900">
                        {item.count}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-red-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Analytics Summary */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Analytics Overview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Information from the analytics service
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-sm text-gray-600">
                  Overdue Tickets
                </span>

                <span className="rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                  {analytics?.overdue_tickets ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <span className="text-sm text-gray-600">
                  Average Resolution Time
                </span>

                <span className="text-sm font-semibold text-gray-900">
                  {analytics?.average_resolution_time_hours != null
                    ? `${analytics.average_resolution_time_hours} hours`
                    : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Logged-in Role
                </span>

                <span className="rounded-md bg-red-50 px-3 py-1 text-sm font-semibold capitalize text-red-700">
                  {user.role || "User"}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Recent Tickets */}
        <section className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Tickets
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest tickets available to your account
              </p>
            </div>

            <button
              onClick={fetchDashboardData}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {allTickets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="font-semibold text-gray-900">
                No tickets found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Tickets will appear here when available.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Ticket
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Category
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Priority
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {allTickets.slice(0, 5).map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {ticket.title}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Ticket #{ticket.id}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {ticket.category || "General"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">
                          {ticket.priority || "Normal"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusStyle(
                            ticket.status
                          )}`}
                        >
                          {formatStatus(ticket.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;