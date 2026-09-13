"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Send, ArrowLeft, Megaphone, AlertTriangle, Bell, Users2, BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db, type Message } from "@/lib/db/schema";
import { useMessages, useFamilyMembers, useWedding } from "@/lib/db/hooks";
import { resolveUserId, getDeviceMemberId } from "@/lib/session";
import { generateId } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { logInfo, logError } from "@/lib/diagnostics/logger";
import { useMessageAlerts } from "@/hooks/use-message-alerts";
import { WhoAreYou } from "@/components/sync/who-are-you";
import { buildThreads, EVERYONE, type Thread } from "@/lib/messages/threads";

type Tone = Message["type"];

const TONES: Array<{ value: Tone; label: string; icon: typeof Bell }> = [
  { value: "message", label: "Message", icon: MessageSquare },
  { value: "announcement", label: "Announcement", icon: Megaphone },
  { value: "reminder", label: "Reminder", icon: Bell },
  { value: "alert", label: "Alert", icon: AlertTriangle },
];

/**
 * Family chat.
 *
 * Kept inside Kalyanam not to compete with WhatsApp but to save switching
 * apps in the middle of something: the plan, the person and the conversation
 * about it are all in one place. The family group chat carries on elsewhere.
 */
export default function ChatClient() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>(EVERYONE);
  const [draft, setDraft] = useState("");
  const [tone, setTone] = useState<Tone>("message");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kalyanam_wedding_id");
    if (!stored) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(stored);
    setMemberId(getDeviceMemberId());
    void resolveUserId(stored);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const messages = useMessages(weddingId ?? undefined);
  const members = useFamilyMembers(weddingId ?? undefined);
  const alerts = useMessageAlerts(weddingId);

  const threads = useMemo(
    () => buildThreads(messages ?? [], members ?? [], memberId, 0),
    [messages, members, memberId]
  );
  const active: Thread | undefined =
    threads.find((t) => t.id === activeId) ?? threads[0];

  // Opening a conversation means its messages have been seen.
  useEffect(() => {
    if (weddingId) alerts.markAllSeen();
  }, [weddingId, activeId, messages, alerts]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, activeId]);

  const nameOf = (id: string) => members?.find((m) => m.id === id)?.name ?? "Someone";

  const send = async () => {
    if (!weddingId || !draft.trim() || !active) return;
    if (!memberId) {
      toast({
        variant: "destructive",
        title: "Tell us who you are first",
        description: "Choose which family member is using this device.",
      });
      return;
    }

    setSending(true);
    try {
      await db.messages.add({
        id: generateId(),
        weddingId,
        senderId: memberId,
        // No recipients means the whole family; otherwise it stays between the two.
        recipientIds: active.id === EVERYONE ? undefined : [active.id],
        content: draft.trim(),
        type: tone,
        priority: tone === "alert" ? "urgent" : tone === "announcement" ? "important" : "normal",
        isRead: false,
        readBy: [memberId],
        createdAt: new Date(),
      } as never);

      void logInfo("messages", "sent a message", {
        to: active.id === EVERYONE ? "everyone" : "one person",
        tone,
      });
      setDraft("");
      setTone("message");
    } catch (error) {
      void logError("messages", "could not send", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      toast({
        variant: "destructive",
        title: "Could not send",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  if (!weddingId || !wedding) return null;

  const toneStyle = (m: Message) =>
    m.type === "alert"
      ? "border-l-4 border-red-500"
      : m.type === "announcement"
        ? "border-l-4 border-primary"
        : m.type === "reminder"
          ? "border-l-4 border-yellow-500"
          : "";

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Chat
          </h1>
          {alerts.permission === "default" && (
            <Button variant="outline" size="sm" onClick={() => void alerts.requestPermission()}>
              <BellRing className="w-4 h-4 mr-2" />
              Turn on alerts
            </Button>
          )}
        </div>

        {!memberId && (
          <WhoAreYou weddingId={weddingId} onChosen={setMemberId} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversations */}
          <Card className={`lg:col-span-1 ${active && activeId !== EVERYONE ? "hidden lg:block" : ""}`}>
            <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveId(thread.id)}
                  className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
                    thread.id === active?.id ? "bg-primary/10" : "hover:bg-muted"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {thread.id === EVERYONE ? (
                      <Users2 className="w-4 h-4 text-primary" />
                    ) : (
                      <span className="text-sm font-bold">{thread.title.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{thread.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {thread.messages.length
                        ? thread.messages[thread.messages.length - 1].content
                        : "No messages yet"}
                    </p>
                  </div>
                  {thread.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {thread.unread}
                    </span>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* The conversation */}
          <Card className={`lg:col-span-2 flex flex-col ${activeId === EVERYONE ? "hidden lg:flex" : ""} lg:flex`}>
            <div className="flex items-center gap-2 border-b border-border p-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden -ml-2"
                onClick={() => setActiveId(EVERYONE)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <p className="font-medium">{active?.title}</p>
              {active?.id === EVERYONE && (
                <span className="text-xs text-muted-foreground">
                  · everyone on this wedding
                </span>
              )}
            </div>

            <CardContent className="flex-1 space-y-3 overflow-y-auto p-3 min-h-[45vh] max-h-[60vh]">
              {active?.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  {active.id === EVERYONE
                    ? "Nothing here yet. Post the day's running order, or ask a question."
                    : `No messages with ${active.title} yet.`}
                </p>
              ) : (
                active?.messages.map((message) => {
                  const mine = message.senderId === memberId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${toneStyle(message)} ${
                          mine ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {!mine && active.id === EVERYONE && (
                          <p className="text-xs font-medium opacity-70 mb-0.5">
                            {nameOf(message.senderId)}
                          </p>
                        )}
                        {message.type !== "message" && (
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                            {message.type}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p className="text-[10px] opacity-60 mt-0.5">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </CardContent>

            <div className="border-t border-border p-3 space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                      tone === t.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/70"
                    }`}
                  >
                    <t.icon className="w-3 h-3" />
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={`Message ${active?.title ?? ""}...`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  disabled={sending}
                />
                <Button onClick={() => void send()} disabled={!draft.trim() || sending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
