import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ClipboardList,
  Search,
  RefreshCw,
  UserRound,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Clock,
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

function getList(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    fallback
  );
}

export default function AssignTickets() {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assignmentFilter, setAssignmentFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState("");
  const [agentsError, setAgentsError] = useState("");
  const [assignmentsError, setAssignmentsError] = useState("");

  // --------------------------------------------------
  // FETCH TICKETS, AGENTS AND ASSIGNMENTS
  // --------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    setAgentsError("");
    setAssignmentsError("");

    const results = await Promise.allSettled([
      api.get("/tickets/"),
      api.get("/auth/users"),
      api.get("/assignments/"),
    ]);

    // Tickets
    const ticketResult = results[0];

    if (ticketResult.status === "fulfilled") {
      const ticketList = getList(ticketResult.value.data, [
        "items",
        "tickets",
      ]);

      setTickets(ticketList);
    } else {
      setTickets([]);

      const message = getErrorMessage(
        ticketResult.reason,
        "Unable to load tickets."
      );

      setError(message);
      console.error(
        "Unable to fetch tickets:",
        ticketResult.reason
      );
    }

    // Agents
    const agentResult = results[1];

    if (agentResult.status === "fulfilled") {
      const userList = getList(agentResult.value.data, [
        "items",
        "users",
      ]);

      setAgents(
        userList.filter(
          (user) =>
            String(user.role || "").toLowerCase() === "agent" &&
            user.is_active === true
        )
      );
    } else {
      setAgents([]);

      setAgentsError(
        getErrorMessage(
          agentResult.reason,
          "Unable to load agents."
        )
      );

      console.error(
        "Unable to fetch agents:",
        agentResult.reason
      );
    }

    // Existing assignments
    const assignmentResult = results[2];

    if (assignmentResult.status === "fulfilled") {
      const assignmentList = getList(
        assignmentResult.value.data,
        ["items", "assignments"]
      );

      setAssignments(assignmentList);
    } else {
      setAssignments([]);

      setAssignmentsError(
        getErrorMessage(
          assignmentResult.reason,
          "Unable to load assignments."
        )
      );

      console.error(
        "Unable to fetch assignments:",
        assignmentResult.reason
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --------------------------------------------------
  // CHECK WHETHER TICKET IS ASSIGNED
  // --------------------------------------------------
  const isTicketAssigned = useCallback(
    (ticket) => {
      const ticketHasAgent =
        ticket.assigned_agent_id !== null &&
        ticket.assigned_agent_id !== undefined;

      const assignmentExists = assignments.some(
        (assignment) =>
          Number(assignment.ticket_id) === Number(ticket.id) &&
          assignment.is_active === true
      );

      return ticketHasAgent || assignmentExists;
    },
    [assignments]
  );

  const unassignedCount = tickets.filter(
    (ticket) => !isTicketAssigned(ticket)
  ).length;

  const assignedCount = tickets.length - unassignedCount;

  // --------------------------------------------------
  // FILTER TICKETS
  // --------------------------------------------------
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        String(ticket.id ?? "").toLowerCase().includes(query) ||
        String(ticket.title || "").toLowerCase().includes(query) ||
        String(ticket.description || "")
          .toLowerCase()
          .includes(query) ||
        String(ticket.category || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        ticket.status === statusFilter;

      const isAssigned = isTicketAssigned(ticket);

      const matchesAssignment =
        assignmentFilter === "All" ||
        (assignmentFilter === "Assigned" && isAssigned) ||
        (assignmentFilter === "Unassigned" && !isAssigned);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAssignment
      );
    });
  }, [
    tickets,
    search,
    statusFilter,
    assignmentFilter,
    isTicketAssigned,
  ]);

  // --------------------------------------------------
  // AUTOMATICALLY ASSIGN TICKET
  // Backend chooses the active agent with the lowest
  // active workload. Do not send agent_id.
  // --------------------------------------------------
  async function handleAssign(ticket) {
    if (isTicketAssigned(ticket)) {
      toast.error("This ticket is already assigned.");
      return;
    }

    const status = String(ticket.status || "").toLowerCase();

    if (["resolved", "closed"].includes(status)) {
      toast.error("Resolved or closed tickets cannot be assigned.");
      return;
    }

    if (agents.length === 0) {
      toast.error(
        "No active agents available. Check the Auth Service."
      );
      return;
    }

    const confirmed = window.confirm(
      `Automatically assign ticket #${ticket.id} to the active agent with the lowest workload?`
    );

    if (!confirmed) return;

    setAssigningId(ticket.id);

    try {
      // Matches the supplied backend:
      // POST /assignments/
      // Body: { ticket_id: ticket.id }
      const response = await api.post("/assignments/", {
        ticket_id: ticket.id,
      });

      const assignedAgentId = response.data?.agent_id;

      if (assignedAgentId !== undefined) {
        const assignedAgent = agents.find(
          (agent) =>
            String(agent.id) === String(assignedAgentId)
        );

        toast.success(
          assignedAgent
            ? `Ticket assigned to ${assignedAgent.name || assignedAgent.email}.`
            : `Ticket assigned to agent ${assignedAgentId}.`
        );
      } else {
        toast.success("Ticket assignment completed.");
      }

      await fetchData();
    } catch (err) {
      console.error("Ticket assignment failed:", err);

      toast.error(
        getErrorMessage(
          err,
          "Ticket assignment failed. Check the Assignment Service."
        )
      );
    } finally {
      setAssigningId(null);
    }
  }

  // --------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw
            size={30}
            className="animate-spin text-red-600"
          />

          <p className="mt-4 text-sm text-gray-500">
            Loading tickets, agents and assignments...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE UI
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              to="/admin"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-700"
            >
              <ArrowRight
                size={16}
                className="rotate-180"
              />
              Back to Dashboard
            </Link>

            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-700">
              Administration
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Assign Tickets
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Review tickets and automatically assign them to
              active support agents with the lowest workload.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading || assigningId !== null}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ERROR MESSAGES */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle size={20} className="shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load tickets
              </p>

              <p className="mt-1">{error}</p>

              <button
                type="button"
                onClick={fetchData}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {agentsError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">
              Agent list unavailable
            </p>

            <p className="mt-1">{agentsError}</p>

            <p className="mt-2">
              Verify that the Auth Service provides the
              <code className="mx-1">GET /auth/users</code>
              endpoint.
            </p>
          </div>
        )}

        {assignmentsError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">
              Assignment list unavailable
            </p>

            <p className="mt-1">{assignmentsError}</p>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Total Tickets"
            value={tickets.length}
            icon={<ClipboardList size={21} />}
          />

          <SummaryCard
            title="Assigned Tickets"
            value={assignedCount}
            icon={<UserCheck size={21} />}
          />

          <SummaryCard
            title="Unassigned Tickets"
            value={unassignedCount}
            icon={<UserRound size={21} />}
          />
        </div>

        {/* TICKET QUEUE */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* SEARCH AND FILTERS */}
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Ticket Assignment Queue
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredTickets.length} ticket(s) found
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search tickets..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="All">All Statuses</option>

                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <select
                  value={assignmentFilter}
                  onChange={(event) =>
                    setAssignmentFilter(event.target.value)
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="All">All Assignments</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>
            </div>
          </div>

          {/* TICKET LIST */}
          {error && tickets.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <AlertCircle
                size={38}
                className="mx-auto text-red-600"
              />

              <h3 className="mt-3 font-semibold">
                Unable to load tickets
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchData}
                className="mt-5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
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

              <h3 className="mt-3 font-semibold text-gray-800">
                No tickets found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try changing the filters or search term.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTickets.map((ticket) => {
                const assignedAgent = agents.find(
                  (agent) =>
                    String(agent.id) ===
                    String(ticket.assigned_agent_id)
                );

                const isAssigned = isTicketAssigned(ticket);

                const ticketStatus = String(
                  ticket.status || "Open"
                );

                const isClosed = [
                  "resolved",
                  "closed",
                ].includes(ticketStatus.toLowerCase());

                return (
                  <article
                    key={ticket.id}
                    className="p-5 transition hover:bg-gray-50 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

                      {/* TICKET INFORMATION */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Ticket #{ticket.id}
                          </span>

                          <Badge
                            value={ticketStatus}
                            styles={statusStyles}
                          />

                          <Badge
                            value={ticket.priority || "Medium"}
                            styles={priorityStyles}
                          />
                        </div>

                        <h3 className="mt-3 text-lg font-bold text-gray-900">
                          {ticket.title || "Untitled Ticket"}
                        </h3>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                          {ticket.description ||
                            "No description provided."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                          <span>
                            Category: {ticket.category || "General"}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <Clock size={13} />
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Current Assignment
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-700">
                              <UserRound size={16} />
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {assignedAgent?.name ||
                                  assignedAgent?.email ||
                                  (ticket.assigned_agent_id != null
                                    ? `Agent ID: ${ticket.assigned_agent_id}`
                                    : isAssigned
                                      ? "Assignment recorded"
                                      : "Unassigned")}
                              </p>

                              <p className="text-xs text-gray-500">
                                {isAssigned
                                  ? "Currently assigned"
                                  : "Needs assignment"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="w-full rounded-xl border border-gray-200 bg-white p-4 xl:max-w-sm">
                        <p className="mb-3 text-sm font-semibold text-gray-700">
                          Assignment Action
                        </p>

                        {isAssigned ? (
                          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                            <div className="flex items-center gap-2 font-medium">
                              <UserCheck size={17} />
                              Ticket already assigned
                            </div>

                            <p className="mt-1 text-xs">
                              The backend does not allow duplicate assignments.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                              The system will automatically select
                              the active agent with the fewest
                              active tickets.
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAssign(ticket)}
                              disabled={
                                assigningId !== null ||
                                agents.length === 0 ||
                                isClosed ||
                                Boolean(agentsError)
                              }
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {assigningId === ticket.id ? (
                                <>
                                  <RefreshCw
                                    size={15}
                                    className="animate-spin"
                                  />
                                  Assigning...
                                </>
                              ) : (
                                <>
                                  <UserCheck size={16} />
                                  Assign Ticket
                                </>
                              )}
                            </button>

                            {isClosed && (
                              <p className="mt-2 text-xs text-red-600">
                                Resolved or closed tickets cannot be assigned.
                              </p>
                            )}

                            {agents.length === 0 && !agentsError && (
                              <p className="mt-2 text-xs text-amber-700">
                                No active agents are available.
                              </p>
                            )}
                          </>
                        )}

                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          View Details
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------
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

// --------------------------------------------------
// STATUS / PRIORITY BADGE
// --------------------------------------------------
function Badge({ value, styles }) {
  const className =
    styles[value] ||
    "border-gray-300 bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  );
}