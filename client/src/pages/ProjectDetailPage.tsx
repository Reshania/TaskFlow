import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { ActivityList, formatDay } from "../components/Layout";
import type { Project } from "../types";

export function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);

  async function load() {
    const data = await api<{ project: Project }>(`/api/projects/${id}`);
    setProject(data.project);
  }
  useEffect(() => {
    load();
  }, [id]);

  if (!project) return <p>Loading project…</p>;
  const activities = project.tasks?.flatMap((t) => t.activities ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ?? [];

  return (
    <>
      <p className="muted">
        <Link to="/projects">Projects</Link> / {project.client?.name}
      </p>
      <h2 style={{ marginTop: 0 }}>{project.name}</h2>
      <p>{project.description}</p>
      <div className="grid two-col">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {project.tasks?.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    <div className="muted">{t.description.slice(0, 80)}</div>
                  </td>
                  <td>{t.assignee?.name ?? "—"}</td>
                  <td>
                    {user?.role === "DEVELOPER" && t.assigneeId === user.id ? (
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
                        {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
                          <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`badge ${t.status}`}>{t.status.replaceAll("_", " ")}</span>
                    )}
                  </td>
                  <td>{formatDay(t.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>History</h3>
          <ActivityList items={activities.slice(0, 20).map((a) => ({ ...a, project: { id: project.id, name: project.name } }))} />
        </div>
      </div>
    </>
  );
}
