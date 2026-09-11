import {
  toWhatsAppNumber, personalise, whatsAppLink, mailtoLink,
  isReachable, groupForSending, defaultInvitationMessage,
} from "../invitation";
import type { Guest, Wedding } from "@/lib/db/schema";

const guest = (over: Partial<Guest> = {}): Guest =>
  ({
    id: over.id ?? "g1", weddingId: "w1", name: "Ravi Kumar",
    side: "bride", invitedTo: [], rsvpStatus: "pending", plusOnes: 0,
    giftThanked: false, accommodationRequired: false, transportRequired: false,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  }) as Guest;

describe("toWhatsAppNumber", () => {
  it("adds the country code to a bare Indian mobile", () => {
    expect(toWhatsAppNumber("9876543210")).toBe("919876543210");
  });

  it("strips the trunk zero", () => {
    expect(toWhatsAppNumber("09876543210")).toBe("919876543210");
  });

  it("keeps a number that already has a country code", () => {
    expect(toWhatsAppNumber("+91 98765 43210")).toBe("919876543210");
  });

  it("keeps a non-Indian international number as given", () => {
    expect(toWhatsAppNumber("+44 7587 769102")).toBe("447587769102");
  });

  it("rejects something too short to be a number", () => {
    expect(toWhatsAppNumber("12345")).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
  });
});

describe("personalise", () => {
  it("substitutes the guest's name", () => {
    expect(personalise("Dear {name}, please come", guest())).toBe("Dear Ravi Kumar, please come");
  });

  it("replaces every occurrence", () => {
    expect(personalise("{name} {name}", guest())).toBe("Ravi Kumar Ravi Kumar");
  });

  it("leaves a message without a placeholder alone", () => {
    expect(personalise("Please come", guest())).toBe("Please come");
  });
});

describe("whatsAppLink", () => {
  it("builds a wa.me link with the text encoded", () => {
    const link = whatsAppLink(guest({ phone: "9876543210" }), "Dear {name}, please come");
    expect(link).toContain("https://wa.me/919876543210");
    expect(link).toContain(encodeURIComponent("Dear Ravi Kumar, please come"));
  });

  it("returns null when there is no usable number", () => {
    expect(whatsAppLink(guest({ phone: undefined }), "hi")).toBeNull();
  });
});

describe("mailtoLink", () => {
  it("builds a mailto with subject and body", () => {
    const link = mailtoLink(guest({ email: "ravi@x.com" }), "You are invited", "Dear {name}");
    expect(link).toContain("mailto:ravi@x.com");
    expect(link).toContain(encodeURIComponent("Dear Ravi Kumar"));
  });

  it("returns null without an email", () => {
    expect(mailtoLink(guest(), "s", "b")).toBeNull();
  });
});

describe("isReachable", () => {
  it("is true with a phone, or an email, and false with neither", () => {
    expect(isReachable(guest({ phone: "9876543210" }))).toBe(true);
    expect(isReachable(guest({ email: "a@b.com" }))).toBe(true);
    expect(isReachable(guest())).toBe(false);
  });
});

describe("groupForSending", () => {
  it("keeps a household together so they get one invitation", () => {
    const groups = groupForSending([
      guest({ id: "a", name: "Ravi", groupName: "Ongole Family", phone: "9876543210" }),
      guest({ id: "b", name: "Lakshmi", groupName: "Ongole Family" }),
      guest({ id: "c", name: "Anand", groupName: "Ongole Family" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Ongole Family");
    expect(groups[0].members).toHaveLength(3);
  });

  it("picks the household member who actually has a number", () => {
    const groups = groupForSending([
      guest({ id: "a", name: "Lakshmi", groupName: "Ongole Family" }),
      guest({ id: "b", name: "Ravi", groupName: "Ongole Family", phone: "9876543210" }),
    ]);
    expect(groups[0].primary?.name).toBe("Ravi");
  });

  it("falls back to a member with only an email", () => {
    const groups = groupForSending([
      guest({ id: "a", name: "Lakshmi", groupName: "Fam" }),
      guest({ id: "b", name: "Ravi", groupName: "Fam", email: "ravi@x.com" }),
    ]);
    expect(groups[0].primary?.name).toBe("Ravi");
  });

  it("treats guests with no group as individuals", () => {
    const groups = groupForSending([
      guest({ id: "a", name: "Ravi" }),
      guest({ id: "b", name: "Lakshmi" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.label).sort()).toEqual(["Lakshmi", "Ravi"]);
  });

  it("reports no primary when a household is unreachable", () => {
    const groups = groupForSending([guest({ id: "a", name: "Ravi", groupName: "Fam" })]);
    expect(groups[0].primary).toBeUndefined();
  });
});

describe("defaultInvitationMessage", () => {
  it("names the couple, the date and the venue", () => {
    const wedding = {
      brideName: "Hari", groomName: "Aditya",
      weddingDate: new Date("2026-12-13T00:00:00.000Z"),
      venue: "Sai Gardens", city: "Hyderabad",
    } as Wedding;
    const message = defaultInvitationMessage(wedding);
    expect(message).toContain("Hari");
    expect(message).toContain("Aditya");
    expect(message).toContain("Sai Gardens");
    expect(message).toContain("December");
  });

  it("still says something sensible with no wedding loaded", () => {
    expect(defaultInvitationMessage(undefined)).toContain("wedding");
  });
});
