import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const { isAuthenticated, user, logout, isCourtAdmin, isSysAdmin } = useAuth();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  const isAdvocate   = user?.role === "ADVOCATE";

  const linkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? "text-[var(--color-brass)]" : "text-white/85 hover:text-white"
    }`;

  /* ── nav items depend on role ─────────────────────────────────────── */
  const publicLinks = (
    <>
      <NavLink to="/search"  className={linkCls} onClick={() => setOpen(false)}>Search Cases</NavLink>
      <NavLink to="/pricing" className={linkCls} onClick={() => setOpen(false)}>Pricing</NavLink>
    </>
  );

  const authLinks = isAuthenticated && (
    <>
      <NavLink to="/dashboard"     className={linkCls} onClick={() => setOpen(false)}>
        {isAdvocate ? "My Caseload" : "My Cases"}
      </NavLink>
      <NavLink to="/notifications" className={linkCls} onClick={() => setOpen(false)}>
        Notifications
      </NavLink>
    </>
  );

  const adminLinks = isCourtAdmin && (
    <NavLink to="/admin/cases" className={linkCls} onClick={() => setOpen(false)}>
      Court Admin
    </NavLink>
  );

  const sysLinks = isSysAdmin && (
    <NavLink to="/admin/system" className={linkCls} onClick={() => setOpen(false)}>
      System Admin
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-ink)] shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <ScalesIcon className="h-7 w-7 text-[var(--color-brass)]" />
          <span className="font-[var(--font-display)] text-lg font-semibold text-white leading-none">
            Court Case Tracker
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-7 md:flex">
          {publicLinks}
          {authLinks}
          {adminLinks}
          {sysLinks}
        </div>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-4 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/settings"
                className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
              >
                <UserIcon className="h-4 w-4" />
                {user?.full_name?.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-sm border border-white/25 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-white/85 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-sm bg-[var(--color-brass)] px-4 py-1.5 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-brass-dark)]"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="p-1.5 text-white md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open
              ? <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              : <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-[var(--color-ink)] px-4 pb-4 pt-3 md:hidden">
          <div className="flex flex-col gap-3">
            <NavLink to="/search"  className={linkCls} onClick={() => setOpen(false)}>Search Cases</NavLink>
            <NavLink to="/pricing" className={linkCls} onClick={() => setOpen(false)}>Pricing</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/dashboard"     className={linkCls} onClick={() => setOpen(false)}>
                  {isAdvocate ? "My Caseload" : "My Cases"}
                </NavLink>
                <NavLink to="/notifications" className={linkCls} onClick={() => setOpen(false)}>
                  Notifications
                </NavLink>
                <NavLink to="/settings"      className={linkCls} onClick={() => setOpen(false)}>
                  Account Settings
                </NavLink>
              </>
            )}
            {isCourtAdmin && (
              <NavLink to="/admin/cases" className={linkCls} onClick={() => setOpen(false)}>Court Admin</NavLink>
            )}
            {isSysAdmin && (
              <NavLink to="/admin/system" className={linkCls} onClick={() => setOpen(false)}>System Admin</NavLink>
            )}
            <div className="mt-1 border-t border-white/10 pt-3">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="text-sm font-medium text-white/85 hover:text-white">
                  Sign out
                </button>
              ) : (
                <div className="flex gap-4">
                  <NavLink to="/login"    className={linkCls} onClick={() => setOpen(false)}>Sign in</NavLink>
                  <NavLink to="/register" className={linkCls} onClick={() => setOpen(false)}>Create account</NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function ScalesIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v18M12 3l-6 3M12 3l6 3M4 8l-2 5a3 3 0 006 0L6 8H4zM18 8l-2 5a3 3 0 006 0l-2-5h-2zM7 21h10"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
