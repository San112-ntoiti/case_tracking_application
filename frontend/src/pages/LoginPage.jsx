import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import FormField, { TextInput } from "../components/FormField";
import Button from "../components/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  const chooseDestination = (destination, role) => {
    if (destination && destination !== "/dashboard") return destination;
    if (role === "SYS_ADMIN") return "/admin/system";
    if (role === "COURT_ADMIN") return "/admin/cases";
    return "/dashboard";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(chooseDestination(from, user.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
        Sign in to your account
      </h1>
      <p className="mt-1.5 text-sm text-[var(--color-slate)]">
        Track your cases and manage your subscription.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-sm bg-[var(--color-brick-bg)] px-4 py-3 text-sm text-[var(--color-brick)]">
            {error}
          </div>
        )}

        <FormField label="Email address">
          <TextInput
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </FormField>

        <FormField label="Password">
          <TextInput
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </FormField>

        <Button type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-slate)]">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}
