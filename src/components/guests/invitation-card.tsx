"use client";

import { useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon, Upload, Send, Check, Mail, MessageCircle, Info, Trash2,
  Share2, Copy, Megaphone, Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db/schema";
import { useGuests, useWedding } from "@/lib/db/hooks";
import { toast } from "@/hooks/use-toast";
import {
  readInvitationImage, defaultInvitationMessage, whatsAppLink, mailtoLink,
  groupForSending, isReachable, type InvitationCard as Card_,
} from "@/lib/guests/invitation";
import {
  shareInvitation, canShare, broadcastBatches, bccMailtoLinks,
  numbersForPasting, BROADCAST_LIST_LIMIT,
} from "@/lib/guests/bulk-send";

const IMAGE_KEY = "kalyanam_invitation_card";
const MESSAGE_KEY = "kalyanam_invitation_message";
const SENT_KEY = "kalyanam_invitation_sent";

function loadSent(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

/**
 * Upload the invitation card once, then send it round.
 *
 * A browser cannot send three hundred messages by itself - there is no API for
 * it, and the services that can need a server and charge per message. What it
 * can do is open each message pre-filled, so sending becomes one tap per
 * household rather than one typing job per guest, and the app remembers who has
 * already been done.
 */
export function InvitationCard({ weddingId }: { weddingId: string }) {
  const wedding = useWedding(weddingId);
  const guests = useGuests(weddingId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [card, setCard] = useState<Card_ | null>(() => {
    try {
      const raw = localStorage.getItem(IMAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [message, setMessage] = useState<string>(
    () => localStorage.getItem(MESSAGE_KEY) ?? ""
  );
  const [sent, setSent] = useState<Set<string>>(() => loadSent());
  const [copiedBatch, setCopiedBatch] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  const effectiveMessage = message || defaultInvitationMessage(wedding);
  const households = useMemo(() => groupForSending(guests ?? []), [guests]);
  const reachable = households.filter((h) => h.primary && isReachable(h.primary));
  const unreachable = households.length - reachable.length;
  const batches = useMemo(() => broadcastBatches(guests ?? []), [guests]);
  const emailLinks = useMemo(
    () => bccMailtoLinks(guests ?? [], `${wedding?.name ?? "Wedding"} - you are invited`, effectiveMessage),
    [guests, wedding, effectiveMessage]
  );

  const upload = async (file: File) => {
    try {
      const next = await readInvitationImage(file);
      localStorage.setItem(IMAGE_KEY, JSON.stringify(next));
      setCard(next);
      toast({ variant: "success", title: "Invitation card saved" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not use that image",
        description: error instanceof Error ? error.message : "Try a different file.",
      });
    }
  };

  const markSent = (key: string) => {
    const next = new Set(sent);
    next.add(key);
    setSent(next);
    localStorage.setItem(SENT_KEY, JSON.stringify([...next]));
  };

  const saveMessage = (value: string) => {
    setMessage(value);
    localStorage.setItem(MESSAGE_KEY, value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Invitation card
        </CardTitle>
        <CardDescription>
          Upload your card once, then send it to each household with a single tap.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {card ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt="Your wedding invitation card"
              className="w-full max-w-xs mx-auto rounded-lg border border-border"
            />
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem(IMAGE_KEY);
                  setCard(null);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="w-full justify-start h-auto py-4"
          >
            <Upload className="w-5 h-5 mr-3 text-primary" />
            <span className="text-left">
              <span className="block font-medium">Upload your invitation card</span>
              <span className="block text-xs text-muted-foreground">
                A JPG or PNG, under 3MB
              </span>
            </span>
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />

        <div className="space-y-2">
          <Label htmlFor="inviteMessage">Message</Label>
          <textarea
            id="inviteMessage"
            className="w-full min-h-[130px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={effectiveMessage}
            onChange={(e) => saveMessage(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Write <code className="font-mono">{"{name}"}</code> anywhere to address each guest by name.
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Tapping Send opens WhatsApp with the number and wording ready. <strong>Attach the
            card image yourself</strong> before sending - no website is allowed to attach a file to
            your messages for you. Sending happens from your own phone, so guests see it come
            from you.
          </span>
        </div>

        {/* ---------------- send to everyone at once ---------------- */}
        <div className="space-y-3 rounded-lg border border-primary/40 p-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Users2 className="w-4 h-4 text-primary" />
            Send to everyone at once
          </p>

          {canShare() && (
            <div className="space-y-1.5">
              <Button
                className="w-full"
                disabled={sharing}
                onClick={async () => {
                  setSharing(true);
                  try {
                    const result = await shareInvitation({
                      message: effectiveMessage,
                      card,
                      title: wedding?.name,
                    });
                    if (result === "unsupported") {
                      toast({
                        variant: "destructive",
                        title: "Sharing is not available in this browser",
                        description: "Use a broadcast list or email below instead.",
                      });
                    }
                  } catch {
                    toast({ variant: "destructive", title: "Could not open the share sheet" });
                  } finally {
                    setSharing(false);
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share card to WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground">
                Opens your share sheet with the card and wording attached. Pick WhatsApp, then
                <strong> tick as many chats as you like</strong> before sending - that multi-select
                is WhatsApp&apos;s own, so there is no limit imposed by us.
              </p>
            </div>
          )}

          {batches.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                Or make a WhatsApp broadcast list
              </p>
              <p className="text-xs text-muted-foreground">
                WhatsApp → ⋮ → New broadcast. Everyone gets a normal private message, not a group.
                Up to {BROADCAST_LIST_LIMIT} per list, and it only reaches people who have your
                number saved - fine for family.
              </p>
              <div className="flex flex-wrap gap-2">
                {batches.map((batch, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(numbersForPasting(batch));
                      setCopiedBatch(i);
                      setTimeout(() => setCopiedBatch(null), 2000);
                    }}
                  >
                    {copiedBatch === i ? (
                      <Check className="w-4 h-4 mr-1.5 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1.5" />
                    )}
                    {batches.length > 1 ? `List ${i + 1}` : "Copy numbers"} ({batch.length})
                  </Button>
                ))}
              </div>
            </div>
          )}

          {emailLinks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Or email everyone at once
              </p>
              <div className="flex flex-wrap gap-2">
                {emailLinks.map((href, i) => (
                  <a key={i} href={href}>
                    <Button variant="outline" size="sm">
                      <Mail className="w-4 h-4 mr-1.5" />
                      {emailLinks.length > 1 ? `Batch ${i + 1}` : "Open email"}
                    </Button>
                  </a>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Everyone goes in BCC, so no guest sees another&apos;s address. Attach the card
                before sending.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Or one at a time · {reachable.length} household{reachable.length === 1 ? "" : "s"}
            {unreachable > 0 && (
              <span className="font-normal text-muted-foreground">
                {" "}· {unreachable} with no phone or email
              </span>
            )}
          </p>

          {reachable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add some guests with phone numbers first.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {reachable.map((household) => {
                const primary = household.primary!;
                const wa = whatsAppLink(primary, effectiveMessage);
                const mail = mailtoLink(primary, `Wedding invitation`, effectiveMessage);
                const done = sent.has(household.key);

                return (
                  <div key={household.key} className="flex items-center gap-3 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {household.label}
                        {household.members.length > 1 && (
                          <span className="text-muted-foreground font-normal">
                            {" "}· {household.members.length} people
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        to {primary.name} · {primary.phone || primary.email}
                      </p>
                    </div>

                    {done && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}

                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => markSent(household.key)}>
                        <Button variant={done ? "outline" : "default"} size="sm">
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          {done ? "Again" : "Send"}
                        </Button>
                      </a>
                    ) : mail ? (
                      <a href={mail} onClick={() => markSent(household.key)}>
                        <Button variant={done ? "outline" : "default"} size="sm">
                          <Mail className="w-4 h-4 mr-1.5" />
                          {done ? "Again" : "Email"}
                        </Button>
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {sent.size > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              {sent.size} of {reachable.length} marked as sent from this device
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
