import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "./api";
import type { Activity, Notification } from "./types";

export function useRealtime(handlers: {
  onActivity?: (activity: Activity) => void;
  onNotification?: (notification: Notification) => void;
  enabled: boolean;
}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!handlers.enabled) return;
    const token = getAccessToken();
    if (!token) return;

    const socket: Socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("activity:new", (activity: Activity) => handlersRef.current.onActivity?.(activity));
    socket.on("notification:new", (notification: Notification) =>
      handlersRef.current.onNotification?.(notification)
    );

    return () => {
      socket.disconnect();
    };
  }, [handlers.enabled]);
}
