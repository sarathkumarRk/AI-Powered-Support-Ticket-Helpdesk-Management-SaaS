import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios";

function CustomerPortal() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  // GET /tickets/
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/tickets/");

      setTickets(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      const message =
        err.response?.data?.detail || "Unable to load your tickets.";

      setError(
        typeof message === "string"
          ? message
          : "Unable to load your tickets."
      );

      toast.error("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // POST /tickets/
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.category.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        priority: formData.priority,
      };

      await api.post("/tickets/", payload);

      toast.success("Ticket created successfully!");

      setFormData({
        title: "",
        description: "",
        category: "",
        priority: "Medium",
      });

      setShowForm(false);

      await fetchTickets();
    } catch (err) {
      const detail = err.response?.data?.detail;

      const message =
        typeof detail === "string"
          ? detail
          : "Unable to create ticket. Please try again.";

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-red-50 text-red-700";

      case "in progress":
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

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
      case "urgent":
        return "text-red-700";

      case "medium":
        return "text-orange-700";

      case "low":
        return "text-gray-600";

      default:
        return "text-gray-700";
    }
  };

  const formatStatus = (status) =>
    status?.replaceAll("_", " ") || "Unknown";

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title?.toLowerCase().includes(search.toLowerCase()) ||
      String(ticket.id).includes(search) ||
      ticket.category?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      ticket.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const openCount = tickets.filter(
    (ticket) => ticket.status?.toLowerCase() === "open"
  ).length;

  const inProgressCount = tickets.filter(
    (ticket) =>
      ["in progress", "in_progress"].includes(ticket.status?.toLowerCase())
  ).length;

  const resolvedCount = tickets.filter((ticket) =>
    ["resolved", "closed"].includes(ticket.status?.toLowerCase())
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="font-medium text-red-600">Loading your tickets...</p>
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
              My Tickets
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Create support requests and track their progress.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            {showForm ? "Cancel" : "+ Create Ticket"}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Total Tickets", value: tickets.length },
            { title: "Open Tickets", value: openCount },
            { title: "In Progress", value: inProgressCount },
            { title: "Resolved", value: resolvedCount },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">
                {item.title}
              </p>

              <p className="mt-3 text-3xl font-bold text-gray-900">
                {item.value}
              </p>

              <div className="mt-4 h-1 w-12 rounded bg-red-600" />
            </div>
          ))}
        </div>

        {/* Create Ticket Form */}
        {showForm && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              Create New Ticket
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Ticket Title
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Briefly describe your issue"
                  maxLength={200}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Explain your issue in detail"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Category
                  </label>

                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Technical">Technical</option>
                    <option value="Account">Account</option>
                    <option value="Billing">Billing</option>
                    <option value="General">General</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Priority
                  </label>

                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating..." : "Submit Ticket"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Ticket List */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ticket History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                View and track your support requests.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets..."
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-600"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600">{error}</p>

              <button
                onClick={fetchTickets}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h3 className="font-semibold text-gray-900">
                No tickets found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try changing your search or create a new support ticket.
              </p>

              {!showForm && tickets.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Create Your First Ticket
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Ticket",
                      "Category",
                      "Priority",
                      "Status",
                      "Created",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((ticket) => (
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
                        <span
                          className={`text-sm font-semibold ${getPriorityStyle(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority || "Medium"}
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

                      <td className="px-6 py-4 text-sm text-gray-500">
                        {ticket.created_at
                          ? new Date(ticket.created_at).toLocaleDateString()
                          : "—"}
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

export default CustomerPortal;