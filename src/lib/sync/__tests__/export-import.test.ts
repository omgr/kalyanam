/**
 * These cover the code that stands between a family and the only copy of their
 * wedding data. Each test corresponds to a way the original implementation lost
 * or corrupted data on a real restore.
 */

import { db } from "@/lib/db/schema";
import { exportWeddingData, importWeddingData, EXPORT_VERSION } from "../export-import";

const WEDDING_ID = "wedding-1";

/**
 * jsdom's structuredClone returns Dates from a different realm, so `instanceof
 * Date` is unreliable here. This checks the internal class instead, which is
 * exactly the distinction under test: a real Date rather than an ISO string.
 */
function isDate(value: unknown): boolean {
  return Object.prototype.toString.call(value) === "[object Date]";
}

function makeWedding(overrides: Record<string, unknown> = {}) {
  return {
    id: WEDDING_ID,
    name: "Ongole-Pemmaraju Kalyanam",
    brideName: "Hari",
    groomName: "Aditya",
    weddingDate: new Date("2026-12-13T00:00:00.000Z"),
    cultureId: "telugu-brahmin",
    status: "planning" as const,
    budget: 1900000,
    currency: "INR",
    createdBy: "user-1",
    createdAt: new Date("2026-09-10T19:26:31.210Z"),
    updatedAt: new Date("2026-09-10T19:26:31.210Z"),
    ...overrides,
  };
}

async function seed() {
  await db.weddings.put(makeWedding() as never);
  await db.events.bulkPut([
    {
      id: "event-1",
      weddingId: WEDDING_ID,
      name: "Muhurtham",
      localName: "ముహూర్తం",
      date: new Date("2026-12-13T00:00:00.000Z"),
      status: "scheduled",
      category: "wedding-day",
      order: 10,
      checklist: [
        { id: "c1", text: "Book priest", isCompleted: false, dueDate: new Date("2026-11-01") },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as never);
  await db.paymentPlans.put({
    id: "plan-1",
    weddingId: WEDDING_ID,
    name: "Venue instalments",
    totalAmount: 400000,
    scheduleType: "equal_installments",
    installments: [
      {
        id: "i1",
        description: "First instalment",
        amount: 200000,
        dueDate: new Date("2026-10-01T00:00:00.000Z"),
        paidAmount: 0,
        status: "pending",
        reminderSent: false,
      },
    ],
    totalPaid: 0,
    remainingAmount: 400000,
    status: "active",
    autoReminder: true,
    reminderDaysBefore: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
  await db.cultures.put({
    id: "telugu-brahmin",
    name: "Telugu Brahmin",
    isCustom: false,
    rituals: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
}

async function wipe() {
  await Promise.all(
    [db.weddings, db.events, db.paymentPlans, db.cultures, db.guests, db.tasks, db.expenses,
     db.budgetCategories, db.vendors, db.messages, db.reminders, db.familyMembers,
     db.followUps, db.venues].map((t) => t.clear())
  );
}

beforeEach(async () => {
  await wipe();
  await seed();
});

afterAll(() => db.close());

describe("export", () => {
  it("declares the current version", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    expect(JSON.parse(data).version).toBe(EXPORT_VERSION);
  });

  it("includes payment plans, which used to be dropped on every backup", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    expect(JSON.parse(data).data.paymentPlans).toHaveLength(1);
  });

  it("includes the culture template so a custom culture survives", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    expect(JSON.parse(data).data.cultures[0].id).toBe("telugu-brahmin");
  });

  it("names the file after the wedding and the date", async () => {
    const { filename } = await exportWeddingData(WEDDING_ID);
    expect(filename).toMatch(/^ongole_pemmaraju_kalyanam_\d{4}-\d{2}-\d{2}\.kalyanam\.json$/);
  });
});

describe("import: dates", () => {
  it("revives top-level dates as Date objects, not ISO strings", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    await wipe();

    const result = await importWeddingData(data, { mode: "new" });
    expect(result.success).toBe(true);

    const wedding = await db.weddings.get(WEDDING_ID);
    expect(isDate(wedding!.weddingDate)).toBe(true);
    expect(new Date(wedding!.weddingDate as Date).toISOString()).toBe("2026-12-13T00:00:00.000Z");

    const event = await db.events.get("event-1");
    expect(isDate(event!.date)).toBe(true);
  });

  it("revives dates nested inside checklists and instalment schedules", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    await wipe();
    await importWeddingData(data, { mode: "new" });

    const event = await db.events.get("event-1");
    expect(isDate(event!.checklist![0].dueDate)).toBe(true);

    const plan = await db.paymentPlans.get("plan-1");
    expect(isDate(plan!.installments[0].dueDate)).toBe(true);
  });

  it("leaves non-date strings alone", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    await wipe();
    await importWeddingData(data, { mode: "new" });

    const wedding = await db.weddings.get(WEDDING_ID);
    expect(wedding!.name).toBe("Ongole-Pemmaraju Kalyanam");
    expect(typeof wedding!.currency).toBe("string");
  });
});

describe("import: duplicates", () => {
  it("refuses a wedding already on this device instead of duplicating it", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);

    const result = await importWeddingData(data, { mode: "new" });

    expect(result.success).toBe(false);
    expect(result.alreadyExists).toBe(true);
    expect(result.weddingId).toBe(WEDDING_ID);
    expect(await db.weddings.count()).toBe(1);
    expect(await db.events.count()).toBe(1);
  });

  it("overwrites in place when the caller confirms a replace", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    await db.events.put({ ...(await db.events.get("event-1"))!, name: "Locally edited" });

    const result = await importWeddingData(data, { mode: "new", replaceExisting: true });

    expect(result.success).toBe(true);
    expect(await db.weddings.count()).toBe(1);
    expect(await db.events.count()).toBe(1);
    expect((await db.events.get("event-1"))!.name).toBe("Muhurtham");
  });

  it("keeps record ids stable across a round trip", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    await wipe();
    await importWeddingData(data, { mode: "new" });

    expect(await db.weddings.get(WEDDING_ID)).toBeDefined();
    expect(await db.events.get("event-1")).toBeDefined();
  });
});

describe("import: older backups", () => {
  it("re-seeds the built-in culture for a 1.0.0 file that has none", async () => {
    const { data } = await exportWeddingData(WEDDING_ID);
    const legacy = JSON.parse(data);
    legacy.version = "1.0.0";
    delete legacy.data.cultures;
    delete legacy.data.paymentPlans;

    await wipe();
    const result = await importWeddingData(JSON.stringify(legacy), { mode: "new" });

    expect(result.success).toBe(true);
    expect(await db.cultures.get("telugu-brahmin")).toBeDefined();
  });
});

describe("import: bad input", () => {
  it("reports malformed JSON rather than throwing", async () => {
    const result = await importWeddingData("not json at all", { mode: "new" });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects a file that is missing the wedding", async () => {
    const result = await importWeddingData(
      JSON.stringify({ version: "1.1.0", data: {} }),
      { mode: "new" }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid export file format/);
  });

  it("leaves the database untouched when the payload is invalid", async () => {
    await importWeddingData("{}", { mode: "new" });
    expect(await db.weddings.count()).toBe(1);
    expect(await db.events.count()).toBe(1);
  });
});
