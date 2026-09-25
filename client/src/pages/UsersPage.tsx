import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { Role, User } from "../types";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "Password123!", role: "DEVELOPER" as Role });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<{ users: User[] }>("/api/users");
    setUsers(data.users);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0, flex: 1 }}>Studio roster. Only admins can provision accounts.</p>
        <button className="btn copper" onClick={() => setShow(true)}>New user</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role.replaceAll("_", " ")}</td>
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
                await api("/api/users", { method: "POST", body: JSON.stringify(form) });
                setShow(false);
                load();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not create");
              }
            }}
          >
            <h3>Invite user</h3>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <label>Password</label>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="ADMIN">ADMIN</option>
              <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
              <option value="DEVELOPER">DEVELOPER</option>
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
