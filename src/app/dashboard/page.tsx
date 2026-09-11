"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  Wallet,
  CheckSquare,
  Bell,
  MapPin,
  Heart,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useWedding,
  useEvents,
  useGuests,
  useTasks,
  useBudgetSummary,
  useFamilyMembers,
} from "@/lib/db/hooks";
import { formatCurrency, formatDate, getDaysUntil, calculatePercentage } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(storedWeddingId);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const events = useEvents(weddingId ?? undefined);
  const guests = useGuests(weddingId ?? undefined);
  const tasks = useTasks(weddingId ?? undefined);
  const budgetSummary = useBudgetSummary(weddingId ?? undefined);
  const familyMembers = useFamilyMembers(weddingId ?? undefined);

  if (!weddingId || !wedding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Heart className="w-12 h-12 text-primary animate-bounce" />
          <p className="text-muted-foreground">Loading your wedding...</p>
        </div>
      </div>
    );
  }

  const daysUntilWedding = getDaysUntil(wedding.weddingDate);
  const upcomingEvents = events?.filter(
    (e) => e.status === "scheduled" && new Date(e.date) >= new Date()
  ).slice(0, 3);
  const pendingTasks = tasks?.filter((t) => t.status === "pending" || t.status === "in_progress");
  const overdueTasks = tasks?.filter(
    (t) =>
      (t.status === "pending" || t.status === "in_progress") &&
      t.dueDate &&
      new Date(t.dueDate) < new Date()
  );
  const confirmedGuests = guests?.filter((g) => g.rsvpStatus === "confirmed");

  const stats = [
    {
      title: "Days to Go",
      value: daysUntilWedding > 0 ? daysUntilWedding : "🎉",
      subtitle: daysUntilWedding > 0 ? "until the big day" : "It's wedding time!",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Events",
      value: events?.length || 0,
      subtitle: `${upcomingEvents?.length || 0} upcoming`,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Guests",
      value: guests?.length || 0,
      subtitle: `${confirmedGuests?.length || 0} confirmed`,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Tasks",
      value: pendingTasks?.length || 0,
      subtitle: overdueTasks?.length ? `${overdueTasks.length} overdue` : "pending",
      icon: CheckSquare,
      color: overdueTasks?.length ? "text-red-500" : "text-orange-500",
      bgColor: overdueTasks?.length ? "bg-red-500/10" : "bg-orange-500/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">
              {wedding.name}
            </h1>
            <p className="text-muted-foreground">
              {formatDate(wedding.weddingDate, "long")}
              {wedding.venue && ` • ${wedding.venue}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/family")}>
              <Users className="w-4 h-4 mr-2" />
              Family ({familyMembers?.length || 0})
            </Button>
            <Button onClick={() => router.push("/events/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Countdown Banner */}
        {daysUntilWedding > 0 && daysUntilWedding <= 30 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gradient-warm text-white rounded-2xl p-6 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 pattern-paisley opacity-30" />
            <div className="relative z-10">
              <p className="text-lg opacity-90">The big day is almost here!</p>
              <p className="text-5xl font-display font-bold my-2">
                {daysUntilWedding} {daysUntilWedding === 1 ? "Day" : "Days"} to Go
              </p>
              <p className="opacity-80">
                {wedding.brideName} & {wedding.groomName}'s Wedding
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.subtitle}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Overview */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Budget Overview
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/budget")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {budgetSummary ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Budget</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(budgetSummary.totalBudget, wedding.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Spent</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(budgetSummary.totalSpent, wedding.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetSummary.percentSpent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          budgetSummary.percentSpent > 90
                            ? "bg-red-500"
                            : budgetSummary.percentSpent > 75
                            ? "bg-orange-500"
                            : "bg-green-500"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{budgetSummary.percentSpent.toFixed(0)}% used</span>
                      <span>
                        {formatCurrency(budgetSummary.totalRemaining, wedding.currency)} remaining
                      </span>
                    </div>
                  </div>

                  {/* Top Categories */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {budgetSummary.categoryBreakdown.slice(0, 4).map((cat) => (
                      <div
                        key={cat.id}
                        className="p-3 rounded-lg bg-muted/50 flex items-center gap-2"
                      >
                        <span>{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(cat.spent, wedding.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No budget set yet</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => router.push("/budget")}
                  >
                    Set up budget
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Upcoming
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/events")}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingEvents && upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/events?id=${event.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-center min-w-[50px]">
                          <p className="text-xs text-muted-foreground uppercase">
                            {new Date(event.date).toLocaleDateString("en-US", {
                              month: "short",
                            })}
                          </p>
                          <p className="text-xl font-bold">
                            {new Date(event.date).getDate()}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.name}</p>
                          {event.localName && (
                            <p className="text-sm text-muted-foreground truncate">
                              {event.localName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(event.date, "relative")}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Manage Guests", href: "/guests", color: "text-green-500" },
            { icon: CheckSquare, label: "View Tasks", href: "/tasks", color: "text-orange-500" },
            { icon: MapPin, label: "Find Family", href: "/location", color: "text-blue-500" },
            { icon: Bell, label: "Reminders", href: "/reminders", color: "text-purple-500" },
          ].map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => router.push(action.href)}
              >
                <action.icon className={`w-6 h-6 ${action.color}`} />
                <span>{action.label}</span>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Alerts Section */}
        {overdueTasks && overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue Tasks ({overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 rounded bg-white/50 dark:bg-black/20"
                    >
                      <span className="text-sm">{task.title}</span>
                      <span className="text-xs text-red-600 dark:text-red-400">
                        Due {formatDate(task.dueDate!, "relative")}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="link"
                  className="mt-2 text-red-600 dark:text-red-400 p-0"
                  onClick={() => router.push("/tasks?filter=overdue")}
                >
                  View all overdue tasks →
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}

