# TaskFlow — Real-Time Client Project Dashboard

Internal project desk for a small agency. Admins and project managers run clients, projects, and tasks. Developers update only the work assigned to them. Status changes are persisted as activity and pushed live over Socket.IO.

## Stack

- React + TypeScript (Vite)
- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- Socket.IO
- JWT access tokens + HttpOnly refresh cookies
- bcrypt, dotenv, node-cron

## Quick start

**Requirements:** Docker (for Postgres), Node.js 20+.

```bash
docker compose up -d
cd server && npm install && npx prisma migrate dev --name init && npm run prisma:seed
cd ../client && npm install
cd .. && npm install && npm run dev
```

- API: http://localhost:4000
- App: http://localhost:5173

If Postgres is already running locally, copy `server/.env.example` to `server/.env` and point `DATABASE_URL` at it.

## Seeded accounts

Password for all users: `Password123!`

| Email | Role |
| --- | --- |
| admin@agency.test | Admin |
| pm.ava@agency.test | Project manager |
| pm.leo@agency.test | Project manager |
| dev.maya@agency.test | Developer |
| dev.noah@agency.test | Developer |
| dev.iris@agency.test | Developer |

## Roles

- **Admin** — users, clients, projects, tasks, global activity.
- **Project manager** — clients they work with, projects they created, tasks on those projects, activity from their projects.
- **Developer** — assigned tasks only; can change status/description; activity for those tasks.

## Auth

- `POST /api/auth/login` returns a short-lived access token. The refresh token is stored hashed in Postgres and sent as an **HttpOnly** cookie (`refreshToken`, path `/api/auth`).
- `POST /api/auth/refresh` rotates the refresh token.
- `POST /api/auth/logout` revokes the cookie-backed token.
- Access tokens are sent as `Authorization: Bearer`. Socket.IO authenticates with the same token.

## Real-time

- Every task status or assignment change writes an `Activity` row (who, what, when) and emits `activity:new`.
- Admins join an `admins` room (global feed). PMs and developers receive events on `user:{id}` when they own the project or are assigned the task.
- Returning users load the latest **20** relevant events from `GET /api/activity?limit=20`.
- Notifications (assignment, in-review, overdue) persist in PostgreSQL and emit `notification:new`. Mark one (`PATCH /api/notifications/:id/read`) or all (`PATCH /api/notifications/read-all`).

## Background job

`node-cron` runs hourly (`0 * * * *`) and also once at boot. Open tasks past `dueDate` get an overdue activity record and notifications (at most once per 24 hours per task).

## Task filters

`GET /api/tasks` accepts URL query parameters, mirrored in the UI:

- `status` (comma-separated enum)
- `priority`
- `dueFrom` / `dueTo` (ISO dates)
- `projectId`, `assigneeId`

Example: `/tasks?status=IN_REVIEW&priority=HIGH&dueFrom=2026-09-01`

## API surface

| Area | Methods |
| --- | --- |
| Auth | `POST /api/auth/login`, `refresh`, `logout`, `GET /me` |
| Users | Admin CRUD; `GET /api/users/developers` for PMs |
| Clients | `GET/POST /api/clients`, `GET/PATCH/DELETE /api/clients/:id` |
| Projects | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id` |
| Tasks | `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id` |
| Activity | `GET /api/activity` |
| Notifications | `GET /api/notifications`, read endpoints above |
| Dashboard | `GET /api/dashboard` |
| Health | `GET /api/health` |

## Production notes

- Set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`, `COOKIE_SECURE=true` behind HTTPS, and a locked-down `CLIENT_ORIGIN`.
- Indexes cover role, project ownership, task status/priority/due date, and activity/notification feeds.
- CORS is credentialed. Refresh cookies are not available to JavaScript.

## Layout

```
client/   React SPA
server/   Express API, Prisma, sockets, cron
  prisma/schema.prisma
  prisma/seed.ts
docker-compose.yml
```
