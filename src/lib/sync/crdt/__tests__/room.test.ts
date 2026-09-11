import {
  deriveRoomId, slotPeerId, encodeInvite, decodeInvite,
  getOrCreateRoomSecret, storeRoomSecret,
} from "../room";

beforeEach(() => localStorage.clear());

describe("room derivation", () => {
  it("needs both the wedding id and the secret", async () => {
    const a = await deriveRoomId("w1", "secret-one");
    const b = await deriveRoomId("w1", "secret-two");
    const c = await deriveRoomId("w2", "secret-one");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("is stable for the same inputs, so devices agree on the room", async () => {
    expect(await deriveRoomId("w1", "s")).toBe(await deriveRoomId("w1", "s"));
  });

  it("does not leak the wedding id, which travels inside exported backups", async () => {
    const roomId = await deriveRoomId("fe541cc5-5180-48ac-a323-c7d24f4fc681", "s3cret");
    expect(roomId).not.toContain("fe541cc5");
    expect(roomId).toMatch(/^[0-9a-f]{24}$/);
  });

  it("produces peer ids the broker will accept", async () => {
    const roomId = await deriveRoomId("w1", "s");
    expect(slotPeerId(roomId, 0)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("room secret", () => {
  it("generates once and reuses it", () => {
    const first = getOrCreateRoomSecret("w1");
    expect(getOrCreateRoomSecret("w1")).toBe(first);
  });

  it("keeps separate secrets per wedding", () => {
    expect(getOrCreateRoomSecret("w1")).not.toBe(getOrCreateRoomSecret("w2"));
  });

  it("adopts a secret received from another device", () => {
    storeRoomSecret("w1", "adopted-secret");
    expect(getOrCreateRoomSecret("w1")).toBe("adopted-secret");
  });
});

describe("invite encoding", () => {
  it("round-trips", () => {
    const invite = { weddingId: "fe541cc5-5180-48ac-a323-c7d24f4fc681", secret: "abc123" };
    expect(decodeInvite(encodeInvite(invite))).toEqual(invite);
  });

  it("is URL and QR safe", () => {
    const code = encodeInvite({ weddingId: "w1", secret: "s+/=" });
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("tolerates surrounding whitespace from a paste", () => {
    const code = encodeInvite({ weddingId: "w1", secret: "s" });
    expect(decodeInvite(`  ${code}\n`)).toEqual({ weddingId: "w1", secret: "s" });
  });

  it("returns null for junk rather than throwing", () => {
    expect(decodeInvite("not-an-invite!!")).toBeNull();
    expect(decodeInvite("")).toBeNull();
  });
});
