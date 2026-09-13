"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Check,
  X,
  HelpCircle,
  Download,
  Upload,
  UserPlus,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useGuests, useWedding, useGuestStats } from "@/lib/db/hooks";
import { db, Guest } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { GuestImport } from "@/components/guests/guest-import";
import { InvitationCard } from "@/components/guests/invitation-card";

export default function GuestsPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSide, setFilterSide] = useState<string>("all");
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: "",
    phone: "",
    email: "",
    relation: "",
    side: "bride" as Guest["side"],
    groupName: "",
    plusOnes: 0,
    dietaryRestrictions: "",
    accommodationRequired: false,
    transportRequired: false,
  });

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(storedWeddingId);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const guests = useGuests(weddingId ?? undefined);
  const stats = useGuestStats(weddingId ?? undefined);

  const filteredGuests = guests?.filter((guest) => {
    const matchesSearch =
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.relation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || guest.rsvpStatus === filterStatus;
    const matchesSide = filterSide === "all" || guest.side === filterSide;
    return matchesSearch && matchesStatus && matchesSide;
  });

  const handleAddGuest = async () => {
    if (!weddingId || !newGuest.name) return;

    await db.guests.add({
      id: generateId(),
      weddingId,
      name: newGuest.name,
      phone: newGuest.phone || undefined,
      email: newGuest.email || undefined,
      relation: newGuest.relation || undefined,
      side: newGuest.side,
      groupName: newGuest.groupName || undefined,
      invitedTo: [],
      rsvpStatus: "pending",
      plusOnes: newGuest.plusOnes,
      dietaryRestrictions: newGuest.dietaryRestrictions || undefined,
      giftThanked: false,
      accommodationRequired: newGuest.accommodationRequired,
      transportRequired: newGuest.transportRequired,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setNewGuest({
      name: "",
      phone: "",
      email: "",
      relation: "",
      side: "bride",
      groupName: "",
      plusOnes: 0,
      dietaryRestrictions: "",
      accommodationRequired: false,
      transportRequired: false,
    });
    setIsAddingGuest(false);
  };

  const handleUpdateRSVP = async (guestId: string, status: Guest["rsvpStatus"]) => {
    await db.guests.update(guestId, {
      rsvpStatus: status,
      rsvpDate: new Date(),
      updatedAt: new Date(),
    });
  };

  const getStatusBadge = (status: Guest["rsvpStatus"]) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      maybe: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return styles[status];
  };

  const getStatusIcon = (status: Guest["rsvpStatus"]) => {
    switch (status) {
      case "confirmed":
        return <Check className="w-4 h-4" />;
      case "declined":
        return <X className="w-4 h-4" />;
      case "maybe":
        return <HelpCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

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
              <Users className="w-8 h-8 text-primary" />
              Guest List
            </h1>
            <p className="text-muted-foreground">
              {guests?.length || 0} guests invited
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowInvitation((v) => !v)}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Invitation
            </Button>
            <Button variant="outline" onClick={() => setIsImporting((v) => !v)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button onClick={() => setIsAddingGuest(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Guest
            </Button>
          </div>
        </div>

        {isImporting && (
          <GuestImport weddingId={weddingId} onDone={() => setIsImporting(false)} />
        )}

        {showInvitation && <InvitationCard weddingId={weddingId} />}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Invited</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {stats.confirmed}
                </p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
                <p className="text-sm text-muted-foreground">Declined</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {stats.confirmedWithPlusOnes}
                </p>
                <p className="text-sm text-muted-foreground">Attending</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
              <option value="maybe">Maybe</option>
            </select>
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              value={filterSide}
              onChange={(e) => setFilterSide(e.target.value)}
            >
              <option value="all">All Sides</option>
              <option value="bride">{wedding.brideName}'s Side</option>
              <option value="groom">{wedding.groomName}'s Side</option>
              <option value="mutual">Mutual</option>
            </select>
          </div>
        </div>

        {/* Add Guest Form */}
        {isAddingGuest && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Guest
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestName">Name *</Label>
                  <Input
                    id="guestName"
                    placeholder="e.g., Ramesh Kumar"
                    value={newGuest.name}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newGuest.phone}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={newGuest.email}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Side</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newGuest.side}
                    onChange={(e) =>
                      setNewGuest({
                        ...newGuest,
                        side: e.target.value as Guest["side"],
                      })
                    }
                  >
                    <option value="bride">{wedding.brideName}'s Side</option>
                    <option value="groom">{wedding.groomName}'s Side</option>
                    <option value="mutual">Mutual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relation">Relation</Label>
                  <Input
                    id="relation"
                    placeholder="e.g., Uncle"
                    value={newGuest.relation}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, relation: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group">Family Group</Label>
                  <Input
                    id="group"
                    placeholder="e.g., Kumar Family"
                    value={newGuest.groupName}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, groupName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plusOnes">Plus Ones</Label>
                  <Input
                    id="plusOnes"
                    type="number"
                    min="0"
                    value={newGuest.plusOnes}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, plusOnes: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAddingGuest(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddGuest} disabled={!newGuest.name}>
                  Add Guest
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Guest</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-left p-4 font-medium">Side</th>
                    <th className="text-left p-4 font-medium">RSVP</th>
                    <th className="text-center p-4 font-medium">Count</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests && filteredGuests.length > 0 ? (
                    filteredGuests.map((guest, index) => (
                      <motion.tr
                        key={guest.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{guest.name}</p>
                            {guest.relation && (
                              <p className="text-sm text-muted-foreground">
                                {guest.relation}
                              </p>
                            )}
                            {guest.groupName && (
                              <p className="text-xs text-muted-foreground">
                                {guest.groupName}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {guest.phone && (
                              <a
                                href={`tel:${guest.phone}`}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                              >
                                <Phone className="w-3 h-3" />
                                {guest.phone}
                              </a>
                            )}
                            {guest.email && (
                              <a
                                href={`mailto:${guest.email}`}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                              >
                                <Mail className="w-3 h-3" />
                                {guest.email}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              guest.side === "bride"
                                ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400"
                                : guest.side === "groom"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}
                          >
                            {guest.side === "bride"
                              ? wedding.brideName
                              : guest.side === "groom"
                              ? wedding.groomName
                              : "Mutual"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusBadge(
                              guest.rsvpStatus
                            )}`}
                          >
                            {getStatusIcon(guest.rsvpStatus)}
                            {guest.rsvpStatus}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-medium">
                            {1 + (guest.plusOnes || 0)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => handleUpdateRSVP(guest.id, "confirmed")}
                              title="Mark Confirmed"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => handleUpdateRSVP(guest.id, "declined")}
                              title="Mark Declined"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No guests found</p>
                        <Button
                          variant="link"
                          className="mt-2"
                          onClick={() => setIsAddingGuest(true)}
                        >
                          Add your first guest
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

