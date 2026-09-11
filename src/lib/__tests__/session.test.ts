/**
 * The silent-write bug came from a user id that only the onboarding flow ever
 * wrote. These cover the recovery paths that make any entry point - file
 * import, sync code, settings restore - produce a usable session.
 */

import { db } from "@/lib/db/schema";
import {
  resolveUserId,
  activateWedding,
  clearSession,
  getStoredUserId,
  USER_ID_KEY,
  WEDDING_ID_KEY,
} from "../session";

const WEDDING_ID = "wedding-1";

async function seedWedding(createdBy = "creator-user") {
  await db.weddings.put({
    id: WEDDING_ID,
    name: "Test Wedding",
    brideName: "A",
    groomName: "B",
    weddingDate: new Date("2026-12-13"),
    cultureId: "telugu-brahmin",
    status: "planning",
    budget: 0,
    currency: "INR",
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
}

async function addMember(id: string, userId: string | undefined, role: "primary" | "helper") {
  await db.familyMembers.put({
    id,
    weddingId: WEDDING_ID,
    userId,
    name: id,
    relation: "Sibling",
    side: "bride",
    role,
    canEdit: true,
    canViewBudget: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never);
}

beforeEach(async () => {
  localStorage.clear();
  await Promise.all([db.weddings.clear(), db.familyMembers.clear()]);
});

afterAll(() => db.close());

describe("resolveUserId", () => {
  it("keeps an id that is already stored", async () => {
    localStorage.setItem(USER_ID_KEY, "existing-id");
    await expect(resolveUserId(WEDDING_ID)).resolves.toBe("existing-id");
  });

  it("adopts the primary family member's id, so a restore keeps the same identity", async () => {
    await seedWedding();
    await addMember("m-helper", "helper-user", "helper");
    await addMember("m-primary", "primary-user", "primary");

    await expect(resolveUserId(WEDDING_ID)).resolves.toBe("primary-user");
    expect(getStoredUserId()).toBe("primary-user");
  });

  it("falls back to any member with a user id when there is no primary", async () => {
    await seedWedding();
    await addMember("m-helper", "helper-user", "helper");

    await expect(resolveUserId(WEDDING_ID)).resolves.toBe("helper-user");
  });

  it("falls back to the wedding creator when no member carries a user id", async () => {
    await seedWedding("creator-user");
    await addMember("m-1", undefined, "primary");

    await expect(resolveUserId(WEDDING_ID)).resolves.toBe("creator-user");
  });

  it("mints and persists an id when nothing can be derived", async () => {
    const id = await resolveUserId(undefined);

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(getStoredUserId()).toBe(id);
  });

  it("is stable across repeated calls", async () => {
    await seedWedding();
    const first = await resolveUserId(WEDDING_ID);
    const second = await resolveUserId(WEDDING_ID);
    expect(second).toBe(first);
  });
});

describe("activateWedding", () => {
  it("sets the active wedding and guarantees a user id", async () => {
    await seedWedding();
    await addMember("m-primary", "primary-user", "primary");

    const userId = await activateWedding(WEDDING_ID);

    expect(localStorage.getItem(WEDDING_ID_KEY)).toBe(WEDDING_ID);
    expect(userId).toBe("primary-user");
    expect(getStoredUserId()).toBe("primary-user");
  });

  it("still yields a usable id for a wedding with no family members at all", async () => {
    await seedWedding("creator-user");
    await expect(activateWedding(WEDDING_ID)).resolves.toBe("creator-user");
  });
});

describe("clearSession", () => {
  it("removes both keys", async () => {
    await seedWedding();
    await activateWedding(WEDDING_ID);

    clearSession();

    expect(localStorage.getItem(WEDDING_ID_KEY)).toBeNull();
    expect(localStorage.getItem(USER_ID_KEY)).toBeNull();
  });
});
