"use client";

import { useState } from "react";
import { UserCircle, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db/schema";
import { useFamilyMembers } from "@/lib/db/hooks";
import { setDeviceMemberId } from "@/lib/session";
import { generateId } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

/**
 * Asks which family member is holding this device.
 *
 * Without this every device shares the same recovered user id, so location
 * sharing and message authorship would all be attributed to one person. This is
 * the only place that binding is made.
 */
export function WhoAreYou({
  weddingId,
  onChosen,
}: {
  weddingId: string;
  onChosen?: (memberId: string) => void;
}) {
  const members = useFamilyMembers(weddingId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [side, setSide] = useState<"bride" | "groom" | "mutual">("mutual");

  const choose = (memberId: string) => {
    setDeviceMemberId(memberId);
    onChosen?.(memberId);
  };

  const addMe = async () => {
    if (!name.trim()) return;
    const id = generateId();
    try {
      await db.familyMembers.add({
        id,
        weddingId,
        name: name.trim(),
        relation: relation.trim() || "Family",
        side,
        role: "helper",
        canEdit: true,
        canViewBudget: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      choose(id);
      toast({ variant: "success", title: `Welcome, ${name.trim()}` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not add you",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-primary" />
          Who is using this device?
        </CardTitle>
        <CardDescription>
          Pick yourself from the family list. This is how everyone else sees who sent a message
          and who is where during the events.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {members && members.length > 0 && (
          <div className="space-y-2">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => choose(member.id)}
                className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.relation}</p>
                </div>
                <Check className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {adding ? (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="whoName">Your name *</Label>
              <Input id="whoName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Madan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whoRelation">Relation</Label>
              <Input
                id="whoRelation"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Bride's Brother"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whoSide">Side</Label>
              <select
                id="whoSide"
                className="w-full h-10 rounded-lg border border-input bg-background px-3"
                value={side}
                onChange={(e) => setSide(e.target.value as "bride" | "groom" | "mutual")}
              >
                <option value="bride">Bride&apos;s side</option>
                <option value="groom">Groom&apos;s side</option>
                <option value="mutual">Both</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={addMe} disabled={!name.trim()}>
                That&apos;s me
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-2" />
            I&apos;m not on the list
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
