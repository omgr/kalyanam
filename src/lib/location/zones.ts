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

/** A new area must beat the current one by this much before we report a move. */
export const SWITCH_MARGIN_M = 10;

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
  return next.distance < currentDistance - SWITCH_MARGIN_M;
}

/** Plain language, so nobody reads "38" and assumes it is precise. */
export function describeAccuracy(accuracy: number | undefined): string {
  if (accuracy === undefined) return "unknown";
  if (accuracy < 10) return "excellent";
  if (accuracy < 30) return "good";
  if (accuracy < 100) return "fair";
  return "weak";
}
