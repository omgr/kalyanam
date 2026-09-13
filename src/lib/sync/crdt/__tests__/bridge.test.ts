/**
 * The bridge is what lets 12,000 lines of existing UI stay unaware that sync
 * exists: it mirrors Dexie writes into the replicated document and applies
 * remote document changes back into Dexie.
 *
 * The failure mode worth guarding is the echo - a remote change written to
 * Dexie whose hooks mirror it straight back out again, forever.
 */

import * as Y from "yjs";
import { db } from "@/lib/db/schema";
import { createWeddingDoc, readRecord, readCollection, writeRecord } from "../doc";
import { startBridge, runLocalOnly } from "../bridge";

const WEDDING_ID = "w1";
const tick = () => new Promise((r) => setTimeout(r, 20));

async function wipe() {
  await Promise.all([
    db.weddings.clear(), db.events.clear(), db.tasks.clear(),
    db.guests.clear(), db.familyMembers.clear(),
  ]);
}

async function seedWedding() {
  await db.weddings.put({
    id: WEDDING_ID, name: "Ongole-Pemmaraju Kalyanam",
    brideName: "Hari", groomName: "Aditya",
    weddingDate: new Date("2026-12-13T00:00:00.000Z"),
    cultureId: "telugu-brahmin", status: "planning",
    budget: 1900000, currency: "INR", createdBy: "u1",
    createdAt: new Date(), updatedAt: new Date(),
  } as never);
}

let handle: ReturnType<typeof startBridge> | null = null;
let doc: Y.Doc;

beforeEach(async () => {
  await wipe();
  const created = createWeddingDoc(WEDDING_ID, { persist: false });
  doc = created.doc;
});

afterEach(() => {
  handle?.stop();
  handle = null;
});

afterAll(() => db.close());

describe("Dexie -> document", () => {
  it("mirrors a newly created record", async () => {
    handle = startBridge(doc, WEDDING_ID);

    await db.tasks.add({
      id: "t1", weddingId: WEDDING_ID, title: "Book priest",
      priority: "high", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);
    await tick();

    expect(readRecord(doc, "tasks", "t1")).toMatchObject({ title: "Book priest" });
  });

  it("mirrors an update", async () => {
    handle = startBridge(doc, WEDDING_ID);
    await db.tasks.add({
      id: "t1", weddingId: WEDDING_ID, title: "Book priest",
      priority: "high", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);
    await tick();

    await db.tasks.update("t1", { status: "completed" });
    await tick();

    expect(readRecord(doc, "tasks", "t1")).toMatchObject({ status: "completed" });
  });

  it("mirrors a delete", async () => {
    handle = startBridge(doc, WEDDING_ID);
    await db.tasks.add({
      id: "t1", weddingId: WEDDING_ID, title: "Book priest",
      priority: "high", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);
    await tick();

    await db.tasks.delete("t1");
    await tick();

    expect(readRecord(doc, "tasks", "t1")).toBeUndefined();
  });

  it("ignores rows belonging to a different wedding", async () => {
    handle = startBridge(doc, WEDDING_ID);
    await db.tasks.add({
      id: "other", weddingId: "some-other-wedding", title: "Not ours",
      priority: "low", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);
    await tick();

    expect(readCollection(doc, "tasks")).toHaveLength(0);
  });

  it("encodes Dates as ISO strings for transport", async () => {
    handle = startBridge(doc, WEDDING_ID);
    await db.events.add({
      id: "e1", weddingId: WEDDING_ID, name: "Muhurtham",
      date: new Date("2026-12-13T00:00:00.000Z"),
      status: "scheduled", category: "wedding-day", order: 1,
      createdAt: new Date(), updatedAt: new Date(),
    } as never);
    await tick();

    expect(readRecord(doc, "events", "e1")!.date).toBe("2026-12-13T00:00:00.000Z");
  });
});

describe("document -> Dexie", () => {
  it("applies a remote record and revives its dates", async () => {
    handle = startBridge(doc, WEDDING_ID);

    // Simulate an update arriving from another device: a transaction whose
    // origin is not our own bridge.
    doc.transact(() => {
      writeRecord(doc, "events", "e9", {
        name: "Kashi Yatra",
        date: "2026-12-12T00:00:00.000Z",
        status: "scheduled",
        category: "wedding-day",
        order: 4,
      });
    }, "remote-device");
    await tick();

    const stored = await db.events.get("e9");
    expect(stored).toBeDefined();
    expect(stored!.name).toBe("Kashi Yatra");
    expect(Object.prototype.toString.call(stored!.date)).toBe("[object Date]");
    expect(stored!.weddingId).toBe(WEDDING_ID);
  });

  it("applies a remote delete", async () => {
    handle = startBridge(doc, WEDDING_ID);
    doc.transact(() => {
      writeRecord(doc, "tasks", "t9", { title: "Remote task", status: "pending" });
    }, "remote-device");
    await tick();
    expect(await db.tasks.get("t9")).toBeDefined();

    doc.transact(() => doc.getMap("tasks").delete("t9"), "remote-device");
    await tick();

    expect(await db.tasks.get("t9")).toBeUndefined();
  });

  it("does not echo a remote change back into the document", async () => {
    handle = startBridge(doc, WEDDING_ID);

    let localUpdates = 0;
    doc.on("update", (_u: Uint8Array, origin: unknown) => {
      // Count only updates our own bridge produced.
      if (typeof origin === "symbol") localUpdates++;
    });

    doc.transact(() => {
      writeRecord(doc, "tasks", "t9", { title: "Remote task", status: "pending" });
    }, "remote-device");
    await tick();
    await tick();

    expect(await db.tasks.get("t9")).toBeDefined();
    expect(localUpdates).toBe(0); // the echo would have made this non-zero
  });
});

describe("bulk directions", () => {
  it("seeds the document from an existing Dexie database", async () => {
    await seedWedding();
    await db.events.bulkAdd([
      { id: "e1", weddingId: WEDDING_ID, name: "Nischitartham", date: new Date("2026-11-13"),
        status: "scheduled", category: "pre-wedding", order: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: "e2", weddingId: WEDDING_ID, name: "Muhurtham", date: new Date("2026-12-13"),
        status: "scheduled", category: "wedding-day", order: 2, createdAt: new Date(), updatedAt: new Date() },
    ] as never);

    handle = startBridge(doc, WEDDING_ID);
    await handle.seedFromDexie();

    expect(readCollection(doc, "events")).toHaveLength(2);
    expect(readRecord(doc, "wedding", WEDDING_ID)).toMatchObject({
      name: "Ongole-Pemmaraju Kalyanam",
    });
  });

  it("applies a whole document into an empty Dexie, as a new device would", async () => {
    handle = startBridge(doc, WEDDING_ID);
    doc.transact(() => {
      writeRecord(doc, "wedding", WEDDING_ID, {
        id: WEDDING_ID, name: "Ongole-Pemmaraju Kalyanam",
        brideName: "Hari", groomName: "Aditya",
        weddingDate: "2026-12-13T00:00:00.000Z",
        cultureId: "telugu-brahmin", status: "planning",
        budget: 1900000, currency: "INR", createdBy: "u1",
        createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z",
      });
      writeRecord(doc, "events", "e1", {
        name: "Muhurtham", date: "2026-12-13T00:00:00.000Z",
        status: "scheduled", category: "wedding-day", order: 1,
      });
    }, "remote-device");

    await handle.applyToDexie();

    const wedding = await db.weddings.get(WEDDING_ID);
    expect(wedding!.name).toBe("Ongole-Pemmaraju Kalyanam");
    expect(Object.prototype.toString.call(wedding!.weddingDate)).toBe("[object Date]");
    expect(await db.events.count()).toBe(1);
  });

  it("carries a wedding to a second device, dates and nested arrays intact", async () => {
    // Device A: real data in Dexie, mirrored into its document.
    await seedWedding();
    await db.events.add({
      id: "e1", weddingId: WEDDING_ID, name: "Muhurtham",
      date: new Date("2026-12-13T00:00:00.000Z"),
      status: "scheduled", category: "wedding-day", order: 1,
      checklist: [{ id: "c1", text: "Book priest", isCompleted: false }],
      createdAt: new Date(), updatedAt: new Date(),
    } as never);

    handle = startBridge(doc, WEDDING_ID);
    await handle.seedFromDexie();
    handle.stop();
    handle = null;

    // Device B: a fresh document that has only received A's update, and an
    // empty database standing in for a phone that has never seen this wedding.
    const deviceB = createWeddingDoc(WEDDING_ID, { persist: false }).doc;
    Y.applyUpdate(deviceB, Y.encodeStateAsUpdate(doc));
    await wipe();

    const bridgeB = startBridge(deviceB, WEDDING_ID);
    await bridgeB.applyToDexie();
    bridgeB.stop();

    const wedding = await db.weddings.get(WEDDING_ID);
    expect(wedding!.name).toBe("Ongole-Pemmaraju Kalyanam");
    expect(Object.prototype.toString.call(wedding!.weddingDate)).toBe("[object Date]");

    const restored = await db.events.get("e1");
    expect(restored!.name).toBe("Muhurtham");
    expect(Object.prototype.toString.call(restored!.date)).toBe("[object Date]");
    expect(restored!.checklist![0].text).toBe("Book priest");
  });

  it("propagates a local delete into the document", async () => {
    await seedWedding();
    await db.tasks.add({
      id: "t1", weddingId: WEDDING_ID, title: "Book priest",
      priority: "high", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);

    handle = startBridge(doc, WEDDING_ID);
    await handle.seedFromDexie();
    expect(readCollection(doc, "tasks")).toHaveLength(1);

    await db.tasks.delete("t1");
    await tick();

    expect(readCollection(doc, "tasks")).toHaveLength(0);
  });
});

describe("local-only writes", () => {
  it("does NOT replicate a delete made inside runLocalOnly", async () => {
    await seedWedding();
    await db.tasks.add({
      id: "t1", weddingId: WEDDING_ID, title: "Book priest",
      priority: "high", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);

    handle = startBridge(doc, WEDDING_ID);
    await handle.seedFromDexie();
    expect(readCollection(doc, "tasks")).toHaveLength(1);

    // "Remove this wedding from THIS device" - the family keeps theirs.
    await runLocalOnly(async () => {
      await db.tasks.delete("t1");
      await db.weddings.delete(WEDDING_ID);
    });
    await tick();

    expect(await db.tasks.get("t1")).toBeUndefined();        // gone here
    expect(readCollection(doc, "tasks")).toHaveLength(1);     // still theirs
    expect(readRecord(doc, "wedding", WEDDING_ID)).toBeDefined();
  });

  it("still replicates an ordinary delete", async () => {
    await seedWedding();
    await db.tasks.add({
      id: "t2", weddingId: WEDDING_ID, title: "Confirm caterer",
      priority: "low", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);

    handle = startBridge(doc, WEDDING_ID);
    await handle.seedFromDexie();

    await db.tasks.delete("t2");
    await tick();

    expect(readCollection(doc, "tasks")).toHaveLength(0);
  });

  it("does not replicate writes made inside runLocalOnly either", async () => {
    handle = startBridge(doc, WEDDING_ID);

    await runLocalOnly(async () => {
      await db.tasks.add({
        id: "t3", weddingId: WEDDING_ID, title: "Local only",
        priority: "low", status: "pending",
        createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
      } as never);
    });
    await tick();

    expect(await db.tasks.get("t3")).toBeDefined();
    expect(readCollection(doc, "tasks")).toHaveLength(0);
  });

  it("resumes replicating once the local-only block finishes", async () => {
    handle = startBridge(doc, WEDDING_ID);
    await runLocalOnly(async () => { /* nothing */ });

    await db.tasks.add({
      id: "t4", weddingId: WEDDING_ID, title: "After",
      priority: "low", status: "pending",
      createdBy: "u1", createdAt: new Date(), updatedAt: new Date(),
    } as never);
    await tick();

    expect(readCollection(doc, "tasks")).toHaveLength(1);
  });
});

describe("reconcile: work done while sync was switched off", () => {
  it("pushes up a record created with no bridge running", async () => {
    // Exactly what happened on a real phone: venue areas pinned during three
    // hours with sync off, then lost the moment it reconnected because startup
    // applied the document over local data instead of merging.
    await seedWedding();
    handle = startBridge(doc, WEDDING_ID);
    await handle.seedFromDexie();
    handle.stop();
    handle = null;

    // Sync is off. A venue is created and pinned.
    await db.venues.add({
      id: "v1", weddingId: WEDDING_ID, name: "Sai Gardens",
      zones: [{ id: "z1", name: "Lounge", latitude: 17.44, longitude: 78.4 }],
      createdAt: new Date(), updatedAt: new Date(),
    } as never);

    // Sync comes back.
    handle = startBridge(doc, WEDDING_ID);
    const result = await handle.reconcile();

    expect(result.pushed).toBeGreaterThan(0);
    const inDoc = readCollection(doc, "venues");
    expect(inDoc).toHaveLength(1);
    expect((inDoc[0].zones as Array<{ name: string }>)[0].name).toBe("Lounge");
  });

  it("does not overwrite a newer local edit with an older remote one", async () => {
    await seedWedding();
    await db.tasks.add({
      id: "t1", weddingId: WEDDING_ID, title: "Old title",
      priority: "low", status: "pending", createdBy: "u1",
      createdAt: new Date("2026-09-01"), updatedAt: new Date("2026-09-01"),
    } as never);

    handle = startBridge(doc, WEDDING_ID);
    await handle.seedFromDexie();
    handle.stop();
    handle = null;

    // Edited locally with sync off, so the document still holds the old copy.
    await db.tasks.update("t1", { title: "Edited offline", updatedAt: new Date("2026-09-13") });

    handle = startBridge(doc, WEDDING_ID);
    await handle.reconcile();

    expect(readRecord(doc, "tasks", "t1")).toMatchObject({ title: "Edited offline" });
    expect((await db.tasks.get("t1"))!.title).toBe("Edited offline");
  });

  it("pulls down a record this device has never seen", async () => {
    await seedWedding();
    handle = startBridge(doc, WEDDING_ID);

    doc.transact(() => {
      writeRecord(doc, "tasks", "remote-1", {
        title: "From another phone", status: "pending", priority: "low",
        createdBy: "u2", createdAt: "2026-09-13T00:00:00.000Z",
        updatedAt: "2026-09-13T00:00:00.000Z",
      });
    }, "remote-device");

    const result = await handle.reconcile();

    expect(result.pulled).toBeGreaterThan(0);
    expect((await db.tasks.get("remote-1"))!.title).toBe("From another phone");
  });

  it("lets a newer remote edit win over a stale local one", async () => {
    await seedWedding();
    await db.tasks.add({
      id: "t2", weddingId: WEDDING_ID, title: "Stale local",
      priority: "low", status: "pending", createdBy: "u1",
      createdAt: new Date("2026-09-01"), updatedAt: new Date("2026-09-01"),
    } as never);

    handle = startBridge(doc, WEDDING_ID);
    doc.transact(() => {
      writeRecord(doc, "tasks", "t2", {
        title: "Newer from family", status: "pending", priority: "low",
        createdBy: "u2", createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-13T00:00:00.000Z",
      });
    }, "remote-device");

    await handle.reconcile();

    expect((await db.tasks.get("t2"))!.title).toBe("Newer from family");
  });

  it("carries venue areas to a device that joined later", async () => {
    // The reported symptom: one phone had the pinned areas, the other showed
    // "No areas yet" while still seeing the first phone's location.
    await seedWedding();
    await db.venues.add({
      id: "v9", weddingId: WEDDING_ID, name: "Sai Gardens",
      zones: [
        { id: "z1", name: "Lounge", latitude: 17.44, longitude: 78.4 },
        { id: "z2", name: "Kitchen", latitude: 17.4404, longitude: 78.4 },
      ],
      createdAt: new Date(), updatedAt: new Date(),
    } as never);

    handle = startBridge(doc, WEDDING_ID);
    await handle.reconcile();
    handle.stop();
    handle = null;

    // Second device: fresh document carrying the first device's state.
    const deviceB = createWeddingDoc(WEDDING_ID, { persist: false }).doc;
    Y.applyUpdate(deviceB, Y.encodeStateAsUpdate(doc));
    await wipe();

    const bridgeB = startBridge(deviceB, WEDDING_ID);
    await bridgeB.reconcile();
    bridgeB.stop();

    const venue = await db.venues.get("v9");
    expect(venue).toBeDefined();
    expect(venue!.zones).toHaveLength(2);
    expect(venue!.zones!.map((z) => z.name)).toEqual(["Lounge", "Kitchen"]);
  });
});
