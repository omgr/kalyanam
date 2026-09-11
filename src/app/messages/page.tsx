"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  Bell,
  AlertTriangle,
  Check,
  CheckCheck,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useMessages, useWedding, useFamilyMembers } from "@/lib/db/hooks";
import { db, Message } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/session";
import { toast } from "@/hooks/use-toast";
import { generateId, formatDate } from "@/lib/utils";

export default function MessagesPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: "",
    content: "",
    type: "message" as Message["type"],
    priority: "normal" as Message["priority"],
    recipientIds: [] as string[],
  });

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(storedWeddingId);
    // Derive and persist a user id if this device arrived via import or sync.
    resolveUserId(storedWeddingId).then(setUserId);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const messages = useMessages(weddingId ?? undefined);
  const familyMembers = useFamilyMembers(weddingId ?? undefined);

  const handleSendMessage = async () => {
    if (!weddingId || !newMessage.content) return;

    const senderUserId = userId ?? (await resolveUserId(weddingId));
    const member = familyMembers?.find((m) => m.userId === senderUserId);

    try {
      await db.messages.add({
      id: generateId(),
      weddingId,
      senderId: member?.id || senderUserId,
      recipientIds: newMessage.recipientIds.length > 0 ? newMessage.recipientIds : undefined,
      subject: newMessage.subject || undefined,
      content: newMessage.content,
      type: newMessage.type,
      priority: newMessage.priority,
      isRead: false,
      readBy: [],
      createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Could not send message",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      return;
    }

    setNewMessage({
      subject: "",
      content: "",
      type: "message",
      priority: "normal",
      recipientIds: [],
    });
    setIsComposing(false);
  };

  const handleMarkAsRead = async (messageId: string) => {
    const message = messages?.find((m) => m.id === messageId);
    if (!message || !userId) return;

    const member = familyMembers?.find((m) => m.userId === userId);
    const readerId = member?.id || userId;

    if (!message.readBy.includes(readerId)) {
      await db.messages.update(messageId, {
        readBy: [...message.readBy, readerId],
        isRead: true,
      });
    }
  };

  const getTypeIcon = (type: Message["type"]) => {
    switch (type) {
      case "announcement":
        return <Bell className="w-4 h-4 text-blue-500" />;
      case "reminder":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-primary" />;
    }
  };

  const getTypeBadge = (type: Message["type"]) => {
    switch (type) {
      case "announcement":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "reminder":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "alert":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getPriorityBadge = (priority: Message["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "important":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "";
    }
  };

  if (!weddingId || !wedding) {
    return null;
  }

  const currentMember = familyMembers?.find((m) => m.userId === userId);
  const unreadCount = messages?.filter(
    (m) => !m.readBy.includes(currentMember?.id || userId || "")
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              Messages
            </h1>
            <p className="text-muted-foreground">
              {messages?.length || 0} messages
              {unreadCount && unreadCount > 0 && (
                <span className="text-primary"> • {unreadCount} unread</span>
              )}
            </p>
          </div>
          <Button onClick={() => setIsComposing(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        {/* Compose Message */}
        {isComposing && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                New Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Message Type</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newMessage.type}
                    onChange={(e) =>
                      setNewMessage({
                        ...newMessage,
                        type: e.target.value as Message["type"],
                      })
                    }
                  >
                    <option value="message">💬 Message</option>
                    <option value="announcement">📢 Announcement</option>
                    <option value="reminder">⏰ Reminder</option>
                    <option value="alert">⚠️ Alert</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newMessage.priority}
                    onChange={(e) =>
                      setNewMessage({
                        ...newMessage,
                        priority: e.target.value as Message["priority"],
                      })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Send To</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMessage({ ...newMessage, recipientIds: [] })}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      newMessage.recipientIds.length === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <Users className="w-3 h-3 inline mr-1" />
                    Everyone
                  </button>
                  {familyMembers?.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        const isSelected = newMessage.recipientIds.includes(member.id);
                        setNewMessage({
                          ...newMessage,
                          recipientIds: isSelected
                            ? newMessage.recipientIds.filter((id) => id !== member.id)
                            : [...newMessage.recipientIds, member.id],
                        });
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        newMessage.recipientIds.includes(member.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  placeholder="Message subject..."
                  value={newMessage.subject}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, subject: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message *</Label>
                <textarea
                  id="content"
                  className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Type your message..."
                  value={newMessage.content}
                  onChange={(e) =>
                    setNewMessage({ ...newMessage, content: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsComposing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.content.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages List */}
        <div className="space-y-3">
          {messages && messages.length > 0 ? (
            messages.map((message, index) => {
              const sender = familyMembers?.find((m) => m.id === message.senderId);
              const isRead = message.readBy.includes(currentMember?.id || userId || "");

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !isRead ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => handleMarkAsRead(message.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold">
                          {sender?.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {sender?.name || "Unknown"}
                                </span>
                                {getTypeIcon(message.type)}
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadge(
                                    message.type
                                  )}`}
                                >
                                  {message.type}
                                </span>
                                {message.priority !== "normal" && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(
                                      message.priority
                                    )}`}
                                  >
                                    {message.priority}
                                  </span>
                                )}
                              </div>
                              {message.subject && (
                                <p className="font-medium mt-1">{message.subject}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDate(message.createdAt, "relative")}</span>
                              {isRead ? (
                                <CheckCheck className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {message.content}
                          </p>
                          {!message.recipientIds && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Users className="w-3 h-3" /> Sent to everyone
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start communicating with your family members
                </p>
                <Button onClick={() => setIsComposing(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Send First Message
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

