"use client";

import { Navigation, NavigationOff, Crosshair, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoLocation } from "@/hooks/use-auto-location";
import { describeAccuracy } from "@/lib/location/zones";
import type { VenueZone } from "@/lib/db/schema";

/**
 * Hands-free area tracking.
 *
 * Once the family has pinned the venue's areas, this watches the GPS and moves
 * the member between them on its own, so nobody is tapping a dropdown while
 * carrying a tray of sweets.
 */
export function AutoLocationPanel({
  weddingId,
  memberId,
  zones,
}: {
  weddingId: string;
  memberId: string | null;
  zones: VenueZone[] | undefined;
}) {
  const auto = useAutoLocation(weddingId, memberId, zones);

  if (!auto.supported) return null;

  return (
    <Card className={auto.enabled ? "border-green-500/50" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            {auto.enabled ? (
              <Navigation className="w-5 h-5 text-green-600" />
            ) : (
              <NavigationOff className="w-5 h-5 text-muted-foreground" />
            )}
            Automatic area tracking
          </span>
          {auto.enabled && auto.currentZone && (
            <span className="flex items-center gap-1.5 text-sm font-normal text-green-600">
              <MapPin className="w-4 h-4" />
              {auto.currentZone}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {auto.placedCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            {zones && zones.length > 0
              ? "The venue areas are here, but none has been pinned yet. Whoever is at the venue should stand in each one and tap its crosshair above - it only needs doing once, by one person."
              : "No venue areas yet. Add them above, or wait for whoever set them up to sync - they arrive automatically."}
          </p>
        ) : !auto.enabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              Let your phone update your area by itself as you move around the venue.{" "}
              {auto.placedCount} area{auto.placedCount === 1 ? " is" : "s are"} pinned and ready.
            </p>
            <Button onClick={auto.enable} className="w-full" disabled={!memberId}>
              <Navigation className="w-4 h-4 mr-2" />
              Track my area automatically
            </Button>
            {!memberId && (
              <p className="text-xs text-muted-foreground">
                Choose who is using this device first.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              <p className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-muted-foreground" />
                {auto.match ? (
                  <>
                    Nearest area: <strong>{auto.match.zone.name}</strong>{" "}
                    <span className="text-muted-foreground">
                      ({Math.round(auto.match.distance)}m away)
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    No pinned area nearby yet - waiting for a fix.
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Signal: {describeAccuracy(auto.accuracy)}
                {auto.accuracy ? ` (±${Math.round(auto.accuracy)}m)` : ""}
              </p>
            </div>

            <p className="text-xs text-muted-foreground border-l-2 border-yellow-500 pl-3">
              This works while Kalyanam is open on screen. Phones stop background tabs to save
              battery, so no web app can follow you with the screen off.
            </p>

            <Button variant="outline" onClick={auto.disable} className="w-full">
              <NavigationOff className="w-4 h-4 mr-2" />
              Stop tracking automatically
            </Button>
          </>
        )}

        {auto.error && (
          <p className="text-sm text-red-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {auto.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
