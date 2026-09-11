import { generateId, formatCurrency, getDaysUntil, calculatePercentage } from "../utils";

describe("generateId", () => {
  const realCrypto = globalThis.crypto;
  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", { value: realCrypto, configurable: true });
  });

  it("produces a v4-shaped id", () => {
    expect(generateId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 500 }, generateId));
    expect(ids.size).toBe(500);
  });

  // crypto.randomUUID only exists in a secure context, so it is missing when
  // the app is opened over plain http from a phone on the local network.
  it("still works when crypto.randomUUID is unavailable", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) },
      configurable: true,
    });

    expect(generateId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});

describe("getDaysUntil", () => {
  it("counts forward to a future date", () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    expect(getDaysUntil(d)).toBeGreaterThanOrEqual(9);
    expect(getDaysUntil(d)).toBeLessThanOrEqual(10);
  });

  it("goes negative once the date has passed", () => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    expect(getDaysUntil(d)).toBeLessThan(0);
  });

  it("accepts an ISO string, as restored backups used to contain", () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    expect(getDaysUntil(d.toISOString())).toBeGreaterThanOrEqual(2);
  });
});

describe("formatCurrency", () => {
  it("formats rupees in the Indian numbering system", () => {
    expect(formatCurrency(1900000, "INR")).toContain("19,00,000");
  });
});

describe("calculatePercentage", () => {
  it("returns 0 rather than NaN when the total is zero", () => {
    expect(calculatePercentage(5, 0)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(calculatePercentage(1, 3)).toBe(33);
  });
});
