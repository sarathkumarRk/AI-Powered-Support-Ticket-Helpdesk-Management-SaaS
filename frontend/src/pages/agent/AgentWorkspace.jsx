import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search,
  RefreshCw,
  ClipboardList,
  Clock,
  CheckCircle2,
  MessageSquare,
  Eye,
  AlertCircle,
} from "lucide-react";
import api from "../../api/axios";

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "Closed"];

const statusStyles = {
  Open: "bg-gray-100 text-gray-700 border-gray-300",
  "In Progress": "bg-red-50 text-red-700 border-red-200",
  Resolved: "bg-gray-200 text-gray-800 border-gray-400",
  Closed: "bg-white text-gray-600 border-gray-300",
};

const priorityStyles = {
  Low: "bg-gray-100 text-gray-600 border-gray-300",
  Medium: "bg-gray-200 text-gray-700 border-gray-400",
  High: "bg-red-50 text-red-700 border-red-200",
  Urgent: "bg-red-100 text-red-800 border-red-300",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

export default function AgentWorkspace() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingId, setUpdatingId] = useState(null);
  const [commentingId, setCommentingId] = useState(null);

  const [statusChanges, setStatusChanges] = useState({});
  const [comments, setComments] = useState({});

  async function fetchTickets() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/tickets/");

      const data = response.data;
      const ticketList = Array.isArray(data)
        ? data
        : data.items || data.tickets || [];

      setTickets(ticketList);
    } catch (err) {
      const message =
        err.response?.data?.detail || "Unable to load assigned tickets.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        String(ticket.id).toLowerCase().includes(searchText) ||
        (ticket.title || "").toLowerCase().includes(searchText) ||
        (ticket.description || "").toLowerCase().includes(searchText) ||
        (ticket.category || "").toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  const openCount = tickets.filter(
    (ticket) => ticket.status === "Open"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  async function handleStatusUpdate(ticket) {
    const newStatus = statusChanges[ticket.id];

    if (!newStatus || newStatus === ticket.status) {
      toast.error("Please select a different status.");
      return;
    }

    const confirmed = window.confirm(
      `Update ticket #${ticket.id} to "${newStatus}"?`
    );

    if (!confirmed) return;

    setUpdatingId(ticket.id);

    try {
      await api.patch(`/tickets/${ticket.id}`, {
        status: newStatus,
      });

      setTickets((previous) =>
        previous.map((item) =>
          item.id === ticket.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setStatusChanges((previous) => ({
        ...previous,
        [ticket.id]: "",
      }));

      toast.success("Ticket status updated successfully.");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to update ticket status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddComment(ticket) {
    const comment = (comments[ticket.id] || "").trim();

    if (!comment) {
      toast.error("Please enter a comment.");
      return;
    }

    setCommentingId(ticket.id);

    try {
      await api.post(`/tickets/${ticket.id}/comments`, {
        comment,
      });

      setComments((previous) => ({
        ...previous,
        [ticket.id]: "",
      }));

      toast.success("Comment added successfully.");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to add comment."
      );
    } finally {
      setCommentingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-700">
              Support Team
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Agent Workspace
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Manage assigned tickets, update statuses, and add comments.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchTickets}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Assigned Tickets"
            value={tickets.length}
            icon={<ClipboardList size={21} />}
          />

          <SummaryCard
            title="Open Tickets"
            value={openCount}
            icon={<AlertCircle size={21} />}
          />

          <SummaryCard
            title="In Progress"
            value={inProgressCount}
            icon={<Clock size={21} />}
          />

          <SummaryCard
            title="Resolved"
            value={resolvedCount}
            icon={<CheckCircle2 size={21} />}
          />
        </div>

        {/* Ticket List */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold">My Assigned Tickets</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Search tickets and manage their status.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tickets..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 sm:w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="All">All Statuses</option>

                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <RefreshCw
                size={30}
                className="animate-spin text-red-600"
              />
              <p className="mt-4 text-sm text-gray-500">
                Loading assigned tickets...
              </p>
            </div>
          ) : error && tickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <AlertCircle
                size={36}
                className="mx-auto text-red-600"
              />

              <p className="mt-3 font-semibold text-gray-800">
                Unable to load tickets
              </p>

              <p className="mt-1 text-sm text-gray-500">{error}</p>

              <button
                type="button"
                onClick={fetchTickets}
                className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <ClipboardList
                size={38}
                className="mx-auto text-gray-400"
              />

              <h3 className="mt-4 font-semibold text-gray-800">
                No tickets found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {tickets.length === 0
                  ? "You don't have any assigned tickets yet."
                  : "Try changing your search or status filter."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Ticket</th>
                      <th className="px-6 py-4 font-semibold">Priority</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Created</th>
                      <th className="px-6 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            {ticket.title}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            #{ticket.id} · {ticket.category || "General"}
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
                            <Eye size={15} />
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-4 p-4 md:hidden">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {ticket.title}
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          #{ticket.id} · {ticket.category || "General"}
                        </p>
                      </div>

                      <Badge
                        value={ticket.priority || "Medium"}
                        styles={priorityStyles}
                      />
                    </div>

                    <div className="mt-3">
                      <Badge
                        value={ticket.status || "Open"}
                        styles={statusStyles}
                      />
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      Created: {formatDate(ticket.created_at)}
                    </p>

                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      <Eye size={15} />
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Status and Comments */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Quick Ticket Actions</h2>
            <p className="mt-1 text-sm text-gray-600">
              Update ticket status or add a comment without leaving this page.
            </p>
          </div>

          {tickets.length === 0 && !loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
              Assigned tickets will appear here when available.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Ticket #{ticket.id}
                      </p>

                      <h3 className="mt-1 font-bold text-gray-900">
                        {ticket.title}
                      </h3>
                    </div>

                    <Badge
                      value={ticket.status || "Open"}
                      styles={statusStyles}
                    />
                  </div>

                  <p className="mb-5 line-clamp-3 text-sm leading-6 text-gray-600">
                    {ticket.description || "No description provided."}
                  </p>

                  {/* Update Status */}
                  <div className="border-t border-gray-100 pt-4">
                    <label
                      htmlFor={`status-${ticket.id}`}
                      className="mb-2 block text-sm font-semibold text-gray-700"
                    >
                      Update Status
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        id={`status-${ticket.id}`}
                        value={
                          statusChanges[ticket.id] ?? ticket.status ?? "Open"
                        }
                        onChange={(event) =>
                          setStatusChanges((previous) => ({
                            ...previous,
                            [ticket.id]: event.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(ticket)}
                        disabled={updatingId === ticket.id}
                        className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === ticket.id ? "Updating..." : "Update"}
                      </button>
                    </div>
                  </div>

                  {/* Add Comment */}
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <label
                      htmlFor={`comment-${ticket.id}`}
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"
                    >
                      <MessageSquare size={16} />
                      Add Comment
                    </label>

                    <textarea
                      id={`comment-${ticket.id}`}
                      rows={3}
                      value={comments[ticket.id] || ""}
                      onChange={(event) =>
                        setComments((previous) => ({
                          ...previous,
                          [ticket.id]: event.target.value,
                        }))
                      }
                      placeholder="Enter an update or resolution note..."
                      className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />

                    <button
                      type="button"
                      onClick={() => handleAddComment(ticket)}
                      disabled={commentingId === ticket.id}
                      className="mt-3 w-full rounded-lg border border-red-600 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {commentingId === ticket.id
                        ? "Adding Comment..."
                        : "Add Comment"}
                    </button>
                  </div>
                </div>
              ))}
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
        <p className="text-sm font-medium text-gray-600">{title}</p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-red-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Badge({ value, styles }) {
  const className =
    styles[value] || "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  );
}