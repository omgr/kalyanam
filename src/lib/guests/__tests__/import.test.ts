import {
  parseCsvLine, parseGuestCsv, parseVCard, parseGuestFile,
  normalisePhone, dedupeGuests,
} from "../import";

describe("parseCsvLine", () => {
  it("splits plain fields", () => {
    expect(parseCsvLine("Ravi,9876543210,ravi@x.com")).toEqual(["Ravi", "9876543210", "ravi@x.com"]);
  });

  it("keeps a comma inside quotes, as in 'Rao, Venkat'", () => {
    expect(parseCsvLine('"Rao, Venkat",9876543210')).toEqual(["Rao, Venkat", "9876543210"]);
  });

  it("handles escaped quotes", () => {
    expect(parseCsvLine('"He said ""hi""",x')).toEqual(['He said "hi"', "x"]);
  });

  it("keeps empty fields in place", () => {
    expect(parseCsvLine("Ravi,,ravi@x.com")).toEqual(["Ravi", "", "ravi@x.com"]);
  });
});

describe("parseGuestCsv", () => {
  it("reads a simple headed file", () => {
    const { guests } = parseGuestCsv("Name,Phone,Email\nRavi Kumar,9876543210,ravi@x.com");
    expect(guests).toEqual([{ name: "Ravi Kumar", phone: "9876543210", email: "ravi@x.com" }]);
  });

  it("accepts a Google Contacts export without renaming columns", () => {
    const csv = [
      "Name,Given Name,Phone 1 - Value,E-mail 1 - Value",
      "Lakshmi Devi,Lakshmi,+91 98765 43210,lakshmi@x.com",
    ].join("\n");
    const { guests } = parseGuestCsv(csv);
    expect(guests[0].name).toBe("Lakshmi Devi");
    expect(guests[0].phone).toBe("+91 98765 43210");
    expect(guests[0].email).toBe("lakshmi@x.com");
  });

  it("picks up side and family group", () => {
    const csv = "Name,Side,Family\nAnand,Bride,Ongole Family";
    const { guests } = parseGuestCsv(csv);
    expect(guests[0].side).toBe("bride");
    expect(guests[0].groupName).toBe("Ongole Family");
  });

  it("understands groom and both for side", () => {
    const { guests } = parseGuestCsv("Name,Side\nA,Groom\nB,Both\nC,nonsense");
    expect(guests.map((g) => g.side)).toEqual(["groom", "mutual", undefined]);
  });

  it("falls back to name,phone,email when there is no header", () => {
    const { guests } = parseGuestCsv("Ravi Kumar,9876543210,ravi@x.com");
    expect(guests[0]).toEqual({ name: "Ravi Kumar", phone: "9876543210", email: "ravi@x.com" });
  });

  it("skips rows with no name rather than importing blanks", () => {
    const { guests, skipped } = parseGuestCsv("Name,Phone\nRavi,123\n,456\n,789");
    expect(guests).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  it("copes with Windows line endings and trailing blank lines", () => {
    const { guests } = parseGuestCsv("Name,Phone\r\nRavi,123\r\n\r\n");
    expect(guests).toHaveLength(1);
  });

  it("returns nothing for an empty file", () => {
    expect(parseGuestCsv("")).toEqual({ guests: [], skipped: 0 });
  });
});

describe("parseVCard", () => {
  const vcf = `BEGIN:VCARD
VERSION:3.0
FN:Ravi Kumar
TEL;TYPE=CELL:+91 98765 43210
EMAIL:ravi@x.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Devi;Lakshmi;;;
TEL:9876500000
END:VCARD`;

  it("reads multiple cards", () => {
    const { guests } = parseVCard(vcf);
    expect(guests).toHaveLength(2);
  });

  it("uses the display name when present", () => {
    expect(parseVCard(vcf).guests[0].name).toBe("Ravi Kumar");
  });

  it("builds a name from structured N when FN is missing", () => {
    expect(parseVCard(vcf).guests[1].name).toBe("Lakshmi Devi");
  });

  it("strips formatting from phone numbers", () => {
    expect(parseVCard(vcf).guests[0].phone).toBe("+919876543210");
  });

  it("unfolds continuation lines", () => {
    const folded = "BEGIN:VCARD\nFN:Venkata Subrahmanya\n  Sharma\nEND:VCARD";
    expect(parseVCard(folded).guests[0].name).toBe("Venkata Subrahmanya Sharma");
  });

  it("skips a card with no name at all", () => {
    const { guests, skipped } = parseVCard("BEGIN:VCARD\nTEL:123\nEND:VCARD");
    expect(guests).toHaveLength(0);
    expect(skipped).toBe(1);
  });
});

describe("parseGuestFile", () => {
  it("detects vCard by extension", () => {
    expect(parseGuestFile("contacts.vcf", "BEGIN:VCARD\nFN:Ravi\nEND:VCARD").guests[0].name).toBe("Ravi");
  });

  it("detects vCard by content even when misnamed", () => {
    expect(parseGuestFile("export.txt", "BEGIN:VCARD\nFN:Ravi\nEND:VCARD").guests).toHaveLength(1);
  });

  it("treats anything else as CSV", () => {
    expect(parseGuestFile("list.csv", "Name,Phone\nRavi,1").guests).toHaveLength(1);
  });
});

describe("normalisePhone", () => {
  it("reduces the same Indian number written three ways to one form", () => {
    expect(normalisePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalisePhone("098765 43210")).toBe("9876543210");
    expect(normalisePhone("98765-43210")).toBe("9876543210");
  });

  it("returns an empty string for nothing", () => {
    expect(normalisePhone(undefined)).toBe("");
  });
});

describe("dedupeGuests", () => {
  it("removes repeats inside one import", () => {
    const { unique, duplicates } = dedupeGuests([
      { name: "Ravi", phone: "+91 98765 43210" },
      { name: "Ravi Kumar", phone: "09876543210" },
    ]);
    expect(unique).toHaveLength(1);
    expect(duplicates).toBe(1);
  });

  it("does not re-add someone already on the guest list", () => {
    const { unique, duplicates } = dedupeGuests(
      [{ name: "Ravi", phone: "9876543210" }],
      [{ name: "Ravi Kumar", phone: "+91 98765 43210" }]
    );
    expect(unique).toHaveLength(0);
    expect(duplicates).toBe(1);
  });

  it("falls back to matching on name when nobody has a number", () => {
    const { unique } = dedupeGuests([{ name: "Ravi" }, { name: "ravi" }]);
    expect(unique).toHaveLength(1);
  });

  it("keeps two different people who share a name but have different numbers", () => {
    const { unique } = dedupeGuests([
      { name: "Ravi", phone: "1111111111" },
      { name: "Ravi", phone: "2222222222" },
    ]);
    expect(unique).toHaveLength(2);
  });

  it("importing the same file twice adds nobody the second time", () => {
    const file = [
      { name: "Ravi", phone: "9876543210" },
      { name: "Lakshmi", phone: "9876500000" },
    ];
    const first = dedupeGuests(file);
    const second = dedupeGuests(file, first.unique.map((g) => ({ name: g.name, phone: g.phone })));
    expect(first.unique).toHaveLength(2);
    expect(second.unique).toHaveLength(0);
    expect(second.duplicates).toBe(2);
  });
});
