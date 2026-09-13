/**
 * Working out which part of a venue someone is standing in.
 *
 * The honest constraint: a browser has exactly one positioning API,
 * `navigator.geolocation`. There is no access to wifi signal strength, and Web
 * Bluetooth cannot scan for beacons in the background on any phone that
 * matters. So indoor positioning has to be built out of GPS, or out of
 * something the family sticks on a wall.
 *
 * GPS indoors is usually accurate to somewhere between 15 and 50 metres, which
 * sounds useless. It is not, because the error is *correlated*: readings taken
 * within a short time at the same venue are wrong in roughly the same
 * direction and by roughly the same amount. Comparing a live reading against
 * coordinates captured at that same venue therefore works far better than the
 * raw accuracy figure suggests.
 *
 * What this cannot do is floors. Two areas stacked on top of each other are the
 * same point to GPS.
 */

import type { VenueZone } from "@/lib/db/schema";

/** Generous by default - wedding venues are large and GPS indoors is soft. */
export const DEFAULT_ZONE_RADIUS_M = 25;

/**
 * Beyond this, a match is too weak to act on. Leaving someone's area unchanged
 * is better than announcing they are in the kitchen when they are not.
 */
export const MAX_MATCH_DISTANCE_M = 120;

/**
 * How much closer a new area must be before a move is reported.
 *
 * A fixed margin does not work: at ten metres it stops any two areas closer
 * than that from ever swapping, which is most of a house and plenty of a
 * venue - a dining hall and a mandapam thirty feet apart would never register.
 * Scaling with the current distance keeps the anti-flapping behaviour where
 * areas are far apart, without freezing where they are close.
 */
export const MIN_SWITCH_MARGIN_M = 2;
export const MAX_SWITCH_MARGIN_M = 10;
export const SWITCH_MARGIN_FRACTION = 0.3;

export function switchMargin(currentDistance: number): number {
  return Math.min(
    MAX_SWITCH_MARGIN_M,
    Math.max(MIN_SWITCH_MARGIN_M, currentDistance * SWITCH_MARGIN_FRACTION)
  );
}

/**
 * How far apart two areas must be before GPS can reliably tell them apart.
 *
 * This is not a preference, it is arithmetic. A reading accurate to ±12m
 * lands somewhere in a 12m circle around where you actually are, so two
 * points 5m apart are picked correctly about 62% of the time - barely better
 * than a coin toss, and the app would flicker between them rather than track
 * you. At 25m separation the same reading is right essentially always.
 *
 * The default is deliberately conservative. It can be lowered for testing at
 * home, where nobody has 25m of separation to play with, as long as the
 * consequence is stated rather than hidden.
 */
export const DEFAULT_MIN_SEPARATION_M = 15;
export const LOWEST_MIN_SEPARATION_M = 5;

const SEPARATION_KEY = "kalyanam_min_area_separation";

export function getMinSeparation(): number {
  if (typeof window === "undefined") return DEFAULT_MIN_SEPARATION_M;
  const stored = Number(localStorage.getItem(SEPARATION_KEY));
  return Number.isFinite(stored) && stored >= LOWEST_MIN_SEPARATION_M
    ? stored
    : DEFAULT_MIN_SEPARATION_M;
}

export function setMinSeparation(metres: number): void {
  localStorage.setItem(
    SEPARATION_KEY,
    String(Math.max(LOWEST_MIN_SEPARATION_M, Math.round(metres)))
  );
}

/**
 * Roughly how often the nearest-area calculation picks correctly, given a
 * separation and a measured accuracy. Used to tell someone what they are
 * actually getting rather than leaving them to discover it by walking about.
 */
export function expectedReliability(separation: number, accuracy: number): number {
  if (accuracy <= 0) return 1;
  const ratio = separation / (2 * accuracy);
  // Empirical fit to the simulation: saturates once separation passes ~2x error.
  return Math.max(0.5, Math.min(1, 0.5 + ratio * 0.75));
}

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface ZoneMatch {
  zone: VenueZone;
  distance: number;
  /** 0-1, how firmly inside its radius the reading sits. */
  confidence: number;
}

/** Great-circle distance in metres. */
export function distanceMetres(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Zones that have been taught where they are. */
export function locatedZones(zones: VenueZone[] | undefined): VenueZone[] {
  return (zones ?? []).filter(
    (z) => typeof z.latitude === "number" && typeof z.longitude === "number"
  );
}

/**
 * The closest area to a position, or null when nothing is near enough.
 *
 * Nearest wins rather than first-containing, so overlapping areas resolve by
 * distance instead of by the order somebody happened to add them.
 */
export function matchZone(
  position: Coords,
  zones: VenueZone[] | undefined
): ZoneMatch | null {
  const candidates = locatedZones(zones);
  if (candidates.length === 0) return null;

  let best: ZoneMatch | null = null;

  for (const zone of candidates) {
    const distance = distanceMetres(position, {
      latitude: zone.latitude as number,
      longitude: zone.longitude as number,
    });
    if (distance > MAX_MATCH_DISTANCE_M) continue;

    const radius = zone.radius ?? DEFAULT_ZONE_RADIUS_M;
    const confidence = Math.max(0, Math.min(1, 1 - distance / (radius * 2)));

    if (!best || distance < best.distance) best = { zone, distance, confidence };
  }

  return best;
}

/**
 * Should we move someone from their current area to `next`?
 *
 * Without this, anyone standing between two areas is reported as flitting
 * between them every few seconds as GPS noise tips the balance back and forth.
 */
export function shouldSwitchZone(
  currentZoneName: string | null | undefined,
  next: ZoneMatch | null,
  currentDistance?: number
): boolean {
  if (!next) return false;
  if (!currentZoneName) return true;
  if (next.zone.name === currentZoneName) return false;
  if (currentDistance === undefined) return true;
  return next.distance < currentDistance - switchMargin(currentDistance);
}

/**
 * Pinned areas that sit too close together to be distinguished.
 *
 * Worth saying out loud when someone pins them: GPS cannot separate two points
 * a few metres apart, so the app would simply never move anyone between them,
 * and it would look broken rather than physically impossible.
 */
export function tooCloseToDistinguish(
  zones: VenueZone[] | undefined,
  candidate: Coords
): VenueZone | null {
  for (const zone of locatedZones(zones)) {
    const distance = distanceMetres(candidate, {
      latitude: zone.latitude as number,
      longitude: zone.longitude as number,
    });
    if (distance < getMinSeparation()) return zone;
  }
  return null;
}

/** Plain language, so nobody reads "38" and assumes it is precise. */
export function describeAccuracy(accuracy: number | undefined): string {
  if (accuracy === undefined) return "unknown";
  if (accuracy < 10) return "excellent";
  if (accuracy < 30) return "good";
  if (accuracy < 100) return "fair";
  return "weak";
}


/**
 * Take several readings and combine them into one pin.
 *
 * A single fix carries the full measurement error. Random error averages out
 * across samples, so a handful taken a second apart lands materially closer to
 * the truth - which is the cheapest way to make close-together areas
 * distinguishable at all. Samples are weighted by their own reported accuracy,
 * so a poor one does not drag the result around.
 */
export function averagePositions(
  samples: Array<{ latitude: number; longitude: number; accuracy?: number }>
): { latitude: number; longitude: number; accuracy: number } | null {
  if (samples.length === 0) return null;

  let weightSum = 0;
  let lat = 0;
  let lon = 0;

  for (const sample of samples) {
    // Inverse-variance weighting: a ±5m fix counts far more than a ±50m one.
    const accuracy = Math.max(1, sample.accuracy ?? 50);
    const weight = 1 / (accuracy * accuracy);
    weightSum += weight;
    lat += sample.latitude * weight;
    lon += sample.longitude * weight;
  }

  return {
    latitude: lat / weightSum,
    longitude: lon / weightSum,
    // Averaging n independent samples reduces the error by roughly sqrt(n).
    accuracy:
      Math.min(...samples.map((s) => s.accuracy ?? 50)) / Math.sqrt(samples.length),
  };
}

/** Collect readings for a few seconds, then average them into one position. */
export function samplePosition(
  options: { samples?: number; timeoutMs?: number } = {}
): Promise<{ latitude: number; longitude: number; accuracy: number; used: number }> {
  const wanted = options.samples ?? 6;
  const timeoutMs = options.timeoutMs ?? 12000;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser cannot read a location."));
      return;
    }

    const collected: Array<{ latitude: number; longitude: number; accuracy?: number }> = [];
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);

      const averaged = averagePositions(collected);
      if (!averaged) {
        reject(new Error("Could not get a location fix."));
        return;
      }
      resolve({ ...averaged, used: collected.length });
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        collected.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        if (collected.length >= wanted) finish();
      },
      () => {
        // Keep waiting - a single failed reading is not the end of the attempt.
        if (collected.length > 0) finish();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );

    const timer = setTimeout(finish, timeoutMs);
  });
}
