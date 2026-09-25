import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Client } from "../types";

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<{ clients: Client[] }>("/api/clients");
    setClients(data.clients);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0, flex: 1 }}>Accounts the studio is delivering for.</p>
        <button className="btn copper" onClick={() => setShow(true)}>New client</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.company}</strong></td>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c._count?.projects ?? 0}</td>
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
                await api("/api/clients", { method: "POST", body: JSON.stringify(form) });
                setShow(false);
                setForm({ name: "", company: "", email: "", phone: "", notes: "" });
                load();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not create");
              }
            }}
          >
            <h3>New client</h3>
            <label>Contact name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label>Company</label>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
