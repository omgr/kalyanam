"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Crown,
  Shield,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useFamilyMembers, useWedding } from "@/lib/db/hooks";
import { db, FamilyMember } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";

export default function FamilyPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    relation: "",
    side: "bride" as "bride" | "groom" | "mutual",
    phone: "",
    email: "",
    role: "helper" as FamilyMember["role"],
    canEdit: false,
    canViewBudget: false,
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
  const familyMembers = useFamilyMembers(weddingId ?? undefined);

  const filteredMembers = familyMembers?.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.relation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bridesSide = filteredMembers?.filter((m) => m.side === "bride");
  const groomsSide = filteredMembers?.filter((m) => m.side === "groom");
  const mutualSide = filteredMembers?.filter((m) => m.side === "mutual");

  const handleAddMember = async () => {
    if (!weddingId || !newMember.name) return;

    await db.familyMembers.add({
      id: generateId(),
      weddingId,
      name: newMember.name,
      relation: newMember.relation,
      side: newMember.side,
      phone: newMember.phone || undefined,
      email: newMember.email || undefined,
      role: newMember.role,
      canEdit: newMember.canEdit,
      canViewBudget: newMember.canViewBudget,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setNewMember({
      name: "",
      relation: "",
      side: "bride",
      phone: "",
      email: "",
      role: "helper",
      canEdit: false,
      canViewBudget: false,
    });
    setIsAddingMember(false);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (confirm("Are you sure you want to remove this family member?")) {
      await db.familyMembers.delete(memberId);
    }
  };

  const getRoleIcon = (role: FamilyMember["role"]) => {
    switch (role) {
      case "primary":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "secondary":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: FamilyMember["role"]) => {
    const colors = {
      primary: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      secondary: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      helper: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
    };
    return colors[role];
  };

  const MemberCard = ({ member }: { member: FamilyMember }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg font-bold">
            {member.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{member.name}</h3>
              {getRoleIcon(member.role)}
            </div>
            <p className="text-sm text-muted-foreground">{member.relation}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(member.role)}`}>
              {member.role}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            onClick={() => handleDeleteMember(member.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {(member.phone || member.email) && (
        <div className="mt-3 pt-3 border-t space-y-1">
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <Phone className="w-4 h-4" />
              {member.phone}
            </a>
          )}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <Mail className="w-4 h-4" />
              {member.email}
            </a>
          )}
        </div>
      )}

      {member.lastLocation && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          Last seen: {member.lastLocation.venue || member.lastLocation.zone || "Unknown"}
        </div>
      )}
    </motion.div>
  );

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
              Family Members
            </h1>
            <p className="text-muted-foreground">
              Manage your wedding planning team
            </p>
          </div>
          <Button onClick={() => setIsAddingMember(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Family Member
          </Button>
        </div>

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

        {/* Add Member Modal */}
        {isAddingMember && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Family Member
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberName">Name *</Label>
                  <Input
                    id="memberName"
                    placeholder="e.g., Lakshmi Devi"
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relation">Relation</Label>
                  <Input
                    id="relation"
                    placeholder="e.g., Bride's Mother"
                    value={newMember.relation}
                    onChange={(e) =>
                      setNewMember({ ...newMember, relation: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Side</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newMember.side}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        side: e.target.value as "bride" | "groom" | "mutual",
                      })
                    }
                  >
                    <option value="bride">Bride's Side</option>
                    <option value="groom">Groom's Side</option>
                    <option value="mutual">Mutual</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newMember.phone}
                    onChange={(e) =>
                      setNewMember({ ...newMember, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newMember.role}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        role: e.target.value as FamilyMember["role"],
                      })
                    }
                  >
                    <option value="primary">Primary (Full Access)</option>
                    <option value="secondary">Secondary (Limited Access)</option>
                    <option value="helper">Helper (View Only)</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMember.canEdit}
                      onChange={(e) =>
                        setNewMember({ ...newMember, canEdit: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">Can Edit</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newMember.canViewBudget}
                      onChange={(e) =>
                        setNewMember({ ...newMember, canViewBudget: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">View Budget</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAddingMember(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={!newMember.name}>
                  Add Member
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bride's Side */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                {wedding.brideName}'s Side ({bridesSide?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bridesSide && bridesSide.length > 0 ? (
                bridesSide.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No family members added yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Groom's Side */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                {wedding.groomName}'s Side ({groomsSide?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groomsSide && groomsSide.length > 0 ? (
                groomsSide.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No family members added yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mutual */}
        {mutualSide && mutualSide.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                Mutual / Planners ({mutualSide.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {mutualSide.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

