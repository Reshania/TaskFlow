import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import type { Client, Project } from "../types";

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", clientId: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<{ projects: Project[] }>("/api/projects");
    setProjects(data.projects);
  }
  useEffect(() => {
    load();
    if (user?.role !== "DEVELOPER") {
      api<{ clients: Client[] }>("/api/clients").then((d) => {
        setClients(d.clients);
        setForm((f) => ({ ...f, clientId: d.clients[0]?.id ?? "" }));
      });
    }
  }, [user?.role]);

  return (
    <>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0, flex: 1 }}>
          {user?.role === "PROJECT_MANAGER" ? "Projects you created." : user?.role === "DEVELOPER" ? "Projects with your tasks." : "All studio projects."}
        </p>
        {user?.role !== "DEVELOPER" && (
          <button className="btn copper" onClick={() => setShow(true)}>New project</button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/projects/${p.id}`}><strong>{p.name}</strong></Link></td>
                <td>{p.client?.company ?? p.client?.name}</td>
                <td>{p.createdBy?.name}</td>
                <td><span className="badge">{p.status}</span></td>
                <td>{p._count?.tasks ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show && (
        <div className="modal-backdrop" onClick={() => setShow(false)}>
          <form
            className="card modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/api/projects", { method: "POST", body: JSON.stringify(form) });
                setShow(false);
                load();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not create");
              }
            }}
          >
            <h3>New project</h3>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <label>Client</label>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
            {error && <div className="error">{error}</div>}
            <div className="row-actions" style={{ marginTop: 16 }}>
              <button className="btn copper">Create</button>
              <button type="button" className="btn ghost" onClick={() => setShow(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
