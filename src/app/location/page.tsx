"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin,
  Navigation,
  Users,
  Search,
  RefreshCw,
  Signal,
  Wifi,
  WifiOff,
  Phone,
  MessageSquare,
  Clock,
  Target,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useFamilyMembers, useWedding, useVenues, useLocationPings } from "@/lib/db/hooks";
import { db, FamilyMember, LocationData, LocationPing } from "@/lib/db/schema";
import { resolveUserId, getDeviceMemberId } from "@/lib/session";
import { WhoAreYou } from "@/components/sync/who-are-you";
import { VenueZones } from "@/components/sync/venue-zones";
import { AutoLocationPanel } from "@/components/sync/auto-location-panel";
import { toast } from "@/hooks/use-toast";
import { generateId } from "@/lib/utils";

export default function LocationPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [deviceMemberId, setDeviceMemberIdState] = useState<string | null>(null);

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(storedWeddingId);
    // Derive and persist a user id if this device arrived via import or sync.
    resolveUserId(storedWeddingId).then(setUserId);
    setDeviceMemberIdState(getDeviceMemberId());
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const familyMembers = useFamilyMembers(weddingId ?? undefined);
  const venues = useVenues(weddingId ?? undefined);
  const locationPings = useLocationPings(weddingId ?? undefined);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position);
        setLocationError(null);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out");
            break;
          default:
            setLocationError("An unknown error occurred");
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, []);

  // Share location
  const shareLocation = async () => {
    if (!weddingId || !currentLocation) return;

    // Share as whoever this device says it belongs to. Guessing here would
    // report one person's phone as another person's location, which is worse
    // than not sharing at all.
    const member = familyMembers?.find((m) => m.id === deviceMemberId);
    if (!member) {
      toast({
        variant: "destructive",
        title: "Tell us who you are first",
        description: "Choose which family member is using this device, then share your location.",
      });
      return;
    }

    setIsSharing(true);

    const locationData: LocationData = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      accuracy: currentLocation.coords.accuracy,
      zone: selectedZone || undefined,
      updatedAt: new Date(),
    };

    // Update family member's last location
    await db.familyMembers.update(member.id, {
      lastLocation: locationData,
      locationUpdatedAt: new Date(),
      updatedAt: new Date(),
    });

    // Create a location ping
    await db.locationPings.add({
      id: generateId(),
      weddingId,
      memberId: member.id,
      memberName: member.name,
      location: locationData,
      isActive: true,
      batteryLevel: (navigator as any).getBattery
        ? await (navigator as any).getBattery().then((b: any) => Math.round(b.level * 100))
        : undefined,
      createdAt: new Date(),
    });

    setTimeout(() => setIsSharing(false), 1000);
  };

  // Update location every 30 seconds if sharing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSharing && currentLocation) {
      interval = setInterval(() => {
        getCurrentLocation();
        shareLocation();
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [isSharing, currentLocation, getCurrentLocation]);

  const filteredMembers = familyMembers?.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      member.id !== familyMembers.find((m) => m.userId === userId)?.id
  );

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getSignalStrength = (accuracy?: number) => {
    if (!accuracy) return "weak";
    if (accuracy < 10) return "excellent";
    if (accuracy < 30) return "good";
    if (accuracy < 100) return "fair";
    return "weak";
  };

  /** Sensible starting points when a family has not described their venue yet. */
  const DEFAULT_ZONES = [
    "Main Hall",
    "Garden",
    "Entrance",
    "Parking",
    "Stage Area",
    "Dining Hall",
    "Kitchen",
    "Dressing Room",
    "Reception",
    "Other",
  ];

  // Zones defined for the venue win, so "Sai Gardens - Upstairs Mandapam" is
  // possible rather than everyone picking from a generic list. Venues sync, so
  // one person sets them up and the whole family gets them.
  const venueZones = venues?.[0]?.zones?.map((z) => z.name) ?? [];
  const zones = venueZones.length > 0 ? venueZones : DEFAULT_ZONES;

  if (!weddingId || !wedding) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <MapPin className="w-8 h-8 text-primary" />
              Find Family
            </h1>
            <p className="text-muted-foreground">
              Locate family members during the wedding
            </p>
          </div>
          <Button onClick={getCurrentLocation} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Location
          </Button>
        </div>

        {/* Until this device says who is holding it, sharing a location would
            be attributed to the wrong person. */}
        {!deviceMemberId && (
          <WhoAreYou weddingId={weddingId} onChosen={setDeviceMemberIdState} />
        )}

        <VenueZones weddingId={weddingId} />

        <AutoLocationPanel
          weddingId={weddingId}
          memberId={deviceMemberId}
          zones={venues?.[0]?.zones}
        />

        {/* Your Location Card */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Your Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationError ? (
              <div className="text-center py-4">
                <WifiOff className="w-12 h-12 mx-auto text-red-500 mb-2" />
                <p className="text-red-500">{locationError}</p>
                <Button onClick={getCurrentLocation} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : currentLocation ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Latitude</p>
                    <p className="font-mono font-medium">
                      {currentLocation.coords.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Longitude</p>
                    <p className="font-mono font-medium">
                      {currentLocation.coords.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Signal className="w-4 h-4 text-green-500" />
                  <span className="text-sm">
                    Accuracy: {currentLocation.coords.accuracy.toFixed(0)}m
                  </span>
                </div>

                {/* Zone Selection for Indoor Tracking */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Where are you? (for indoor tracking)
                  </label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                  >
                    <option value="">Select a zone...</option>
                    {zones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={shareLocation}
                  className="w-full gradient-primary"
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Share My Location
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2 animate-bounce" />
                <p className="text-muted-foreground">Getting your location...</p>
                <Button onClick={getCurrentLocation} className="mt-4">
                  Get Location
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search family members..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Family Members Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Members ({filteredMembers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers && filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg font-bold">
                          {member.name.charAt(0)}
                        </div>
                        {member.lastLocation && (
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              getSignalStrength(member.lastLocation.accuracy) === "excellent"
                                ? "bg-green-500"
                                : getSignalStrength(member.lastLocation.accuracy) === "good"
                                ? "bg-green-400"
                                : getSignalStrength(member.lastLocation.accuracy) === "fair"
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.relation}
                        </p>
                      </div>
                    </div>

                    {member.lastLocation ? (
                      <div className="mt-3 space-y-2">
                        {member.lastLocation.zone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{member.lastLocation.zone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(member.lastLocation.updatedAt)}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {member.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              asChild
                            >
                              <a href={`tel:${member.phone}`}>
                                <Phone className="w-3 h-3 mr-1" />
                                Call
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              // Open in maps
                              const { latitude, longitude } = member.lastLocation!;
                              window.open(
                                `https://www.google.com/maps?q=${latitude},${longitude}`,
                                "_blank"
                              );
                            }}
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Navigate
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-center py-3">
                        <WifiOff className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">
                          Location not shared
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No family members found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Zones Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Venue Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {zones.map((zone) => {
                const membersInZone = familyMembers?.filter(
                  (m) => m.lastLocation?.zone === zone
                );
                return (
                  <div
                    key={zone}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      membersInZone && membersInZone.length > 0
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{zone}</p>
                    <p className="text-2xl font-bold">
                      {membersInZone?.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">members</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📍 Location Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Share your location when you arrive at the venue</li>
            <li>• Select your zone for easier indoor tracking</li>
            <li>• Location updates every 30 seconds when sharing</li>
            <li>• Use "Navigate" to get directions to family members</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

