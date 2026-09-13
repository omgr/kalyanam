"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, MapPin, Crosshair, Check, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db, type VenueZone } from "@/lib/db/schema";
import { useVenues, useWedding } from "@/lib/db/hooks";
import { generateId } from "@/lib/utils";
import {
  DEFAULT_ZONE_RADIUS_M, tooCloseToDistinguish, getMinSeparation, setMinSeparation,
  samplePosition, expectedReliability, LOWEST_MIN_SEPARATION_M, DEFAULT_MIN_SEPARATION_M,
} from "@/lib/location/zones";
import { toast } from "@/hooks/use-toast";

const STARTER_ZONES = [
  "Main Hall", "Mandapam", "Dining Hall", "Garden",
  "Entrance", "Parking", "Bride's Room", "Groom's Room",
];

/**
 * Describes the venue as a list of named areas.
 *
 * Zones live on the venue record, which syncs, so one person sets them up once
 * and every family device gets the same list. Checking into a named area is far
 * more useful indoors than GPS, which cannot tell the dining hall from the
 * mandapam one floor above it.
 */
export function VenueZones({ weddingId }: { weddingId: string }) {
  const venues = useVenues(weddingId);
  const wedding = useWedding(weddingId);
  const [newZone, setNewZone] = useState("");
  const [placing, setPlacing] = useState<string | null>(null);
  const [separation, setSeparation] = useState(DEFAULT_MIN_SEPARATION_M);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => setSeparation(getMinSeparation()), []);
  const venue = venues?.[0];

  const saveZones = async (zones: VenueZone[]) => {
    try {
      if (venue) {
        await db.venues.update(venue.id, { zones, updatedAt: new Date() });
      } else {
        await db.venues.add({
          id: generateId(),
          weddingId,
          name: wedding?.venue || "Wedding venue",
          address: undefined,
          zones,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not save the zones",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const zones = venue?.zones ?? [];

  const addZone = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (zones.some((z) => z.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ variant: "destructive", title: `"${trimmed}" is already a zone` });
      return;
    }
    await saveZones([...zones, { id: generateId(), name: trimmed }]);
    setNewZone("");
  };

  const removeZone = async (id: string) => {
    await saveZones(zones.filter((z) => z.id !== id));
  };

  /**
   * Capture where an area actually is by standing in it.
   *
   * Doing this once per area is what turns the locator from "everyone taps
   * their location all day" into something that updates by itself.
   */
  const placeZone = async (zone: VenueZone) => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "This browser cannot read a location" });
      return;
    }
    setPlacing(zone.id);
    try {
      // Several readings averaged, rather than one. A single fix carries the
      // full error; averaging a handful lands materially closer and is what
      // makes close-together areas separable at all.
      const fix = await samplePosition({ samples: 6 });

      const clash = tooCloseToDistinguish(
        zones.filter((z) => z.id !== zone.id),
        fix
      );

      await saveZones(
        zones.map((z) =>
          z.id === zone.id
            ? {
                ...z,
                latitude: fix.latitude,
                longitude: fix.longitude,
                radius: z.radius ?? DEFAULT_ZONE_RADIUS_M,
              }
            : z
        )
      );
      setPlacing(null);

      if (clash) {
        toast({
          variant: "destructive",
          title: `Too close to ${clash.name}`,
          description:
            `Pinned, but these two are under ${getMinSeparation()}m apart, so tracking will ` +
            `flicker between them rather than follow you. Lower the minimum below if you are ` +
            `testing at home.`,
        });
      } else {
        toast({
          variant: "success",
          title: `${zone.name} pinned`,
          description: `Averaged ${fix.used} readings, ±${Math.round(fix.accuracy)}m.`,
        });
      }
    } catch (error) {
      setPlacing(null);
      toast({
        variant: "destructive",
        title: "Could not get a location fix",
        description: error instanceof Error ? error.message : "Step outside and try again.",
      });
    }
  };

  const addStarters = async () => {
    const existing = new Set(zones.map((z) => z.name.toLowerCase()));
    const additions = STARTER_ZONES.filter((n) => !existing.has(n.toLowerCase())).map((name) => ({
      id: generateId(),
      name,
    }));
    await saveZones([...zones, ...additions]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Venue Areas
        </CardTitle>
        <CardDescription>
          Name the parts of {wedding?.venue || "your venue"}. Then <strong>stand in each one</strong>{" "}
          and tap its crosshair to record where it is. After that, family phones recognise the
          area on their own. Areas need about fifteen metres between them for GPS to tell them
          apart. The list syncs to everyone automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {zones.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {zones.map((zone) => {
              const pinned = typeof zone.latitude === "number";
              return (
                <span
                  key={zone.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                    pinned ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                  }`}
                >
                  {pinned ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  {zone.name}
                  <button
                    onClick={() => placeZone(zone)}
                    disabled={placing === zone.id}
                    aria-label={`Pin ${zone.name} to where I am standing`}
                    title={pinned ? "Re-pin to where I am standing" : "Pin to where I am standing"}
                    className="ml-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {placing === zone.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => removeZone(zone.id)}
                    aria-label={`Remove ${zone.name}`}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              No areas yet. Family will see a generic list until you add some.
            </p>
            <Button variant="outline" size="sm" onClick={addStarters}>
              <Plus className="w-4 h-4 mr-2" />
              Add common wedding areas
            </Button>
          </div>
        )}

        {zones.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {zones.filter((z) => typeof z.latitude === "number").length} of {zones.length} areas
            pinned. Unpinned areas can still be chosen by hand.
          </p>
        )}

        <div className="border-t border-border pt-3">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showAdvanced ? "Hide" : "Testing options"}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-2">
              <Label htmlFor="separation" className="text-sm">
                Minimum distance between areas: {separation}m
              </Label>
              <input
                id="separation"
                type="range"
                min={LOWEST_MIN_SEPARATION_M}
                max={40}
                step={1}
                value={separation}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setSeparation(next);
                  setMinSeparation(next);
                }}
                className="w-full accent-current"
              />
              <p className="text-xs text-muted-foreground">
                With a typical ±12m phone fix, areas {separation}m apart are picked correctly
                about {Math.round(expectedReliability(separation, 12) * 100)}% of the time.
                {separation < DEFAULT_MIN_SEPARATION_M && (
                  <>
                    {" "}
                    <strong>
                      Below {DEFAULT_MIN_SEPARATION_M}m it will flicker between areas rather than
                      follow you
                    </strong>{" "}
                    - useful for trying it out at home, not for the day itself.
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add an area, e.g. Upstairs Mandapam"
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addZone(newZone)}
          />
          <Button onClick={() => addZone(newZone)} disabled={!newZone.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
