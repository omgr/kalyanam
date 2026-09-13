import { db } from "@/lib/db/schema";
import {
  log, logInfo, logError, redact, deviceLabel, logFilename,
  availableDays, entriesFor, clearLogs, buildLogFile, prune, today,
} from "../logger";

beforeEach(async () => { await db.logs.clear(); });
afterAll(() => db.close());

describe("redact", () => {
  it("removes anything that could carry wedding content", () => {
    expect(
      redact({ name: "Ravi Kumar", phone: "9876543210", email: "a@b.com", guestName: "X", count: 3 })
    ).toEqual({
      name: "[redacted]", phone: "[redacted]", email: "[redacted]",
      guestName: "[redacted]", count: 3,
    });
  });

  it("redacts invite secrets and message content", () => {
    const safe = redact({ inviteCode: "abc", secret: "xyz", messageBody: "hi", venue: "Sai Gardens" })!;
    expect(Object.values(safe).every((v) => v === "[redacted]")).toBe(true);
  });

  it("keeps counts, codes and flags, which is what debugging needs", () => {
    expect(redact({ slot: 2, online: true, type: "network", room: "a3f9c2" })).toEqual({
      slot: 2, online: true, type: "network", room: "a3f9c2",
    });
  });

  it("truncates a long string that slipped through under a safe key", () => {
    const long = "x".repeat(500);
    expect((redact({ note: long })!.note as string).length).toBeLessThan(130);
  });

  it("summarises objects and arrays rather than serialising them", () => {
    expect(redact({ items: [1, 2, 3], nested: { a: 1 } })).toEqual({
      items: "[3 items]", nested: "[object]",
    });
  });

  it("handles nothing at all", () => {
    expect(redact(undefined)).toBeUndefined();
  });
});

describe("log", () => {
  it("stores an entry under today's date", async () => {
    await logInfo("sync", "peer connected", { slot: 1 });
    const entries = await entriesFor(today());
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ level: "info", area: "sync", message: "peer connected" });
    expect(entries[0].detail).toEqual({ slot: 1 });
  });

  it("redacts on the way in, so the stored log is already safe", async () => {
    await logInfo("guests", "added", { name: "Ravi Kumar", count: 3 });
    const [entry] = await entriesFor(today());
    expect(entry.detail).toEqual({ name: "[redacted]", count: 3 });
  });

  it("records the level", async () => {
    await logError("sync", "broker did not respond");
    const [entry] = await entriesFor(today());
    expect(entry.level).toBe("error");
  });

  it("never throws, even on rubbish input", async () => {
    await expect(log("info", "x", "y", { fn: () => {} } as never)).resolves.toBeUndefined();
  });
});

describe("prune", () => {
  it("drops days beyond the retention window", async () => {
    const old = new Date(); old.setDate(old.getDate() - 30);
    const oldDay = old.toISOString().slice(0, 10);
    await db.logs.add({ id: "x", day: oldDay, at: old, level: "info", area: "t", message: "old" });
    await logInfo("t", "new");

    await prune();

    const days = await availableDays();
    expect(days).toContain(today());
    expect(days).not.toContain(oldDay);
  });
});

describe("deviceLabel", () => {
  it("picks the model out of an Android user agent", () => {
    expect(
      deviceLabel("Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A) AppleWebKit/537.36")
    ).toBe("SM-S911B");
  });

  it("handles an Android UA with no Build token", () => {
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 13; V2145) AppleWebKit/537.36")).toBe("V2145");
  });

  it("recognises the common platforms", () => {
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("iPhone");
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X)")).toBe("Mac");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0)")).toBe("Windows PC");
  });

  it("falls back rather than throwing", () => {
    expect(deviceLabel("something else entirely")).toBe("Unknown device");
  });
});

describe("logFilename", () => {
  it("is findable in a downloads folder", () => {
    expect(logFilename("2026-09-13", "SM-S911B")).toBe("kalyanam-log-SM-S911B-2026-09-13.txt");
  });

  it("makes an awkward device name filesystem-safe", () => {
    expect(logFilename("2026-09-13", "iQOO Neo 7 (5G)")).toBe("kalyanam-log-iQOO-Neo-7-5G-2026-09-13.txt");
  });
});

describe("buildLogFile", () => {
  it("writes a header describing the device and the entries below it", async () => {
    await logInfo("sync", "claimed a slot with the broker", { slot: 0 });
    await logError("sync", "broker did not respond", { timeoutMs: 25000 });

    const { filename, text } = await buildLogFile(today());

    expect(filename).toMatch(/^kalyanam-log-.*-\d{4}-\d{2}-\d{2}\.txt$/);
    expect(text).toContain("Kalyanam diagnostic log");
    expect(text).toContain("Device       :");
    expect(text).toContain("claimed a slot with the broker");
    expect(text).toContain("ERROR");
    expect(text).toContain('{"timeoutMs":25000}');
  });

  it("says so plainly when a day has nothing in it", async () => {
    const { text } = await buildLogFile("2020-01-01");
    expect(text).toContain("(no entries)");
  });

  it("promises in the file itself that it carries no wedding content", async () => {
    await logInfo("t", "x");
    const { text } = await buildLogFile(today());
    expect(text).toContain("no guest names, phone numbers or message content");
  });
});

describe("clearLogs", () => {
  it("empties everything", async () => {
    await logInfo("t", "x");
    await clearLogs();
    expect(await availableDays()).toEqual([]);
  });
});
