"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  MoreVertical,
  Trash2,
  Edit,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useTasks, useWedding, useFamilyMembers } from "@/lib/db/hooks";
import { db, Task } from "@/lib/db/schema";
import { resolveUserId } from "@/lib/session";
import { toast } from "@/hooks/use-toast";
import { generateId, formatDate } from "@/lib/utils";

export default function TasksPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    dueDate: "",
    assignedTo: [] as string[],
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
  const tasks = useTasks(weddingId ?? undefined);
  const familyMembers = useFamilyMembers(weddingId ?? undefined);

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || task.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleAddTask = async () => {
    if (!weddingId || !newTask.title) return;

    try {
      const createdBy = userId ?? (await resolveUserId(weddingId));

      await db.tasks.add({
        id: generateId(),
        weddingId,
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        status: "pending",
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
        assignedTo: newTask.assignedTo.length > 0 ? newTask.assignedTo : undefined,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        variant: "destructive",
        title: "Could not add task",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      return;
    }

    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      assignedTo: [],
    });
    setIsAddingTask(false);
  };

  const handleUpdateStatus = async (taskId: string, status: Task["status"]) => {
    await db.tasks.update(taskId, {
      status,
      completedAt: status === "completed" ? new Date() : undefined,
      completedBy: status === "completed" ? userId ?? undefined : undefined,
      updatedAt: new Date(),
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await db.tasks.delete(taskId);
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  const getPriorityBadge = (priority: Task["priority"]) => {
    const colors = {
      low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[priority];
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "cancelled":
        return <Circle className="w-5 h-5 text-gray-400 line-through" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const isOverdue = (task: Task) => {
    return (
      task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== "completed" &&
      task.status !== "cancelled"
    );
  };

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter((t) => t.status === "pending").length || 0,
    inProgress: tasks?.filter((t) => t.status === "in_progress").length || 0,
    completed: tasks?.filter((t) => t.status === "completed").length || 0,
    overdue: tasks?.filter(isOverdue).length || 0,
  };

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
              <CheckSquare className="w-8 h-8 text-primary" />
              Tasks
            </h1>
            <p className="text-muted-foreground">
              {stats.completed} of {stats.total} tasks completed
            </p>
          </div>
          <Button onClick={() => setIsAddingTask(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className={stats.overdue > 0 ? "border-red-300 dark:border-red-900" : ""}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Add Task Form */}
        {isAddingTask && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  placeholder="e.g., Book photographer"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskDescription">Description</Label>
                <textarea
                  id="taskDescription"
                  className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add more details..."
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        priority: e.target.value as Task["priority"],
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) =>
                      setNewTask({ ...newTask, dueDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newTask.assignedTo[0] || ""}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        assignedTo: e.target.value ? [e.target.value] : [],
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {familyMembers?.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask} disabled={!newTask.title}>
                  Add Task
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks && filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card
                  className={`transition-all hover:shadow-md ${
                    isOverdue(task) ? "border-red-300 dark:border-red-900" : ""
                  } ${task.status === "completed" ? "opacity-75" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() =>
                          handleUpdateStatus(
                            task.id,
                            task.status === "completed" ? "pending" : "completed"
                          )
                        }
                        className="mt-1"
                      >
                        {getStatusIcon(task.status)}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3
                              className={`font-semibold ${
                                task.status === "completed"
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(
                                task.priority
                              )}`}
                            >
                              <Flag className={`w-3 h-3 inline mr-1 ${getPriorityColor(task.priority)}`} />
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 ${
                                isOverdue(task) ? "text-red-500" : ""
                              }`}
                            >
                              {isOverdue(task) ? (
                                <AlertTriangle className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                              {formatDate(task.dueDate, "relative")}
                            </span>
                          )}
                          {task.assignedTo && task.assignedTo.length > 0 && (
                            <span className="flex items-center gap-1">
                              Assigned to:{" "}
                              {familyMembers
                                ?.filter((m) => task.assignedTo?.includes(m.id))
                                .map((m) => m.name)
                                .join(", ")}
                            </span>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-3">
                          {task.status !== "completed" && (
                            <>
                              {task.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(task.id, "in_progress")}
                                >
                                  Start
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateStatus(task.id, "completed")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                    ? "Try adjusting your filters"
                    : "Start adding tasks to track your wedding preparations"}
                </p>
                <Button onClick={() => setIsAddingTask(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Task
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

