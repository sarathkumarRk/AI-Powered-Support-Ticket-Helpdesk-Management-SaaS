import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserCog,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import api from "../../api/axios";

const roleStyles = {
  admin: "border-red-300 bg-red-50 text-red-800",
  agent: "border-gray-400 bg-gray-200 text-gray-800",
  customer: "border-gray-300 bg-gray-100 text-gray-700",
};

function getRole(user) {
  return (user.role || "customer").toLowerCase();
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
}

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/auth/users");
      const data = response.data;

      const userList = Array.isArray(data)
        ? data
        : data.items || data.users || [];

      setUsers(userList);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Unable to load users. Please check the user API endpoint.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        String(user.id ?? "").toLowerCase().includes(query) ||
        (user.name || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query);

      const matchesRole =
        roleFilter === "all" || getRole(user) === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const adminCount = users.filter(
    (user) => getRole(user) === "admin"
  ).length;

  const agentCount = users.filter(
    (user) => getRole(user) === "agent"
  ).length;

  const customerCount = users.filter(
    (user) => getRole(user) === "customer"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              to="/admin"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-700"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Manage Users
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              View registered users and filter them by role.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Users
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Users"
            value={users.length}
            icon={<Users size={21} />}
          />

          <SummaryCard
            title="Administrators"
            value={adminCount}
            icon={<ShieldCheck size={21} />}
          />

          <SummaryCard
            title="Support Agents"
            value={agentCount}
            icon={<UserCog size={21} />}
          />

          <SummaryCard
            title="Customers"
            value={customerCount}
            icon={<UserRound size={21} />}
          />
        </div>

        {/* Users Table */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold">Registered Users</h2>

                <p className="mt-1 text-sm text-gray-500">
                  {filteredUsers.length} user(s) found
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
                    placeholder="Search name, email, ID..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 sm:w-72"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(event) =>
                    setRoleFilter(event.target.value)
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw
                size={30}
                className="animate-spin text-red-600"
              />

              <p className="mt-4 text-sm text-gray-500">
                Loading users...
              </p>
            </div>
          ) : error && users.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <AlertCircle
                size={38}
                className="mx-auto text-red-600"
              />

              <h3 className="mt-3 font-semibold">
                Unable to load users
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchUsers}
                className="mt-5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users
                size={38}
                className="mx-auto text-gray-400"
              />

              <h3 className="mt-3 font-semibold text-gray-800">
                No users found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try another search term or role filter.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">
                        User
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        User ID
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Role
                      </th>

                      <th className="px-6 py-4 font-semibold">
                        Registered
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const role = getRole(user);

                      return (
                        <tr
                          key={user.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-gray-100 font-bold text-gray-700">
                                {(user.name || user.email || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <p className="font-semibold text-gray-900">
                                  {user.name || "Unnamed User"}
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  {user.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-600">
                            {user.id ?? "—"}
                          </td>

                          <td className="px-6 py-4">
                            <RoleBadge role={role} />
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(user.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 font-bold text-gray-700">
                        {(user.name || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold">
                          {user.name || "Unnamed User"}
                        </p>

                        <p className="mt-1 break-all text-sm text-gray-500">
                          {user.email || "No email"}
                        </p>

                        <div className="mt-3">
                          <RoleBadge role={getRole(user)} />
                        </div>

                        <p className="mt-3 text-xs text-gray-500">
                          ID: {user.id ?? "—"} · Registered:{" "}
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <p className="mt-4 text-xs leading-5 text-gray-500">
          This page currently displays user information only. Creating,
          editing, disabling, or deleting users requires corresponding
          backend endpoints and authorization rules.
        </p>
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

function RoleBadge({ role }) {
  const styles = {
    admin: "border-red-300 bg-red-50 text-red-800",
    agent: "border-gray-400 bg-gray-200 text-gray-800",
    customer: "border-gray-300 bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[role] || styles.customer
      }`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}