import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { LiveProvider, useLive } from "../live";
import type { Activity } from "../types";
import { useState } from "react";

export function Layout() {
  return (
    <LiveProvider>
      <Shell />
    </LiveProvider>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unread, setNotifications, setUnread } = useLive();
  const [open, setOpen] = useState(false);
  const latestUnread = notifications.find((n) => !n.read);

  async function markOne(id: string) {
    await api(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }
  async function markAll() {
    await api("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          TaskFlow<span>.</span>
        </div>
        <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/" end>
          Dashboard
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/tasks">
          Tasks
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/projects">
          Projects
        </NavLink>
        {user?.role !== "DEVELOPER" && (
          <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/clients">
            Clients
          </NavLink>
        )}
        {user?.role === "ADMIN" && (
          <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/users">
            Users
          </NavLink>
        )}
        <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/activity">
          Activity
        </NavLink>
        <div className="spacer" />
        <div className="user-chip">
          <strong>{user?.name}</strong>
          <div>{user?.role.replaceAll("_", " ")}</div>
          <button
            className="btn ghost"
            style={{ marginTop: 10, color: "#efe7db", borderColor: "#3a3229" }}
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <div>
            <div className="muted">Internal project desk</div>
            <h1 style={{ margin: "4px 0 0" }}>Good day, {user?.name.split(" ")[0]}</h1>
          </div>
          <div className="bell-wrap">
            <button className="btn ghost" onClick={() => setOpen((v) => !v)}>
              Alerts {unread ? `(${unread})` : ""}
            </button>
            {open && (
              <div className="card bell-panel">
                <div
  className="row-actions"
  style={{
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
  <strong>Notifications</strong>

  <div style={{ display: "flex", gap: 8 }}>
    <button className="btn ghost" onClick={markAll}>
      Mark all read
    </button>

    <button
      className="btn ghost"
      onClick={() => setOpen(false)}
      style={{
        fontSize: "18px",
        padding: "4px 10px",
      }}
      aria-label="Close notifications"
    >
      ×
    </button>
  </div>
</div>
                {notifications.length === 0 && <p className="muted">Nothing yet.</p>}
                {notifications.map((n) => (
                  <div key={n.id} className={`feed-item${n.read ? "" : " unread"}`} style={{ padding: 8, borderRadius: 8 }}>
                    <strong>{n.title}</strong>
                    <div className="muted">{n.body}</div>
                    {!n.read && (
                      <button className="btn ghost" style={{ marginTop: 6 }} onClick={() => markOne(n.id)}>
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {latestUnread && unread > 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: "#e8c4a8" }}>
            {latestUnread.title}: {latestUnread.body}
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDay(value: string) {
  return new Date(value).toLocaleDateString();
}

export function ActivityList({ items }: { items: Activity[] }) {
  return (
    <div className="feed">
      {items.length === 0 && <p className="muted">No activity yet.</p>}
      {items.map((a) => (
        <div key={a.id} className="feed-item">
          <div>{a.message}</div>
          <div className="muted">
            {a.project.name} · {formatDate(a.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
