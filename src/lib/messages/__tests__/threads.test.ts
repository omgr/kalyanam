import { buildThreads, threadIdFor, isVisibleTo, EVERYONE } from "../threads";
import type { Message, FamilyMember } from "@/lib/db/schema";

const ME = "m-me", SIS = "m-sis", MUM = "m-mum";

const member = (id: string, name: string): FamilyMember =>
  ({ id, weddingId: "w1", name, relation: "Family", side: "mutual", role: "helper",
     canEdit: true, canViewBudget: false, isActive: true,
     createdAt: new Date(), updatedAt: new Date() }) as FamilyMember;

const MEMBERS = [member(ME, "Madan"), member(SIS, "Harini"), member(MUM, "Amma")];

let clock = 1_000_000;
const msg = (senderId: string, recipientIds: string[] | undefined, content = "hi"): Message =>
  ({ id: `msg-${clock}`, weddingId: "w1", senderId, recipientIds, content,
     type: "message", priority: "normal", isRead: false, readBy: [],
     createdAt: new Date((clock += 1000)) }) as Message;

describe("threadIdFor", () => {
  it("treats a message with no recipients as everyone's", () => {
    expect(threadIdFor(msg(SIS, undefined), ME)).toBe(EVERYONE);
    expect(threadIdFor(msg(SIS, []), ME)).toBe(EVERYONE);
  });

  it("files one I sent under the person I sent it to", () => {
    expect(threadIdFor(msg(ME, [SIS]), ME)).toBe(SIS);
  });

  it("files one I received under the person who sent it", () => {
    expect(threadIdFor(msg(SIS, [ME]), ME)).toBe(SIS);
  });
});

describe("isVisibleTo", () => {
  it("shows broadcasts to everyone", () => {
    expect(isVisibleTo(msg(SIS, undefined), ME)).toBe(true);
  });

  it("hides a private message between two other people", () => {
    // The reason threading matters: without this, asking your sister something
    // privately would be readable by the whole family.
    expect(isVisibleTo(msg(SIS, [MUM]), ME)).toBe(false);
  });

  it("shows a private message I sent or received", () => {
    expect(isVisibleTo(msg(ME, [SIS]), ME)).toBe(true);
    expect(isVisibleTo(msg(SIS, [ME]), ME)).toBe(true);
  });
});

describe("buildThreads", () => {
  it("always offers Everyone first, even with nothing in it", () => {
    const threads = buildThreads([], MEMBERS, ME);
    expect(threads[0].id).toBe(EVERYONE);
    expect(threads[0].messages).toHaveLength(0);
  });

  it("offers a conversation with each family member except me", () => {
    const ids = buildThreads([], MEMBERS, ME).map((t) => t.id);
    expect(ids).toEqual([EVERYONE, SIS, MUM].sort((a, b) => ids.indexOf(a) - ids.indexOf(b)));
    expect(ids).not.toContain(ME);
  });

  it("groups a back-and-forth into one conversation", () => {
    const threads = buildThreads(
      [msg(ME, [SIS], "are you coming?"), msg(SIS, [ME], "yes")],
      MEMBERS, ME
    );
    expect(threads.find((t) => t.id === SIS)!.messages).toHaveLength(2);
  });

  it("keeps a private conversation out of the shared thread", () => {
    const threads = buildThreads([msg(ME, [SIS], "quiet word")], MEMBERS, ME);
    expect(threads.find((t) => t.id === EVERYONE)!.messages).toHaveLength(0);
  });

  it("excludes messages between two other people entirely", () => {
    const threads = buildThreads([msg(SIS, [MUM], "not for Madan")], MEMBERS, ME);
    expect(threads.every((t) => t.messages.length === 0)).toBe(true);
  });

  it("orders messages within a conversation oldest first", () => {
    const a = msg(ME, [SIS], "first");
    const b = msg(SIS, [ME], "second");
    const threads = buildThreads([b, a], MEMBERS, ME);
    expect(threads.find((t) => t.id === SIS)!.messages.map((m) => m.content))
      .toEqual(["first", "second"]);
  });

  it("puts the busiest conversation first, below Everyone", () => {
    const threads = buildThreads([msg(MUM, [ME], "hello")], MEMBERS, ME);
    expect(threads[0].id).toBe(EVERYONE);
    expect(threads[1].id).toBe(MUM);
  });

  it("counts unread from others but never my own", () => {
    const mine = msg(ME, [SIS], "mine");
    const theirs = msg(SIS, [ME], "theirs");
    const threads = buildThreads([mine, theirs], MEMBERS, ME, 0);
    expect(threads.find((t) => t.id === SIS)!.unread).toBe(1);
  });

  it("treats anything before the last-seen time as read", () => {
    const old = msg(SIS, [ME], "old");
    const seenAfter = new Date(old.createdAt).getTime() + 1;
    expect(buildThreads([old], MEMBERS, ME, seenAfter).find((t) => t.id === SIS)!.unread).toBe(0);
  });
});
