import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { formatDay } from "../components/Layout";
import type { Project, Task, TaskPriority, TaskStatus, User } from "../types";

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TasksPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [devs, setDevs] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    ["status", "priority", "dueFrom", "dueTo", "projectId"].forEach((k) => {
      const v = params.get(k);
      if (v) q.set(k, v);
    });
    return q.toString();
  }, [params]);

  async function load() {
    const data = await api<{ tasks: Task[] }>(`/api/tasks${query ? `?${query}` : ""}`);
    setTasks(data.tasks);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [query]);

  useEffect(() => {
    api<{ projects: Project[] }>("/api/projects").then((d) => setProjects(d.projects));
    if (user?.role !== "DEVELOPER") {
      api<{ users: User[] }>("/api/users/developers").then((d) => setDevs(d.users));
    }
  }, [user?.role]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <p className="muted" style={{ margin: 0, flex: 1 }}>
          Filters sync to the URL so lists stay shareable.
        </p>
        {user?.role !== "DEVELOPER" && (
          <button className="btn copper" onClick={() => { setEditing(null); setShow(true); }}>
            New task
          </button>
        )}
      </div>
      <div className="filters">
        <div>
          <label>Status</label>
          <select value={params.get("status") ?? ""} onChange={(e) => updateFilter("status", e.target.value)}>
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Priority</label>
          <select value={params.get("priority") ?? ""} onChange={(e) => updateFilter("priority", e.target.value)}>
            <option value="">All</option>
            {priorities.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Due from</label>
          <input type="date" value={params.get("dueFrom") ?? ""} onChange={(e) => updateFilter("dueFrom", e.target.value)} />
        </div>
        <div>
          <label>Due to</label>
          <input type="date" value={params.get("dueTo") ?? ""} onChange={(e) => updateFilter("dueTo", e.target.value)} />
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.title}</strong>
                  <div className="muted">{t.description.slice(0, 90)}</div>
                </td>
                <td>
                  <Link to={`/projects/${t.projectId}`}>{t.project?.name}</Link>
                </td>
                <td>{t.assignee?.name ?? "Unassigned"}</td>
                <td>
                  {user?.role === "DEVELOPER" ? (
                    <select
                      value={t.status}
                      onChange={async (e) => {
                        await api(`/api/tasks/${t.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: e.target.value }),
                        });
                        load();
                      }}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`badge ${t.status}`}>{t.status.replaceAll("_", " ")}</span>
                  )}
                </td>
                <td><span className={`badge ${t.priority}`}>{t.priority}</span></td>
                <td>{formatDay(t.dueDate)}</td>
                <td>
                  {user?.role !== "DEVELOPER" && (
                    <button className="btn ghost" onClick={() => { setEditing(t); setShow(true); }}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && (
        <TaskModal
          projects={projects}
          devs={devs}
          initial={editing}
          onClose={() => setShow(false)}
          onSaved={() => {
            setShow(false);
            load();
          }}
        />
      )}
    </>
  );
}

function TaskModal({
  projects,
  devs,
  initial,
  onClose,
  onSaved,
}: {
  projects: Project[];
  devs: User[];
  initial: Task | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    projectId: initial?.projectId ?? projects[0]?.id ?? "",
    status: initial?.status ?? "TODO",
    priority: initial?.priority ?? "MEDIUM",
    dueDate: initial ? initial.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    assigneeId: initial?.assigneeId ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="card modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const payload = { ...form, assigneeId: form.assigneeId || null, dueDate: new Date(form.dueDate).toISOString() };
            if (initial) {
              await api(`/api/tasks/${initial.id}`, { method: "PATCH", body: JSON.stringify(payload) });
            } else {
              await api("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
            }
            onSaved();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Save failed");
          }
        }}
      >
        <h3>{initial ? "Edit task" : "New task"}</h3>
        <label>Title</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <label>Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <label>Project</label>
        <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label>Assignee</label>
        <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
          <option value="">Unassigned</option>
          {devs.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <label>Status</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label>Priority</label>
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
          {priorities.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label>Due date</label>
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        {error && <div className="error">{error}</div>}
        <div className="row-actions" style={{ marginTop: 16 }}>
          <button className="btn copper" type="submit">Save</button>
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
