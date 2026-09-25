import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { useRealtime } from "./useRealtime";
import type { Activity, Notification } from "./types";

type LiveValue = {
  activities: Activity[];
  notifications: Notification[];
  unread: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setUnread: React.Dispatch<React.SetStateAction<number>>;
};

const LiveContext = createContext<LiveValue | undefined>(undefined);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api<{ activities: Activity[] }>("/api/activity?limit=20").then((d) => setActivities(d.activities));
    api<{ notifications: Notification[]; unreadCount: number }>("/api/notifications").then((d) => {
      setNotifications(d.notifications);
      setUnread(d.unreadCount);
    });
  }, []);

  useRealtime({
    enabled: true,
    onActivity: (a) => setActivities((prev) => [a, ...prev.filter((x) => x.id !== a.id)].slice(0, 40)),
    onNotification: (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnread((c) => c + 1);
    },
  });

  return (
    <LiveContext.Provider value={{ activities, notifications, unread, setNotifications, setUnread }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within LiveProvider");
  return ctx;
}
