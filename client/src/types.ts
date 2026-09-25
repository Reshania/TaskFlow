export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  createdBy?: { id: string; name: string };
  _count?: { projects: number };
  projects?: Project[];
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  clientId: string;
  createdById: string;
  client?: { id: string; name: string; company?: string };
  createdBy?: { id: string; name: string };
  _count?: { tasks: number };
  tasks?: Task[];
};

export type Activity = {
  id: string;
  type: string;
  message: string;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; role: string } | null;
  task?: { id: string; title: string } | null;
  project: { id: string; name: string };
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  projectId: string;
  assigneeId?: string | null;
  assignee?: User | null;
  project?: { id: string; name: string; createdById?: string; client?: { name: string } };
  activities?: Activity[];
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  task?: { id: string; title: string; projectId: string } | null;
};

export type DashboardData = {
  stats: {
    projectCount: number;
    taskCount: number;
    clientCount: number;
    unreadNotifications: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    overdueCount: number;
    dueSoonCount: number;
    completionRate: number;
    usersByRole: { role: Role; _count: number }[];
  };
  overdue: Task[];
  dueSoon: Task[];
  projects: Project[];
};
