import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import FormField, { TextInput } from "../components/FormField";
import Button from "../components/Button";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "", confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const data = err.response?.data?.details || {};
      setErrors(data);
      if (!Object.keys(data).length) {
        setErrors({ general: "Registration failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-[var(--color-slate)]">
        Free to join — start tracking a case in under a minute.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {errors.general && (
          <div className="rounded-sm bg-[var(--color-brick-bg)] px-4 py-3 text-sm text-[var(--color-brick)]">
            {errors.general}
          </div>
        )}

        <FormField label="Full name" error={errors.full_name?.[0]}>
          <TextInput
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Grace Akinyi"
          />
        </FormField>

        <FormField label="Email address" error={errors.email?.[0]}>
          <TextInput
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </FormField>

        <FormField label="Phone number" hint="Required for M-Pesa payments and SMS alerts." error={errors.phone?.[0]}>
          <TextInput
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="254712345678"
          />
        </FormField>

        <FormField label="Password" hint="At least 8 characters." error={errors.password?.[0]}>
          <TextInput
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </FormField>

        <FormField label="Confirm password" error={errors.confirm_password?.[0]}>
          <TextInput
            type="password"
            required
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            placeholder="••••••••"
          />
        </FormField>

        <Button type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-slate)]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[var(--color-ink)] underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
