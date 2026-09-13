"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Message } from "@/lib/db/schema";
import { getDeviceMemberId } from "@/lib/session";
import { logInfo } from "@/lib/diagnostics/logger";

const SEEN_KEY = "kalyanam_messages_seen_at";

/**
 * Noticing that a message arrived.
 *
 * Messages sync, but syncing silently is the same as not arriving: on the day,
 * "the priest wants everyone at 5:30" is only useful if somebody looks. This
 * raises a browser notification when one lands from someone else, and exposes
 * an unread count for the navigation.
 *
 * Notifications need permission and only fire while the app is open - phones
 * suspend background pages, and without a push server there is no way to reach
 * a closed one. Anything genuinely urgent still warrants a phone call, and the
 * app says so.
 */
export function useMessageAlerts(weddingId: string | null | undefined) {
  // These run during the static prerender too, where there is no window at
  // all, so nothing may touch localStorage or Notification until mount.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const lastSeen = useRef<number>(0);
  const announced = useRef<Set<string>>(new Set());

  useEffect(() => {
    lastSeen.current = Number(localStorage.getItem(SEEN_KEY) ?? 0);
    setPermission(
      typeof Notification === "undefined" ? "unsupported" : Notification.permission
    );
  }, []);

  const messages = useLiveQuery(
    () =>
      weddingId
        ? db.messages.where("weddingId").equals(weddingId).toArray()
        : ([] as Message[]),
    [weddingId]
  );

  const [memberId, setMemberId] = useState<string | null>(null);
  useEffect(() => setMemberId(getDeviceMemberId()), []);

  const fromOthers = (messages ?? []).filter((m) => m.senderId !== memberId);
  const unread = fromOthers.filter(
    (m) => new Date(m.createdAt).getTime() > lastSeen.current
  );

  // The installed app can carry an unread count on its icon, which survives
  // the page being backgrounded in a way a notification does not.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge) return;
    void (unread.length > 0 ? nav.setAppBadge(unread.length) : nav.clearAppBadge?.());
  }, [unread.length]);

  useEffect(() => {
    if (permission !== "granted" || !messages) return;

    for (const message of unread) {
      if (announced.current.has(message.id)) continue;
      announced.current.add(message.id);

      const label =
        message.type === "alert"
          ? "Alert"
          : message.type === "announcement"
            ? "Announcement"
            : message.type === "reminder"
              ? "Reminder"
              : "Message";

      try {
        // Prefer the service worker: its notifications survive the page being
        // backgrounded, where a page-owned one can be dropped.
        void navigator.serviceWorker?.ready
          ?.then((registration) =>
            registration.showNotification(`Kalyanam - ${label}`, {
              body: message.subject || message.content.slice(0, 120),
              tag: message.id,
              badge: "/kalyanam/icons/icon.svg",
              icon: "/kalyanam/icons/icon.svg",
              requireInteraction: message.priority === "urgent",
              data: { url: "/kalyanam/messages" },
            })
          )
          .catch(() => {
            /* fall through to the page-owned notification below */
          });

        const notification = new Notification(`Kalyanam - ${label}`, {
          body: message.subject || message.content.slice(0, 120),
          tag: message.id,
          // Urgent things should not be silently collapsed into a stack.
          requireInteraction: message.priority === "urgent",
        });
        notification.onclick = () => {
          window.focus();
          window.location.href = "/messages";
        };
        void logInfo("messages", "notified about an incoming message", {
          type: message.type,
          priority: message.priority,
        });
      } catch {
        /* some browsers refuse to construct notifications outside a worker */
      }
    }
  }, [messages, unread, permission]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    void logInfo("messages", "notification permission", { result });
  };

  /** Call when the messages screen is open - everything older is now seen. */
  const markAllSeen = () => {
    const now = Date.now();
    lastSeen.current = now;
    localStorage.setItem(SEEN_KEY, String(now));
  };

  return {
    unreadCount: unread.length,
    permission,
    requestPermission,
    markAllSeen,
  };
}
