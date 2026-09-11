import Dexie, { Table } from "dexie";

// ============================================
// TYPE DEFINITIONS
// ============================================

// User & Authentication
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}

// Wedding (Main Entity)
export interface Wedding {
  id: string;
  name: string; // e.g., "Priya & Rahul's Wedding"
  brideName: string;
  groomName: string;
  weddingDate: Date;
  cultureId: string; // Reference to culture template
  customCultureName?: string; // If custom culture
  venue?: string;
  city?: string;
  country?: string;
  description?: string;
  coverImage?: string;
  status: "planning" | "ongoing" | "completed" | "cancelled";
  budget: number;
  currency: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Family Members
export interface FamilyMember {
  id: string;
  weddingId: string;
  userId?: string; // If registered user
  name: string;
  relation: string; // e.g., "Bride's Father", "Groom's Uncle"
  side: "bride" | "groom" | "mutual";
  phone?: string;
  email?: string;
  avatar?: string;
  role: "primary" | "secondary" | "helper";
  responsibilities?: string[];
  canEdit: boolean;
  canViewBudget: boolean;
  isActive: boolean;
  lastLocation?: LocationData;
  locationUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Cultural Templates & Rituals
export interface Culture {
  id: string;
  name: string;
  region?: string;
  religion?: string;
  description?: string;
  isCustom: boolean;
  createdBy?: string;
  rituals: Ritual[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ritual {
  id: string;
  name: string;
  localName?: string; // In native script
  description?: string;
  significance?: string;
  typicalDuration?: number; // In minutes
  typicalDay?: number; // Relative to wedding day (negative = before, 0 = day of, positive = after)
  requiredItems?: string[];
  participants?: string[];
  order: number;
  isOptional: boolean;
  category: "pre-wedding" | "wedding-day" | "post-wedding";
}

// Events (Actual scheduled events)
export interface WeddingEvent {
  id: string;
  weddingId: string;
  ritualId?: string; // If based on a ritual template
  name: string;
  localName?: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  venue?: string;
  address?: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled" | "postponed";
  category: "pre-wedding" | "wedding-day" | "post-wedding" | "other";
  assignedTo?: string[]; // Family member IDs
  budget?: number;
  actualCost?: number;
  notes?: string;
  attachments?: Attachment[];
  checklist?: ChecklistItem[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  assignedTo?: string;
  dueDate?: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // Base64 encoded
  createdAt: Date;
}

// Guests
export interface Guest {
  id: string;
  weddingId: string;
  name: string;
  phone?: string;
  email?: string;
  relation?: string;
  side: "bride" | "groom" | "mutual";
  groupName?: string; // Family group
  invitedTo: string[]; // Event IDs
  rsvpStatus: "pending" | "confirmed" | "declined" | "maybe";
  rsvpDate?: Date;
  plusOnes: number;
  dietaryRestrictions?: string;
  tableNumber?: number;
  giftReceived?: string;
  giftThanked: boolean;
  notes?: string;
  address?: string;
  city?: string;
  accommodationRequired: boolean;
  accommodationProvided?: string;
  transportRequired: boolean;
  transportProvided?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Budget & Expenses
export interface BudgetCategory {
  id: string;
  weddingId: string;
  name: string;
  allocatedAmount: number;
  color?: string;
  icon?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  weddingId: string;
  categoryId: string;
  eventId?: string;
  vendorId?: string;
  description: string;
  amount: number;
  paidBy?: string; // Family member ID
  paidTo?: string; // Vendor name or person
  paymentMethod?: "cash" | "card" | "upi" | "bank_transfer" | "cheque" | "other";
  paymentStatus: "pending" | "partial" | "paid";
  amountPaid: number;
  dueDate?: Date;
  receipt?: Attachment;
  receipts?: Attachment[]; // Multiple receipts
  notes?: string;
  // Payment schedule for installments
  paymentSchedule?: PaymentInstallment[];
  // For reconciliation
  bankReference?: string;
  isReconciled: boolean;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Installments
export interface PaymentInstallment {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  paidAmount: number;
  status: "pending" | "paid" | "overdue" | "partial";
  paymentMethod?: Expense["paymentMethod"];
  reference?: string;
  reminderSent: boolean;
  notes?: string;
}

// Payment Schedule Types
export type PaymentScheduleType = 
  | "one_time" 
  | "stage_based" // Paid after each stage/event completion
  | "milestone_based" // Paid on specific milestones
  | "equal_installments" // Equal amounts at regular intervals
  | "custom";

export interface PaymentPlan {
  id: string;
  weddingId: string;
  expenseId?: string;
  vendorId?: string;
  name: string;
  totalAmount: number;
  scheduleType: PaymentScheduleType;
  installments: PaymentInstallment[];
  // For equal installments
  numberOfInstallments?: number;
  intervalDays?: number;
  startDate?: Date;
  // For stage-based
  linkedEventIds?: string[];
  // Tracking
  totalPaid: number;
  remainingAmount: number;
  nextDueDate?: Date;
  status: "active" | "completed" | "cancelled";
  autoReminder: boolean;
  reminderDaysBefore: number;
  createdAt: Date;
  updatedAt: Date;
}

// Tasks
export interface Task {
  id: string;
  weddingId: string;
  eventId?: string;
  title: string;
  description?: string;
  assignedTo?: string[]; // Family member IDs
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueDate?: Date;
  reminderDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  category?: string;
  subtasks?: SubTask[];
  comments?: TaskComment[];
  attachments?: Attachment[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubTask {
  id: string;
  text: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface TaskComment {
  id: string;
  memberId: string;
  text: string;
  createdAt: Date;
}

// Vendors
export interface Vendor {
  id: string;
  weddingId: string;
  name: string;
  category: string; // e.g., "Catering", "Photography", "Decoration"
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  quotedAmount?: number;
  finalAmount?: number;
  advancePaid?: number;
  paymentStatus: "pending" | "partial" | "paid";
  contractDate?: Date;
  serviceDate?: Date;
  rating?: number;
  notes?: string;
  attachments?: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

// Communication & Messages
export interface Message {
  id: string;
  weddingId: string;
  senderId: string;
  recipientIds?: string[]; // If empty, broadcast to all
  eventId?: string;
  subject?: string;
  content: string;
  type: "message" | "announcement" | "reminder" | "alert";
  priority: "normal" | "important" | "urgent";
  isRead: boolean;
  readBy: string[];
  attachments?: Attachment[];
  createdAt: Date;
}

// Follow-ups
export interface FollowUp {
  id: string;
  weddingId: string;
  relatedTo: "guest" | "vendor" | "task" | "event" | "expense" | "other";
  relatedId?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate: Date;
  reminderDate?: Date;
  status: "pending" | "completed" | "cancelled";
  completedAt?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Location Tracking
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  venue?: string;
  zone?: string; // e.g., "Main Hall", "Garden", "Parking"
  floor?: number;
  building?: string;
  updatedAt: Date;
}

export interface LocationPing {
  id: string;
  weddingId: string;
  memberId: string;
  memberName: string;
  location: LocationData;
  isActive: boolean;
  batteryLevel?: number;
  createdAt: Date;
}

export interface LocationRequest {
  id: string;
  weddingId: string;
  requesterId: string;
  targetId: string;
  message?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

// Venues & Zones (for indoor tracking)
export interface Venue {
  id: string;
  weddingId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  zones?: VenueZone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueZone {
  id: string;
  name: string;
  floor?: number;
  description?: string;
  color?: string;
  /**
   * Where this area actually is, captured by standing in it once.
   *
   * Absolute GPS accuracy indoors is poor, but every reading taken at the same
   * venue carries roughly the same error, so comparing distances *between*
   * areas is far more reliable than the raw accuracy figure suggests. That is
   * what lets the app work out which area someone is in without asking.
   */
  latitude?: number;
  longitude?: number;
  /** Metres. Defaults to DEFAULT_ZONE_RADIUS_M when unset. */
  radius?: number;
}

// Reminders & Notifications
export interface Reminder {
  id: string;
  weddingId: string;
  relatedTo: "event" | "task" | "followup" | "expense" | "custom";
  relatedId?: string;
  title: string;
  message?: string;
  scheduledFor: Date;
  repeatType?: "none" | "daily" | "weekly" | "custom";
  isTriggered: boolean;
  triggeredAt?: Date;
  targetMembers?: string[];
  createdBy: string;
  createdAt: Date;
}

// App Settings
export interface AppSettings {
  id: string;
  theme: "light" | "dark" | "system";
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    reminders: boolean;
    messages: boolean;
    locationRequests: boolean;
  };
  privacy: {
    shareLocation: boolean;
    locationAccuracy: "exact" | "approximate" | "zone_only";
    showOnlineStatus: boolean;
  };
  sync: {
    enabled: boolean;
    lastSyncAt?: Date;
    autoSync: boolean;
    syncOnWifiOnly: boolean;
  };
  updatedAt: Date;
}

// ============================================
// DATABASE CLASS
// ============================================

export class KalyanamDB extends Dexie {
  // Tables
  users!: Table<User>;
  weddings!: Table<Wedding>;
  familyMembers!: Table<FamilyMember>;
  cultures!: Table<Culture>;
  events!: Table<WeddingEvent>;
  guests!: Table<Guest>;
  budgetCategories!: Table<BudgetCategory>;
  expenses!: Table<Expense>;
  tasks!: Table<Task>;
  vendors!: Table<Vendor>;
  messages!: Table<Message>;
  followUps!: Table<FollowUp>;
  locationPings!: Table<LocationPing>;
  locationRequests!: Table<LocationRequest>;
  venues!: Table<Venue>;
  reminders!: Table<Reminder>;
  paymentPlans!: Table<PaymentPlan>;
  appSettings!: Table<AppSettings>;

  constructor() {
    super("KalyanamDB");

    this.version(1).stores({
      users: "id, email, phone, createdAt",
      weddings: "id, name, weddingDate, status, createdBy, createdAt",
      familyMembers: "id, weddingId, userId, name, side, role, createdAt",
      cultures: "id, name, region, religion, isCustom, createdAt",
      events: "id, weddingId, ritualId, name, date, status, category, order, createdAt",
      guests: "id, weddingId, name, side, rsvpStatus, groupName, createdAt",
      budgetCategories: "id, weddingId, name, order, createdAt",
      expenses: "id, weddingId, categoryId, eventId, vendorId, paymentStatus, isReconciled, createdAt",
      tasks: "id, weddingId, eventId, status, priority, assignedTo, dueDate, createdAt",
      vendors: "id, weddingId, name, category, paymentStatus, createdAt",
      messages: "id, weddingId, senderId, type, priority, createdAt",
      followUps: "id, weddingId, relatedTo, relatedId, status, dueDate, createdAt",
      locationPings: "id, weddingId, memberId, createdAt",
      locationRequests: "id, weddingId, requesterId, targetId, status, createdAt",
      venues: "id, weddingId, name, createdAt",
      reminders: "id, weddingId, relatedTo, relatedId, scheduledFor, isTriggered, createdAt",
      paymentPlans: "id, weddingId, expenseId, vendorId, status, nextDueDate, createdAt",
      appSettings: "id",
    });
  }
}

// Database instance
export const db = new KalyanamDB();

// Initialize database with default data
export async function initializeDatabase() {
  try {
    const existingSettings = await db.appSettings.get("default");
    if (!existingSettings) {
      await db.appSettings.put({
        id: "default",
        theme: "system",
        language: "en",
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
        notifications: {
          enabled: true,
          sound: true,
          vibration: true,
          reminders: true,
          messages: true,
          locationRequests: true,
        },
        privacy: {
          shareLocation: true,
          locationAccuracy: "zone_only",
          showOnlineStatus: true,
        },
        sync: {
          enabled: false,
          autoSync: false,
          syncOnWifiOnly: true,
        },
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

