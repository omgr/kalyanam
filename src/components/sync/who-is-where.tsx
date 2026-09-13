"use client";

import { MapPin, Navigation, Phone, CircleDot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFamilyMembers, useVenues } from "@/lib/db/hooks";

/**
 * Who is where, by name.
 *
 * The screen used to show a grid of areas with a count under each - "Mandapam:
 * 1 member" - which answers a question nobody asks. What you want to know at a
 * wedding is where a particular person is, or who is near you, and a number
 * cannot tell you either.
 */
export function WhoIsWhere({
  weddingId,
  deviceMemberId,
}: {
  weddingId: string;
  deviceMemberId: string | null;
}) {
  const members = useFamilyMembers(weddingId);
  const venues = useVenues(weddingId);
  const zoneNames = venues?.[0]?.zones?.map((z) => z.name) ?? [];

  const located = (members ?? []).filter((m) => m.lastLocation?.zone);
  const unlocated = (members ?? []).filter((m) => !m.lastLocation?.zone);

  // Group by area, keeping the family's own ordering of the venue.
  const areas = new Map<string, typeof located>();
  for (const member of located) {
    const zone = member.lastLocation!.zone as string;
    areas.set(zone, [...(areas.get(zone) ?? []), member]);
  }
  const ordered = [
    ...zoneNames.filter((z) => areas.has(z)),
    ...[...areas.keys()].filter((z) => !zoneNames.includes(z)),
  ];

  const ago = (date: Date | undefined) => {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Who is where
        </CardTitle>
        <CardDescription>
          {located.length === 0
            ? "Nobody has shared an area yet."
            : `${located.length} of ${members?.length ?? 0} family members have shared where they are.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {ordered.map((zone) => (
          <div key={zone} className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <CircleDot className="w-3.5 h-3.5 text-primary" />
              {zone}
              <span className="text-muted-foreground font-normal">
                · {areas.get(zone)!.length}
              </span>
            </p>
            <div className="space-y-1 pl-5">
              {areas.get(zone)!.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <span className="flex-1 min-w-0 truncate">
                    {member.name}
                    {member.id === deviceMemberId && (
                      <span className="text-muted-foreground font-normal"> (you)</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {ago(member.locationUpdatedAt)}
                  </span>
                  {member.phone && member.id !== deviceMemberId && (
                    <a href={`tel:${member.phone}`} aria-label={`Call ${member.name}`}>
                      <Phone className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                  {member.lastLocation?.latitude && member.id !== deviceMemberId && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${member.lastLocation.latitude},${member.lastLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Directions to ${member.name}`}
                    >
                      <Navigation className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {unlocated.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="text-sm font-medium text-muted-foreground">Not sharing</p>
            <div className="flex flex-wrap gap-2 pl-1">
              {unlocated.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
                >
                  {member.name}
                  {member.id === deviceMemberId && " (you)"}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
