import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const getDashboardRoute = (role) => {
    const normalizedRole = String(role || "").toLowerCase();

    const roleRoutes = {
      admin: "/admin",
      agent: "/agent",
      customer: "/customer",
    };

    return roleRoutes[normalizedRole] || "/dashboard";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      const message = "Please enter your email and password.";
      setError(message);
      toast.error(message);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      const message = "Please enter a valid email address.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setLoading(true);

      // Step 1: Login
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const accessToken = response.data?.access_token;

      if (!accessToken) {
        throw new Error(
          "Login response did not contain an access token."
        );
      }

      // Step 2: Save token before requesting profile
      localStorage.setItem("access_token", accessToken);

      // Step 3: Fetch logged-in user details
      const profileResponse = await api.get("/auth/me");

      const user = profileResponse.data;

      if (!user || !user.role) {
        throw new Error(
          "Unable to retrieve your user profile or role."
        );
      }

      // Step 4: Save user information
      localStorage.setItem("user", JSON.stringify(user));

      // Step 5: Navigate according to role
      const dashboardRoute = getDashboardRoute(user.role);

      toast.success("Login successful!");

      // If the user was redirected to login from a protected page,
      // return to that page only if it belongs to their role.
      const requestedPath = location.state?.from?.pathname;

      const roleRoutes = {
        admin: ["/admin", "/tickets"],
        agent: ["/agent", "/tickets"],
        customer: ["/customer", "/tickets"],
      };

      const normalizedRole = String(user.role).toLowerCase();

      const canAccessRequestedPath =
        requestedPath &&
        (roleRoutes[normalizedRole] || []).some(
          (allowedPath) =>
            requestedPath === allowedPath ||
            requestedPath.startsWith(`${allowedPath}/`)
        );

      navigate(
        canAccessRequestedPath ? location.state.from : dashboardRoute,
        { replace: true }
      );
    } catch (err) {
      // Clear credentials if login or profile verification fails.
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      const message =
        err.response?.data?.detail ||
        err.message ||
        "Unable to login. Please try again.";

      setError(
        typeof message === "string"
          ? message
          : "Login failed. Please check your credentials and try again."
      );

      toast.error(
        typeof message === "string"
          ? message
          : "Login failed. Please try again."
      );

      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Logo and Heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 text-2xl font-bold text-white">
            S
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in to your Support Ticket account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Registration Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-red-600 hover:text-red-700"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;