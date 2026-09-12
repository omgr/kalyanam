import {
  chunk, broadcastNumbers, broadcastBatches, emailAddresses,
  bccMailtoLinks, numbersForPasting,
  BROADCAST_LIST_LIMIT, MAILTO_RECIPIENT_LIMIT,
} from "../bulk-send";
import type { Guest } from "@/lib/db/schema";

const guest = (over: Partial<Guest> = {}): Guest =>
  ({
    id: over.id ?? Math.random().toString(36), weddingId: "w1", name: "Guest",
    side: "mutual", invitedTo: [], rsvpStatus: "pending", plusOnes: 0,
    giftThanked: false, accommodationRequired: false, transportRequired: false,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  }) as Guest;

describe("chunk", () => {
  it("splits into batches of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns nothing for an empty list", () => {
    expect(chunk([], 10)).toEqual([]);
  });
});

describe("broadcastNumbers", () => {
  it("normalises to a dialable international form", () => {
    expect(broadcastNumbers([guest({ phone: "9876543210" })])).toEqual(["+919876543210"]);
  });

  it("collapses the same number written differently", () => {
    const numbers = broadcastNumbers([
      guest({ phone: "+91 98765 43210" }),
      guest({ phone: "09876543210" }),
      guest({ phone: "9876543210" }),
    ]);
    expect(numbers).toEqual(["+919876543210"]);
  });

  it("ignores guests with no usable number", () => {
    expect(broadcastNumbers([guest({ phone: undefined }), guest({ phone: "123" })])).toEqual([]);
  });
});

describe("broadcastBatches", () => {
  it("splits at WhatsApp's own 256 limit", () => {
    const many = Array.from({ length: 600 }, (_, i) =>
      guest({ id: `g${i}`, phone: `98765${String(i).padStart(5, "0")}` })
    );
    const batches = broadcastBatches(many);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(BROADCAST_LIST_LIMIT);
    expect(batches[2]).toHaveLength(600 - 2 * BROADCAST_LIST_LIMIT);
  });

  it("produces one batch for a small list", () => {
    expect(broadcastBatches([guest({ phone: "9876543210" })])).toHaveLength(1);
  });
});

describe("emailAddresses", () => {
  it("collects distinct addresses and ignores rubbish", () => {
    expect(
      emailAddresses([
        guest({ email: "a@x.com" }),
        guest({ email: "a@x.com" }),
        guest({ email: "not-an-email" }),
        guest({ email: undefined }),
      ])
    ).toEqual(["a@x.com"]);
  });
});

describe("bccMailtoLinks", () => {
  it("puts everyone in BCC so no guest sees another's address", () => {
    const [link] = bccMailtoLinks([guest({ email: "a@x.com" }), guest({ email: "b@x.com" })], "Invite", "Hello");
    expect(link).toContain("mailto:?bcc=");
    expect(decodeURIComponent(link)).toContain("a@x.com,b@x.com");
    expect(link).not.toContain("mailto:a@x.com"); // never in the To field
  });

  it("splits very long lists so clients do not truncate the link", () => {
    const many = Array.from({ length: 200 }, (_, i) => guest({ id: `g${i}`, email: `p${i}@x.com` }));
    const links = bccMailtoLinks(many, "s", "b");
    expect(links.length).toBe(Math.ceil(200 / MAILTO_RECIPIENT_LIMIT));
  });

  it("returns nothing when nobody has an email", () => {
    expect(bccMailtoLinks([guest()], "s", "b")).toEqual([]);
  });

  it("encodes the subject and body", () => {
    const [link] = bccMailtoLinks([guest({ email: "a@x.com" })], "Hari & Aditya", "Line one\nLine two");
    expect(link).toContain(encodeURIComponent("Hari & Aditya"));
    expect(link).toContain(encodeURIComponent("Line one\nLine two"));
  });
});

describe("numbersForPasting", () => {
  it("puts one number per line, ready to paste", () => {
    expect(numbersForPasting(["+919876543210", "+919876500000"]))
      .toBe("+919876543210\n+919876500000");
  });
});
