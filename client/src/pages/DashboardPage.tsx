import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { useLive } from "../live";
import { ActivityList, formatDay } from "../components/Layout";
import type { DashboardData } from "../types";

export function DashboardPage() {
  const { user } = useAuth();
  const { activities } = useLive();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api<DashboardData>("/api/dashboard").then(setData);
  }, [activities[0]?.id]);

  if (!data) return <p>Loading dashboard…</p>;
  const { stats } = data;
  const title =
    user?.role === "ADMIN" ? "Studio overview" : user?.role === "PROJECT_MANAGER" ? "Your book of work" : "Your assignments";

  return (
    <>
      <p className="muted">{title}</p>
      <div className="grid stats">
        <div className="stat">
          <span className="muted">Projects</span>
          <b>{stats.projectCount}</b>
        </div>
        <div className="stat">
          <span className="muted">Tasks</span>
          <b>{stats.taskCount}</b>
        </div>
        <div className="stat">
          <span className="muted">Overdue</span>
          <b>{stats.overdueCount}</b>
        </div>
        <div className="stat">
          <span className="muted">Completion</span>
          <b>{stats.completionRate}%</b>
        </div>
      </div>
      <div className="grid two-col" style={{ marginTop: 18 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Status mix</h3>
          <p className="muted">
            Todo {stats.byStatus.TODO} · In progress {stats.byStatus.IN_PROGRESS} · In review {stats.byStatus.IN_REVIEW} · Done{" "}
            {stats.byStatus.DONE}
          </p>
          <h3>Needs attention</h3>
          {(data.overdue.length === 0 && data.dueSoon.length === 0) && <p className="muted">Nothing overdue or due soon.</p>}
          {[...data.overdue, ...data.dueSoon].slice(0, 8).map((t) => (
            <div key={t.id} className="feed-item">
              <Link to={`/tasks?status=${t.status}`}>{t.title}</Link>
              <div className="muted">
                Due {formatDay(t.dueDate)} · {t.project?.name}
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Live activity</h3>
          <ActivityList items={activities.slice(0, 12)} />
        </div>
      </div>
    </>
  );
}
