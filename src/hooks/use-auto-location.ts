"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db, type LocationData, type VenueZone } from "@/lib/db/schema";
import {
  matchZone,
  shouldSwitchZone,
  locatedZones,
  type ZoneMatch,
} from "@/lib/location/zones";

const ENABLED_KEY = "kalyanam_auto_location";

export function isAutoLocationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "true";
}

export interface AutoLocationState {
  enabled: boolean;
  supported: boolean;
  /** The area we last reported for this device. */
  currentZone: string | null;
  match: ZoneMatch | null;
  accuracy: number | undefined;
  placedCount: number;
  error: string | null;
  enable: () => void;
  disable: () => void;
}

/**
 * Keeps this device's area up to date without anyone tapping anything.
 *
 * `watchPosition` streams GPS fixes; each one is matched against the areas the
 * family has placed, and the member record is updated only when the answer
 * genuinely changes. Writing on every fix would flood the sync with noise, so
 * the hysteresis in shouldSwitchZone matters as much as the matching does.
 *
 * This only runs while the app is open. Phones suspend background tabs, and no
 * web app can track someone with the screen off.
 */
export function useAutoLocation(
  weddingId: string | null,
  memberId: string | null,
  zones: VenueZone[] | undefined
): AutoLocationState {
  const [enabled, setEnabled] = useState(false);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [match, setMatch] = useState<ZoneMatch | null>(null);
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const watchRef = useRef<number | null>(null);
  const lastDistance = useRef<number | undefined>(undefined);
  const zonesRef = useRef<VenueZone[] | undefined>(zones);
  zonesRef.current = zones;

  const supported =
    typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined";

  useEffect(() => setEnabled(isAutoLocationEnabled()), []);

  // Remember the area already recorded for this member, so a reload does not
  // re-announce a move that already happened.
  useEffect(() => {
    if (!memberId) return;
    void db.familyMembers.get(memberId).then((m) => {
      if (m?.lastLocation?.zone) setCurrentZone(m.lastLocation.zone);
    });
  }, [memberId]);

  const record = useCallback(
    async (position: GeolocationPosition, zoneName: string) => {
      if (!memberId) return;
      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        zone: zoneName,
        updatedAt: new Date(),
      };
      await db.familyMembers.update(memberId, {
        lastLocation: location,
        locationUpdatedAt: new Date(),
        updatedAt: new Date(),
      });
      setCurrentZone(zoneName);
    },
    [memberId]
  );

  useEffect(() => {
    if (!enabled || !supported || !weddingId || !memberId) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setError(null);
        setAccuracy(position.coords.accuracy);

        const next = matchZone(position.coords, zonesRef.current);
        setMatch(next);

        if (shouldSwitchZone(currentZone, next, lastDistance.current)) {
          lastDistance.current = next!.distance;
          void record(position, next!.zone.name);
        } else if (next && next.zone.name === currentZone) {
          lastDistance.current = next.distance;
        }
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Allow it in your browser settings, or pick your area by hand."
            : "Could not get a location fix. Indoors this is common - pick your area by hand."
        );
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
    );

    watchRef.current = id;
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    };
  }, [enabled, supported, weddingId, memberId, currentZone, record]);

  return {
    enabled,
    supported,
    currentZone,
    match,
    accuracy,
    placedCount: locatedZones(zones).length,
    error,
    enable: () => {
      localStorage.setItem(ENABLED_KEY, "true");
      setEnabled(true);
    },
    disable: () => {
      localStorage.setItem(ENABLED_KEY, "false");
      setEnabled(false);
      setMatch(null);
    },
  };
}
