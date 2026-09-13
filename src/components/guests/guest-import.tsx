"use client";

import { useRef, useState } from "react";
import { Contact, Upload, Users, Check, Loader2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db, type Guest } from "@/lib/db/schema";
import { useGuests } from "@/lib/db/hooks";
import { generateId } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { logInfo, logError } from "@/lib/diagnostics/logger";
import {
  isContactPickerSupported, pickFromContacts, parseGuestFile, dedupeGuests,
  type GuestDraft,
} from "@/lib/guests/import";

/**
 * Bulk guest entry.
 *
 * Nothing is written until the list has been reviewed on screen. A contacts
 * export is messy - businesses, duplicates, people who are not invited - and
 * importing three hundred rows straight into the guest list would be far harder
 * to undo than to check first.
 */
export function GuestImport({ weddingId, onDone }: { weddingId: string; onDone?: () => void }) {
  const existing = useGuests(weddingId);
  const [drafts, setDrafts] = useState<GuestDraft[] | null>(null);
  const [duplicates, setDuplicates] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState<Guest["side"]>("mutual");
  const [groupName, setGroupName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const supportsContacts = isContactPickerSupported();

  const review = (incoming: GuestDraft[], skippedCount: number) => {
    const { unique, duplicates: dupes } = dedupeGuests(
      incoming,
      (existing ?? []).map((g) => ({ name: g.name, phone: g.phone }))
    );
    setDrafts(unique);
    setDuplicates(dupes);
    setSkipped(skippedCount);
    void logInfo("guests", "reviewed an import", {
      offered: incoming.length, unique: unique.length, duplicates: dupes, unnamed: skippedCount,
    });

    if (unique.length === 0) {
      toast({
        title: dupes > 0 ? "Everyone in that list is already invited" : "Nobody to import",
        description: dupes > 0 ? `${dupes} duplicate${dupes === 1 ? "" : "s"} skipped.` : undefined,
      });
    }
  };

  const fromContacts = async () => {
    setBusy(true);
    try {
      review(await pickFromContacts(), 0);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not open contacts",
        description: error instanceof Error ? error.message : "Try importing a file instead.",
      });
    } finally {
      setBusy(false);
    }
  };

  const fromFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const { guests, skipped: skippedCount } = parseGuestFile(file.name, text);
      review(guests, skippedCount);
    } catch (error) {
      void logError("guests", "could not read the import file", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      toast({
        variant: "destructive",
        title: "Could not read that file",
        description: error instanceof Error ? error.message : "Use a .csv or .vcf file.",
      });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!drafts?.length) return;
    setBusy(true);
    try {
      const now = new Date();
      await db.guests.bulkAdd(
        drafts.map((d) => ({
          id: generateId(),
          weddingId,
          name: d.name,
          phone: d.phone,
          email: d.email,
          relation: d.relation,
          side: d.side ?? side,
          groupName: d.groupName || groupName || undefined,
          invitedTo: [],
          rsvpStatus: "pending" as const,
          plusOnes: d.plusOnes ?? 0,
          giftThanked: false,
          accommodationRequired: false,
          transportRequired: false,
          createdAt: now,
          updatedAt: now,
        })) as never[]
      );
      void logInfo("guests", "added guests", { count: drafts.length });
      toast({
        variant: "success",
        title: `${drafts.length} guest${drafts.length === 1 ? "" : "s"} added`,
        description: duplicates > 0 ? `${duplicates} already on the list were skipped.` : undefined,
      });
      setDrafts(null);
      setGroupName("");
      onDone?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not save the guests",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const removeDraft = (index: number) =>
    setDrafts((d) => (d ? d.filter((_, i) => i !== index) : d));

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Import guests
        </CardTitle>
        <CardDescription>
          Bring in a whole list at once instead of typing each name.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!drafts ? (
          <>
            {supportsContacts ? (
              <Button onClick={fromContacts} disabled={busy} className="w-full justify-start h-auto py-4">
                <Contact className="w-5 h-5 mr-3" />
                <span className="text-left">
                  <span className="block font-medium">Choose from my contacts</span>
                  <span className="block text-xs opacity-80">
                    Pick as many as you like - nothing is read until you choose
                  </span>
                </span>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Picking straight from contacts only works in Chrome on Android. On any other
                device, export your contacts and import the file below - every phone can do this.
              </p>
            )}

            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full justify-start h-auto py-4"
            >
              <Upload className="w-5 h-5 mr-3 text-green-600" />
              <span className="text-left">
                <span className="block font-medium">Import a file</span>
                <span className="block text-xs text-muted-foreground">
                  .csv from a spreadsheet, or .vcf exported from a phone
                </span>
              </span>
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.vcf,.txt,text/csv,text/vcard"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void fromFile(file);
                e.target.value = "";
              }}
            />

            {busy && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading...
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium">
                {drafts.length} to add
                {duplicates > 0 && (
                  <span className="text-muted-foreground font-normal"> · {duplicates} already invited</span>
                )}
                {skipped > 0 && (
                  <span className="text-muted-foreground font-normal"> · {skipped} unnamed</span>
                )}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setDrafts(null)}>
                Start over
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="importSide">Side (for everyone in this batch)</Label>
                <select
                  id="importSide"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3"
                  value={side}
                  onChange={(e) => setSide(e.target.value as Guest["side"])}
                >
                  <option value="bride">Bride&apos;s side</option>
                  <option value="groom">Groom&apos;s side</option>
                  <option value="mutual">Both</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importGroup">Family / group (optional)</Label>
                <Input
                  id="importGroup"
                  placeholder="e.g. Ongole Family"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {drafts.map((d, i) => (
                <div key={`${d.name}-${i}`} className="flex items-center gap-3 p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    {(d.phone || d.email) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[d.phone, d.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeDraft(i)}
                    aria-label={`Do not invite ${d.name}`}
                    className="text-xs text-muted-foreground hover:text-red-500 px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Check the list before adding. Contact exports usually include businesses and people
              you did not mean to invite.
            </p>

            <Button onClick={save} disabled={busy || drafts.length === 0} className="w-full">
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Add {drafts.length} guest{drafts.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
