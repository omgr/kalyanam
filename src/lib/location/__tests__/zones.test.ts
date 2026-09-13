import {
  distanceMetres, matchZone, shouldSwitchZone, locatedZones,
  describeAccuracy, DEFAULT_ZONE_RADIUS_M,
  switchMargin, MAX_SWITCH_MARGIN_M, tooCloseToDistinguish,
  averagePositions, getMinSeparation, setMinSeparation, expectedReliability,
  DEFAULT_MIN_SEPARATION_M, LOWEST_MIN_SEPARATION_M,
} from "../zones";
import type { VenueZone } from "@/lib/db/schema";

// A plausible venue: areas 30-60m apart, as at a real wedding hall.
const HALL: VenueZone = { id: "z1", name: "Main Hall", latitude: 17.4400, longitude: 78.4000 };
const DINING: VenueZone = { id: "z2", name: "Dining Hall", latitude: 17.4404, longitude: 78.4000 }; // ~44m N
const PARKING: VenueZone = { id: "z3", name: "Parking", latitude: 17.4400, longitude: 78.4010 };   // ~106m E
const UNPLACED: VenueZone = { id: "z4", name: "Kitchen" };
const ZONES = [HALL, DINING, PARKING, UNPLACED];

describe("distanceMetres", () => {
  it("is zero for the same point", () => {
    expect(distanceMetres({ latitude: 17.44, longitude: 78.4 }, { latitude: 17.44, longitude: 78.4 })).toBe(0);
  });

  it("measures a short venue-scale hop correctly", () => {
    const d = distanceMetres(
      { latitude: 17.4400, longitude: 78.4 },
      { latitude: 17.4404, longitude: 78.4 }
    );
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(50);
  });

  it("is symmetric", () => {
    const a = { latitude: 17.44, longitude: 78.4 };
    const b = { latitude: 17.4404, longitude: 78.4009 };
    expect(distanceMetres(a, b)).toBeCloseTo(distanceMetres(b, a), 6);
  });
});

describe("locatedZones", () => {
  it("ignores areas nobody has stood in yet", () => {
    expect(locatedZones(ZONES).map((z) => z.name)).toEqual(["Main Hall", "Dining Hall", "Parking"]);
  });

  it("handles an undefined list", () => {
    expect(locatedZones(undefined)).toEqual([]);
  });
});

describe("matchZone", () => {
  it("picks the area you are standing in", () => {
    const m = matchZone({ latitude: 17.4400, longitude: 78.4000 }, ZONES);
    expect(m!.zone.name).toBe("Main Hall");
    expect(m!.distance).toBeLessThan(5);
  });

  it("picks the nearest when two are close, not the first in the list", () => {
    // Just beside the dining hall, which is listed second.
    const m = matchZone({ latitude: 17.44039, longitude: 78.4 }, ZONES);
    expect(m!.zone.name).toBe("Dining Hall");
  });

  it("returns null when nothing is near enough to trust", () => {
    // ~1km away
    expect(matchZone({ latitude: 17.45, longitude: 78.41 }, ZONES)).toBeNull();
  });

  it("returns null when no area has been placed", () => {
    expect(matchZone({ latitude: 17.44, longitude: 78.4 }, [UNPLACED])).toBeNull();
  });

  it("reports high confidence at the centre and lower further out", () => {
    const centre = matchZone({ latitude: 17.44, longitude: 78.4 }, [HALL])!;
    const edge = matchZone({ latitude: 17.4403, longitude: 78.4 }, [HALL])!;
    expect(centre.confidence).toBeGreaterThan(edge.confidence);
    expect(centre.confidence).toBeCloseTo(1, 1);
  });

  it("respects a custom radius", () => {
    const tight: VenueZone = { ...HALL, radius: 5 };
    const m = matchZone({ latitude: 17.4402, longitude: 78.4 }, [tight])!;
    expect(m.confidence).toBe(0); // ~22m away, well outside a 5m area
  });
});

describe("shouldSwitchZone", () => {
  const near = matchZone({ latitude: 17.4404, longitude: 78.4 }, ZONES)!; // Dining Hall

  it("sets an area when the person has none yet", () => {
    expect(shouldSwitchZone(null, near)).toBe(true);
  });

  it("does nothing when they are already reported there", () => {
    expect(shouldSwitchZone("Dining Hall", near, 3)).toBe(false);
  });

  it("does not flap between two areas on GPS noise", () => {
    // Currently reported in the Main Hall at 20m; dining hall reads 15m.
    // A 5m improvement is noise, not a move.
    expect(shouldSwitchZone("Main Hall", { ...near, distance: 15 }, 20)).toBe(false);
  });

  it("switches when the new area is clearly closer", () => {
    expect(shouldSwitchZone("Main Hall", { ...near, distance: 4 }, 40)).toBe(true);
  });

  it("does nothing when there is no match at all", () => {
    expect(shouldSwitchZone("Main Hall", null, 10)).toBe(false);
  });
});

describe("describeAccuracy", () => {
  it("describes readings in words rather than false precision", () => {
    expect(describeAccuracy(5)).toBe("excellent");
    expect(describeAccuracy(20)).toBe("good");
    expect(describeAccuracy(60)).toBe("fair");
    expect(describeAccuracy(500)).toBe("weak");
    expect(describeAccuracy(undefined)).toBe("unknown");
  });
});

describe("the default radius", () => {
  it("is generous enough for a real venue", () => {
    expect(DEFAULT_ZONE_RADIUS_M).toBeGreaterThanOrEqual(15);
  });
});

describe("switchMargin", () => {
  it("stays small when areas are close, so a short walk still registers", () => {
    // The failure a real test at home hit: rooms about six metres apart never
    // swapped, because the margin was a flat ten metres.
    expect(switchMargin(6)).toBe(2);
  });

  it("grows with distance, to stop flapping across a big venue", () => {
    expect(switchMargin(40)).toBe(10);
  });

  it("never exceeds the cap", () => {
    expect(switchMargin(1000)).toBe(MAX_SWITCH_MARGIN_M);
  });
});

describe("shouldSwitchZone with close-together areas", () => {
  const at = (name: string, distance: number) =>
    ({ zone: { id: name, name }, distance, confidence: 1 });

  it("moves you between two rooms six metres apart", () => {
    // Standing in the kitchen: kitchen 1m away, lounge 6m away.
    expect(shouldSwitchZone("Main Hall", at("Mandapam", 1), 6)).toBe(true);
  });

  it("still refuses to flap when the difference is noise", () => {
    expect(shouldSwitchZone("Main Hall", at("Mandapam", 19), 20)).toBe(false);
  });

  it("switches across a venue when genuinely closer", () => {
    expect(shouldSwitchZone("Main Hall", at("Dining Hall", 5), 45)).toBe(true);
  });
});

describe("tooCloseToDistinguish", () => {
  const HALL2: VenueZone = { id: "a", name: "Lounge", latitude: 17.44, longitude: 78.4 };

  it("flags a pin a few metres from an existing one", () => {
    // 17.44004 is roughly 4m north - a different room in a house.
    const near = tooCloseToDistinguish([HALL2], { latitude: 17.44004, longitude: 78.4 });
    expect(near?.name).toBe("Lounge");
  });

  it("accepts a pin far enough away to be told apart", () => {
    expect(tooCloseToDistinguish([HALL2], { latitude: 17.4404, longitude: 78.4 })).toBeNull();
  });

  it("ignores areas that have never been pinned", () => {
    expect(tooCloseToDistinguish([{ id: "b", name: "Garden" }], { latitude: 17.44, longitude: 78.4 })).toBeNull();
  });
});

describe("averagePositions", () => {
  it("averages several readings of the same spot", () => {
    const avg = averagePositions([
      { latitude: 17.4400, longitude: 78.4000, accuracy: 10 },
      { latitude: 17.4402, longitude: 78.4000, accuracy: 10 },
    ])!;
    expect(avg.latitude).toBeCloseTo(17.4401, 4);
  });

  it("trusts a precise reading far more than a vague one", () => {
    // Inverse-variance weighting: a ±5m fix should dominate a ±50m one.
    const avg = averagePositions([
      { latitude: 17.4400, longitude: 78.4, accuracy: 5 },
      { latitude: 17.4500, longitude: 78.4, accuracy: 50 },
    ])!;
    expect(avg.latitude).toBeLessThan(17.4405);
  });

  it("reports a better accuracy than any single reading", () => {
    const avg = averagePositions(
      Array.from({ length: 9 }, () => ({ latitude: 17.44, longitude: 78.4, accuracy: 12 }))
    )!;
    expect(avg.accuracy).toBeCloseTo(4, 0); // 12 / sqrt(9)
  });

  it("returns nothing when there is nothing to average", () => {
    expect(averagePositions([])).toBeNull();
  });
});

describe("minimum separation setting", () => {
  afterEach(() => localStorage.clear());

  it("defaults to the conservative value", () => {
    expect(getMinSeparation()).toBe(DEFAULT_MIN_SEPARATION_M);
  });

  it("can be lowered for testing at home", () => {
    setMinSeparation(5);
    expect(getMinSeparation()).toBe(5);
  });

  it("refuses a value below the floor", () => {
    setMinSeparation(1);
    expect(getMinSeparation()).toBe(LOWEST_MIN_SEPARATION_M);
  });
});

describe("expectedReliability", () => {
  it("is near a coin toss when areas are closer than the error", () => {
    expect(expectedReliability(5, 12)).toBeLessThan(0.7);
  });

  it("is dependable once separation clears twice the error", () => {
    expect(expectedReliability(30, 12)).toBeGreaterThan(0.9);
  });
});
