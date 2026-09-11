"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  CheckSquare,
  Wallet,
  Repeat,
  Trash2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useReminders, useWedding, useEvents, useTasks } from "@/lib/db/hooks";
import { db, Reminder } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/session";
import { toast } from "@/hooks/use-toast";
import { generateId, formatDate } from "@/lib/utils";

export default function RemindersPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: "",
    message: "",
    scheduledFor: "",
    relatedTo: "custom" as Reminder["relatedTo"],
    repeatType: "none" as Reminder["repeatType"],
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
  const reminders = useReminders(weddingId ?? undefined);
  const events = useEvents(weddingId ?? undefined);
  const tasks = useTasks(weddingId ?? undefined);

  const handleAddReminder = async () => {
    if (!weddingId || !newReminder.title || !newReminder.scheduledFor) return;

    try {
      const createdBy = userId ?? (await resolveUserId(weddingId));

      await db.reminders.add({
        id: generateId(),
        weddingId,
        relatedTo: newReminder.relatedTo,
        title: newReminder.title,
        message: newReminder.message || undefined,
        scheduledFor: new Date(newReminder.scheduledFor),
        repeatType: newReminder.repeatType,
        isTriggered: false,
        createdBy,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error adding reminder:", error);
      toast({
        variant: "destructive",
        title: "Could not create reminder",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      return;
    }

    setNewReminder({
      title: "",
      message: "",
      scheduledFor: "",
      relatedTo: "custom",
      repeatType: "none",
    });
    setIsAddingReminder(false);
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      await db.reminders.delete(reminderId);
    }
  };

  const handleMarkTriggered = async (reminderId: string) => {
    await db.reminders.update(reminderId, {
      isTriggered: true,
      triggeredAt: new Date(),
    });
  };

  const getRelatedIcon = (relatedTo: Reminder["relatedTo"]) => {
    switch (relatedTo) {
      case "event":
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case "task":
        return <CheckSquare className="w-4 h-4 text-orange-500" />;
      case "expense":
        return <Wallet className="w-4 h-4 text-green-500" />;
      case "followup":
        return <Repeat className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const isOverdue = (reminder: Reminder) => {
    return new Date(reminder.scheduledFor) < new Date() && !reminder.isTriggered;
  };

  const upcomingReminders = reminders
    ?.filter((r) => !r.isTriggered && new Date(r.scheduledFor) >= new Date())
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  const overdueReminders = reminders?.filter(isOverdue);

  const completedReminders = reminders
    ?.filter((r) => r.isTriggered)
    .sort((a, b) => new Date(b.triggeredAt!).getTime() - new Date(a.triggeredAt!).getTime());

  if (!weddingId || !wedding) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Bell className="w-8 h-8 text-primary" />
              Reminders
            </h1>
            <p className="text-muted-foreground">
              {upcomingReminders?.length || 0} upcoming
              {overdueReminders && overdueReminders.length > 0 && (
                <span className="text-red-500"> • {overdueReminders.length} overdue</span>
              )}
            </p>
          </div>
          <Button onClick={() => setIsAddingReminder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Reminder
          </Button>
        </div>

        {/* Add Reminder Form */}
        {isAddingReminder && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                New Reminder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Reminder Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Pay photographer balance"
                    value={newReminder.title}
                    onChange={(e) =>
                      setNewReminder({ ...newReminder, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledFor">Remind On *</Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={newReminder.scheduledFor}
                    onChange={(e) =>
                      setNewReminder({ ...newReminder, scheduledFor: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Related To</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newReminder.relatedTo}
                    onChange={(e) =>
                      setNewReminder({
                        ...newReminder,
                        relatedTo: e.target.value as Reminder["relatedTo"],
                      })
                    }
                  >
                    <option value="custom">Custom Reminder</option>
                    <option value="event">Event</option>
                    <option value="task">Task</option>
                    <option value="expense">Payment/Expense</option>
                    <option value="followup">Follow-up</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newReminder.repeatType}
                    onChange={(e) =>
                      setNewReminder({
                        ...newReminder,
                        repeatType: e.target.value as Reminder["repeatType"],
                      })
                    }
                  >
                    <option value="none">Don't Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <textarea
                  id="message"
                  className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Additional details..."
                  value={newReminder.message}
                  onChange={(e) =>
                    setNewReminder({ ...newReminder, message: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAddingReminder(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddReminder}
                  disabled={!newReminder.title || !newReminder.scheduledFor}
                >
                  Create Reminder
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overdue Reminders */}
        {overdueReminders && overdueReminders.length > 0 && (
          <Card className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Overdue ({overdueReminders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-black/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getRelatedIcon(reminder.relatedTo)}
                    <div>
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Was due {formatDate(reminder.scheduledFor, "relative")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkTriggered(reminder.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteReminder(reminder.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming ({upcomingReminders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReminders && upcomingReminders.length > 0 ? (
              <div className="space-y-3">
                {upcomingReminders.map((reminder, index) => (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getRelatedIcon(reminder.relatedTo)}
                      <div>
                        <p className="font-medium">{reminder.title}</p>
                        {reminder.message && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {reminder.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(reminder.scheduledFor, "long")}
                          </span>
                          {reminder.repeatType !== "none" && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              {reminder.repeatType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkTriggered(reminder.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteReminder(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No upcoming reminders</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setIsAddingReminder(true)}
                >
                  Create your first reminder
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Reminders */}
        {completedReminders && completedReminders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-5 h-5" />
                Completed ({completedReminders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 opacity-60">
                {completedReminders.slice(0, 5).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm line-through">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Completed {formatDate(reminder.triggeredAt!, "relative")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteReminder(reminder.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

