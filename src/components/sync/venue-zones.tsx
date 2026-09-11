"use client";

import { useState } from "react";
import { Building2, Plus, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db, type VenueZone } from "@/lib/db/schema";
import { useVenues, useWedding } from "@/lib/db/hooks";
import { generateId } from "@/lib/utils";
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
          Name the parts of {wedding?.venue || "your venue"} so family can say where they are.
          Everyone on the wedding gets the same list automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {zones.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {zones.map((zone) => (
              <span
                key={zone.id}
                className="group inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                {zone.name}
                <button
                  onClick={() => removeZone(zone.id)}
                  aria-label={`Remove ${zone.name}`}
                  className="ml-1 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
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
