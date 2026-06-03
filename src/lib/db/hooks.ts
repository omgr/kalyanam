import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./schema";
import type {
  Wedding,
  FamilyMember,
  WeddingEvent,
  Guest,
  Task,
  Expense,
  BudgetCategory,
  Vendor,
  Message,
  FollowUp,
  Culture,
  Reminder,
  AppSettings,
} from "./schema";

// ============================================
// WEDDING HOOKS
// ============================================

export function useWeddings() {
  return useLiveQuery(() => db.weddings.orderBy("weddingDate").toArray());
}

export function useWedding(id: string | undefined) {
  return useLiveQuery(() => (id ? db.weddings.get(id) : undefined), [id]);
}

export function useActiveWedding() {
  return useLiveQuery(() =>
    db.weddings.where("status").anyOf(["planning", "ongoing"]).first()
  );
}

// ============================================
// FAMILY MEMBER HOOKS
// ============================================

export function useFamilyMembers(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.familyMembers.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function useFamilyMember(id: string | undefined) {
  return useLiveQuery(() => (id ? db.familyMembers.get(id) : undefined), [id]);
}

export function useFamilyMembersByRole(
  weddingId: string | undefined,
  role: FamilyMember["role"]
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.familyMembers
            .where("weddingId")
            .equals(weddingId)
            .filter((m) => m.role === role)
            .toArray()
        : [],
    [weddingId, role]
  );
}

// ============================================
// EVENT HOOKS
// ============================================

export function useEvents(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.events
            .where("weddingId")
            .equals(weddingId)
            .sortBy("order")
        : [],
    [weddingId]
  );
}

export function useEvent(id: string | undefined) {
  return useLiveQuery(() => (id ? db.events.get(id) : undefined), [id]);
}

export function useEventsByCategory(
  weddingId: string | undefined,
  category: WeddingEvent["category"]
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.events
            .where("weddingId")
            .equals(weddingId)
            .filter((e) => e.category === category)
            .sortBy("order")
        : [],
    [weddingId, category]
  );
}

export function useUpcomingEvents(weddingId: string | undefined, limit = 5) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.events
            .where("weddingId")
            .equals(weddingId)
            .filter((e) => e.status === "scheduled" && new Date(e.date) >= new Date())
            .sortBy("date")
            .then((events) => events.slice(0, limit))
        : [],
    [weddingId, limit]
  );
}

// ============================================
// GUEST HOOKS
// ============================================

export function useGuests(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.guests.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function useGuest(id: string | undefined) {
  return useLiveQuery(() => (id ? db.guests.get(id) : undefined), [id]);
}

export function useGuestsByStatus(
  weddingId: string | undefined,
  status: Guest["rsvpStatus"]
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.guests
            .where("weddingId")
            .equals(weddingId)
            .filter((g) => g.rsvpStatus === status)
            .toArray()
        : [],
    [weddingId, status]
  );
}

export function useGuestStats(weddingId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!weddingId) return null;
      const guests = await db.guests.where("weddingId").equals(weddingId).toArray();
      return {
        total: guests.length,
        confirmed: guests.filter((g) => g.rsvpStatus === "confirmed").length,
        declined: guests.filter((g) => g.rsvpStatus === "declined").length,
        pending: guests.filter((g) => g.rsvpStatus === "pending").length,
        maybe: guests.filter((g) => g.rsvpStatus === "maybe").length,
        totalWithPlusOnes: guests.reduce((sum, g) => sum + 1 + (g.plusOnes || 0), 0),
        confirmedWithPlusOnes: guests
          .filter((g) => g.rsvpStatus === "confirmed")
          .reduce((sum, g) => sum + 1 + (g.plusOnes || 0), 0),
      };
    },
    [weddingId]
  );
}

// ============================================
// TASK HOOKS
// ============================================

export function useTasks(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.tasks.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function useTask(id: string | undefined) {
  return useLiveQuery(() => (id ? db.tasks.get(id) : undefined), [id]);
}

export function useTasksByStatus(
  weddingId: string | undefined,
  status: Task["status"]
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.tasks
            .where("weddingId")
            .equals(weddingId)
            .filter((t) => t.status === status)
            .toArray()
        : [],
    [weddingId, status]
  );
}

export function useTasksByAssignee(
  weddingId: string | undefined,
  memberId: string
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.tasks
            .where("weddingId")
            .equals(weddingId)
            .filter((t) => t.assignedTo?.includes(memberId) ?? false)
            .toArray()
        : [],
    [weddingId, memberId]
  );
}

export function useOverdueTasks(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.tasks
            .where("weddingId")
            .equals(weddingId)
            .filter(
              (t) =>
                t.status !== "completed" &&
                t.status !== "cancelled" &&
                !!t.dueDate &&
                new Date(t.dueDate) < new Date()
            )
            .toArray()
        : [],
    [weddingId]
  );
}

// ============================================
// BUDGET & EXPENSE HOOKS
// ============================================

export function useBudgetCategories(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.budgetCategories.where("weddingId").equals(weddingId).sortBy("order")
        : [],
    [weddingId]
  );
}

export function useExpenses(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.expenses.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function useExpensesByCategory(
  weddingId: string | undefined,
  categoryId: string
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.expenses
            .where("weddingId")
            .equals(weddingId)
            .filter((e) => e.categoryId === categoryId)
            .toArray()
        : [],
    [weddingId, categoryId]
  );
}

export function useBudgetSummary(weddingId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!weddingId) return null;
      const wedding = await db.weddings.get(weddingId);
      const categories = await db.budgetCategories
        .where("weddingId")
        .equals(weddingId)
        .toArray();
      const expenses = await db.expenses
        .where("weddingId")
        .equals(weddingId)
        .toArray();

      const totalBudget = wedding?.budget || 0;
      const totalAllocated = categories.reduce((sum, c) => sum + c.allocatedAmount, 0);
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPaid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);

      const categoryBreakdown = categories.map((cat) => {
        const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
        const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
        const paid = catExpenses.reduce((sum, e) => sum + e.amountPaid, 0);
        return {
          ...cat,
          spent,
          paid,
          remaining: cat.allocatedAmount - spent,
          percentUsed: cat.allocatedAmount > 0 ? (spent / cat.allocatedAmount) * 100 : 0,
        };
      });

      return {
        totalBudget,
        totalAllocated,
        totalSpent,
        totalPaid,
        totalRemaining: totalBudget - totalSpent,
        totalPending: totalSpent - totalPaid,
        unallocated: totalBudget - totalAllocated,
        percentSpent: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        categoryBreakdown,
      };
    },
    [weddingId]
  );
}

// ============================================
// VENDOR HOOKS
// ============================================

export function useVendors(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.vendors.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function useVendor(id: string | undefined) {
  return useLiveQuery(() => (id ? db.vendors.get(id) : undefined), [id]);
}

export function useVendorsByCategory(
  weddingId: string | undefined,
  category: string
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.vendors
            .where("weddingId")
            .equals(weddingId)
            .filter((v) => v.category === category)
            .toArray()
        : [],
    [weddingId, category]
  );
}

// ============================================
// MESSAGE HOOKS
// ============================================

export function useMessages(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.messages
            .where("weddingId")
            .equals(weddingId)
            .reverse()
            .sortBy("createdAt")
        : [],
    [weddingId]
  );
}

export function useUnreadMessages(weddingId: string | undefined, userId: string) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.messages
            .where("weddingId")
            .equals(weddingId)
            .filter((m) => !m.readBy.includes(userId))
            .toArray()
        : [],
    [weddingId, userId]
  );
}

// ============================================
// FOLLOW-UP HOOKS
// ============================================

export function useFollowUps(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.followUps.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function usePendingFollowUps(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.followUps
            .where("weddingId")
            .equals(weddingId)
            .filter((f) => f.status === "pending")
            .sortBy("dueDate")
        : [],
    [weddingId]
  );
}

export function useOverdueFollowUps(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.followUps
            .where("weddingId")
            .equals(weddingId)
            .filter(
              (f) =>
                f.status === "pending" && new Date(f.dueDate) < new Date()
            )
            .toArray()
        : [],
    [weddingId]
  );
}

// ============================================
// CULTURE HOOKS
// ============================================

export function useCultures() {
  return useLiveQuery(() => db.cultures.toArray());
}

export function useCulture(id: string | undefined) {
  return useLiveQuery(() => (id ? db.cultures.get(id) : undefined), [id]);
}

export function useCustomCultures() {
  return useLiveQuery(() =>
    db.cultures.filter((c) => c.isCustom === true).toArray()
  );
}

// ============================================
// REMINDER HOOKS
// ============================================

export function useReminders(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.reminders.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function useUpcomingReminders(weddingId: string | undefined, limit = 10) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.reminders
            .where("weddingId")
            .equals(weddingId)
            .filter((r) => !r.isTriggered && new Date(r.scheduledFor) > new Date())
            .sortBy("scheduledFor")
            .then((reminders) => reminders.slice(0, limit))
        : [],
    [weddingId, limit]
  );
}

// ============================================
// PAYMENT PLANS HOOKS
// ============================================

export function usePaymentPlans(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.paymentPlans.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

export function useActivePaymentPlans(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.paymentPlans
            .where("weddingId")
            .equals(weddingId)
            .filter((p) => p.status === "active")
            .toArray()
        : [],
    [weddingId]
  );
}

export function useUpcomingPayments(weddingId: string | undefined, days = 30) {
  return useLiveQuery(
    async () => {
      if (!weddingId) return [];
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);
      
      const expenses = await db.expenses
        .where("weddingId")
        .equals(weddingId)
        .filter((e) => e.paymentStatus !== "paid")
        .toArray();
      
      const upcomingPayments: {
        expenseId: string;
        description: string;
        installment: {
          id: string;
          description: string;
          amount: number;
          dueDate: Date;
          status: string;
        };
      }[] = [];
      
      expenses.forEach((expense) => {
        expense.paymentSchedule?.forEach((inst) => {
          if (
            inst.status !== "paid" &&
            new Date(inst.dueDate) <= cutoffDate
          ) {
            upcomingPayments.push({
              expenseId: expense.id,
              description: expense.description,
              installment: {
                id: inst.id,
                description: inst.description,
                amount: inst.amount,
                dueDate: inst.dueDate,
                status: inst.status,
              },
            });
          }
        });
      });
      
      return upcomingPayments.sort(
        (a, b) =>
          new Date(a.installment.dueDate).getTime() -
          new Date(b.installment.dueDate).getTime()
      );
    },
    [weddingId, days]
  );
}

// ============================================
// SETTINGS HOOKS
// ============================================

export function useAppSettings() {
  return useLiveQuery(() => db.appSettings.get("default"));
}

// ============================================
// LOCATION HOOKS
// ============================================

export function useLocationPings(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.locationPings
            .where("weddingId")
            .equals(weddingId)
            .filter((p) => p.isActive)
            .toArray()
        : [],
    [weddingId]
  );
}

export function useLocationRequests(
  weddingId: string | undefined,
  targetId: string
) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.locationRequests
            .where("weddingId")
            .equals(weddingId)
            .filter((r) => r.targetId === targetId && r.status === "pending")
            .toArray()
        : [],
    [weddingId, targetId]
  );
}

export function useVenues(weddingId: string | undefined) {
  return useLiveQuery(
    () =>
      weddingId
        ? db.venues.where("weddingId").equals(weddingId).toArray()
        : [],
    [weddingId]
  );
}

