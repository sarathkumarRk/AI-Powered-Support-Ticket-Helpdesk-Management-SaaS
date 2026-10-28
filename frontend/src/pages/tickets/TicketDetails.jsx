import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ticket,
  Clock,
  UserRound,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Send,
  CalendarDays,
  Tag,
} from "lucide-react";
import api from "../../api/axios";

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "Closed"];

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

export default function TicketDetails() {
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [newComment, setNewComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState("");

  async function fetchTicket() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/tickets/${ticketId}`);
      const data = response.data;

      setTicket(data);
      setSelectedStatus(data.status || "Open");

      // Use comments included in the ticket response if available.
      setComments(
        Array.isArray(data.comments) ? data.comments : []
      );
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to load ticket details.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  async function handleStatusUpdate() {
    if (!ticket) return;

    if (!selectedStatus || selectedStatus === ticket.status) {
      toast.error("Please select a different status.");
      return;
    }

    const confirmed = window.confirm(
      `Change ticket status from "${ticket.status}" to "${selectedStatus}"?`
    );

    if (!confirmed) return;

    setUpdating(true);

    try {
      const response = await api.patch(`/tickets/${ticketId}`, {
        status: selectedStatus,
      });

      setTicket((previous) => ({
        ...previous,
        ...response.data,
        status: response.data.status || selectedStatus,
      }));

      setSelectedStatus(
        response.data.status || selectedStatus
      );

      toast.success("Ticket status updated successfully.");
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Unable to update ticket status."
      );

      setSelectedStatus(ticket.status || "Open");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();

    const commentText = newComment.trim();

    if (!commentText) {
      toast.error("Please enter a comment.");
      return;
    }

    setSubmittingComment(true);

    try {
      const response = await api.post(
        `/tickets/${ticketId}/comments`,
        {
          comment: commentText,
        }
      );

      const createdComment = response.data;

      if (
        createdComment &&
        typeof createdComment === "object" &&
        createdComment.comment
      ) {
        setComments((previous) => [
          ...previous,
          createdComment,
        ]);
      } else {
        // The API may return only a success message.
        // Reload the ticket in case its response includes comments.
        await fetchTicket();
      }

      setNewComment("");
      toast.success("Comment submitted successfully.");
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Unable to add comment."
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <RefreshCw
          size={32}
          className="animate-spin text-red-600"
        />

        <p className="mt-4 text-sm text-gray-600">
          Loading ticket details...
        </p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle
            size={40}
            className="mx-auto text-red-600"
          />

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Ticket unavailable
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            {error || "The requested ticket could not be found."}
          </p>

          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={fetchTicket}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>

            <Link
              to="/dashboard"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const role = (currentUser.role || "").toLowerCase();

  const canUpdateStatus =
    role === "admin" ||
    role === "agent";

  const canComment =
    role === "admin" ||
    role === "agent" ||
    role === "customer";

  const assignedAgentId = ticket.assigned_agent_id;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-700"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-700">
                Ticket Details
              </p>

              <h1 className="text-3xl font-bold tracking-tight">
                {ticket.title}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Ticket ID: #{ticket.id}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchTicket}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Main Ticket Information */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-red-700">
                  <Ticket size={20} />
                </div>

                <h2 className="text-lg font-bold">
                  Ticket Description
                </h2>
              </div>

              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                {ticket.description || "No description provided."}
              </p>
            </section>

            {/* Ticket Metadata */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-5 text-lg font-bold">
                Ticket Information
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <InfoItem
                  icon={<Tag size={18} />}
                  label="Category"
                  value={ticket.category || "General"}
                />

                <InfoItem
                  icon={<Clock size={18} />}
                  label="Priority"
                  value={
                    <Badge
                      value={ticket.priority || "Medium"}
                      styles={priorityStyles}
                    />
                  }
                />

                <InfoItem
                  icon={<CalendarDays size={18} />}
                  label="Created At"
                  value={formatDate(ticket.created_at)}
                />

                <InfoItem
                  icon={<Clock size={18} />}
                  label="Last Updated"
                  value={formatDate(ticket.updated_at)}
                />

                <InfoItem
                  icon={<UserRound size={18} />}
                  label="Customer ID"
                  value={ticket.creator_id ?? "—"}
                />

                <InfoItem
                  icon={<UserRound size={18} />}
                  label="Assigned Agent ID"
                  value={assignedAgentId ?? "Unassigned"}
                />

                {ticket.resolved_at && (
                  <InfoItem
                    icon={<CalendarDays size={18} />}
                    label="Resolved At"
                    value={formatDate(ticket.resolved_at)}
                  />
                )}
              </div>
            </section>

            {/* Comments */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-red-700">
                  <MessageSquare size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Comments & Resolution Notes
                  </h2>

                  <p className="text-sm text-gray-500">
                    Add updates related to this ticket.
                  </p>
                </div>
              </div>

              {comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                  <MessageSquare
                    size={28}
                    className="mx-auto text-gray-400"
                  />

                  <p className="mt-2 text-sm font-medium text-gray-700">
                    No comments available
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Comments will appear here when available from the API.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((item, index) => (
                    <div
                      key={item.id ?? index}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-800">
                          {item.user_name ||
                            item.author_name ||
                            (item.user_id
                              ? `User #${item.user_id}`
                              : "Comment")}
                        </p>

                        <p className="text-xs text-gray-500">
                          {formatDate(
                            item.created_at || item.timestamp
                          )}
                        </p>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                        {item.comment ||
                          item.content ||
                          item.message ||
                          ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {canComment && (
                <form
                  onSubmit={handleAddComment}
                  className="mt-5 border-t border-gray-200 pt-5"
                >
                  <label
                    htmlFor="new-comment"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Add a Comment
                  </label>

                  <textarea
                    id="new-comment"
                    rows={4}
                    value={newComment}
                    onChange={(event) =>
                      setNewComment(event.target.value)
                    }
                    placeholder="Enter a comment or resolution note..."
                    className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />

                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingComment ? (
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={16} />
                    )}

                    {submittingComment
                      ? "Submitting..."
                      : "Submit Comment"}
                  </button>
                </form>
              )}
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Current Status */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">
                Current Status
              </h2>

              <Badge
                value={ticket.status || "Open"}
                styles={statusStyles}
              />

              {canUpdateStatus && (
                <div className="mt-5 border-t border-gray-200 pt-5">
                  <label
                    htmlFor="ticket-status"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Change Status
                  </label>

                  <select
                    id="ticket-status"
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={updating}
                    className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updating ? "Updating..." : "Update Status"}
                  </button>
                </div>
              )}
            </section>

            {/* Priority */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">
                Priority
              </h2>

              <Badge
                value={ticket.priority || "Medium"}
                styles={priorityStyles}
              />

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Priority indicates how urgently this ticket should be
                handled.
              </p>
            </section>

            {/* Assignment */}
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <UserRound
                  size={20}
                  className="text-red-700"
                />

                <h2 className="text-lg font-bold">
                  Assignment
                </h2>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Assigned Agent
              </p>

              <p className="mt-2 break-words text-sm font-semibold text-gray-800">
                {assignedAgentId != null
                  ? `Agent ID: ${assignedAgentId}`
                  : "Not assigned"}
              </p>

              {role === "admin" && (
                <Link
                  to="/admin/assign-tickets"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Manage Assignment
                </Link>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">
          {label}
        </p>

        <div className="mt-1 break-words text-sm font-semibold text-gray-800">
          {value}
        </div>
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