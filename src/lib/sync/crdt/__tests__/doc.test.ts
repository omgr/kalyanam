/**
 * Convergence tests for the replicated document, with no transport involved.
 *
 * These encode the property the whole sync design rests on: two devices that
 * edited independently, offline, end up identical once they exchange updates -
 * in either order, however many times.
 */

import * as Y from "yjs";
import { createWeddingDoc, writeRecord, deleteRecord, readRecord, readCollection } from "../doc";

/** Exchange updates both ways until both documents agree. */
function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
}

function makeDoc() {
  return createWeddingDoc("w1", { persist: false });
}

describe("replicated document", () => {
  it("stores and reads a record", () => {
    const { doc } = makeDoc();
    writeRecord(doc, "events", "e1", { name: "Muhurtham", venue: "Sai Gardens" });
    expect(readRecord(doc, "events", "e1")).toEqual({
      name: "Muhurtham",
      venue: "Sai Gardens",
    });
  });

  it("treats undefined as removing the field", () => {
    const { doc } = makeDoc();
    writeRecord(doc, "events", "e1", { name: "Muhurtham", venue: "Sai Gardens" });
    writeRecord(doc, "events", "e1", { venue: undefined });
    expect(readRecord(doc, "events", "e1")).toEqual({ name: "Muhurtham" });
  });

  it("does not emit an update when nothing actually changed", () => {
    const { doc } = makeDoc();
    writeRecord(doc, "events", "e1", { name: "Muhurtham" });

    let updates = 0;
    doc.on("update", () => updates++);
    writeRecord(doc, "events", "e1", { name: "Muhurtham" });

    expect(updates).toBe(0);
  });
});

describe("convergence", () => {
  it("merges concurrent edits to DIFFERENT fields of the same record", () => {
    const a = makeDoc().doc;
    const b = makeDoc().doc;
    writeRecord(a, "events", "e1", { name: "Muhurtham", time: "09:00", venue: "Hall A" });
    sync(a, b);

    // Both devices go offline and edit different things.
    writeRecord(a, "events", "e1", { time: "10:30" });
    writeRecord(b, "events", "e1", { venue: "Sai Gardens" });

    sync(a, b);

    // This is the case a last-write-wins merge would have destroyed.
    const expected = { name: "Muhurtham", time: "10:30", venue: "Sai Gardens" };
    expect(readRecord(a, "events", "e1")).toEqual(expected);
    expect(readRecord(b, "events", "e1")).toEqual(expected);
  });

  it("converges on the SAME field without either side erroring", () => {
    const a = makeDoc().doc;
    const b = makeDoc().doc;
    writeRecord(a, "events", "e1", { venue: "Hall A" });
    sync(a, b);

    writeRecord(a, "events", "e1", { venue: "Sai Gardens" });
    writeRecord(b, "events", "e1", { venue: "Kalyana Mandapam" });
    sync(a, b);

    // One value wins, deterministically, and both devices agree which.
    expect(readRecord(a, "events", "e1")).toEqual(readRecord(b, "events", "e1"));
    expect(["Sai Gardens", "Kalyana Mandapam"]).toContain(
      (readRecord(a, "events", "e1") as { venue: string }).venue
    );
  });

  it("merges records added independently on both devices", () => {
    const a = makeDoc().doc;
    const b = makeDoc().doc;

    writeRecord(a, "tasks", "t1", { title: "Book priest" });
    writeRecord(b, "tasks", "t2", { title: "Confirm caterer" });
    sync(a, b);

    expect(readCollection(a, "tasks")).toHaveLength(2);
    expect(readCollection(b, "tasks")).toHaveLength(2);
  });

  it("propagates deletions without manual tombstones", () => {
    const a = makeDoc().doc;
    const b = makeDoc().doc;
    writeRecord(a, "tasks", "t1", { title: "Book priest" });
    sync(a, b);

    deleteRecord(a, "tasks", "t1");
    sync(a, b);

    expect(readRecord(b, "tasks", "t1")).toBeUndefined();
  });

  it("converges regardless of the order updates arrive in", () => {
    const a = makeDoc().doc;
    const b = makeDoc().doc;
    const c = makeDoc().doc;

    writeRecord(a, "guests", "g1", { name: "Ravi" });
    writeRecord(b, "guests", "g2", { name: "Lakshmi" });
    writeRecord(c, "guests", "g3", { name: "Anand" });

    // Deliberately awkward order, with repeats.
    sync(a, b);
    sync(c, a);
    sync(b, c);
    sync(a, b);
    sync(a, c);

    const asJson = (d: Y.Doc) =>
      JSON.stringify(readCollection(d, "guests").sort((x, y) => String(x.name).localeCompare(String(y.name))));

    expect(asJson(a)).toBe(asJson(b));
    expect(asJson(b)).toBe(asJson(c));
    expect(readCollection(a, "guests")).toHaveLength(3);
  });

  it("is idempotent - applying the same update twice changes nothing", () => {
    const a = makeDoc().doc;
    const b = makeDoc().doc;
    writeRecord(a, "tasks", "t1", { title: "Book priest" });

    const update = Y.encodeStateAsUpdate(a);
    Y.applyUpdate(b, update);
    Y.applyUpdate(b, update);
    Y.applyUpdate(b, update);

    expect(readCollection(b, "tasks")).toHaveLength(1);
  });

  it("merges an update that arrives long after it was produced", () => {
    const a = makeDoc().doc;
    const b = makeDoc().doc;
    writeRecord(a, "tasks", "t1", { title: "Book priest" });
    const stale = Y.encodeStateAsUpdate(a);

    // b races ahead meanwhile.
    writeRecord(b, "tasks", "t2", { title: "Confirm caterer" });
    writeRecord(b, "tasks", "t3", { title: "Order flowers" });

    Y.applyUpdate(b, stale);

    expect(readCollection(b, "tasks")).toHaveLength(3);
  });
});
