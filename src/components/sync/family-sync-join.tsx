"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, Check, AlertCircle, Camera, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db/schema";
import { activateWedding } from "@/lib/session";
import {
  decodeInvite,
  storeRoomSecret,
  startFamilySync,
  type FamilySyncHandle,
} from "@/lib/sync/crdt";
import { startCamera, stopCamera, scanQRCode } from "@/lib/sync/qr-code";
import { setDeviceName } from "@/lib/diagnostics/logger";
import { setDeviceMemberId } from "@/lib/session";
import { generateId } from "@/lib/utils";
import { setFamilySyncEnabled } from "@/hooks/use-family-sync";

type JoinState = "idle" | "connecting" | "receiving" | "done" | "error";

/**
 * Joining a wedding on a device that has none.
 *
 * This lives on the login screen rather than the sync screen because every
 * screen behind the planner refuses to render without a wedding in the local
 * database - which a joining device does not have yet.
 */
export function FamilySyncJoin({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [yourName, setYourName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [state, setState] = useState<JoinState>("idle");
  const [message, setMessage] = useState("");
  const handleRef = useRef<FamilySyncHandle | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);

  const endScanning = useCallback(() => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    if (streamRef.current) stopCamera(streamRef.current);
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      endScanning();
    };
  }, [endScanning]);

  /**
   * Scan the QR shown on the other phone.
   *
   * The invite was already offered as a QR code with nothing anywhere able to
   * read one, which made it decoration. Typing a hundred-character code on a
   * phone is not a reasonable alternative.
   */
  const beginScanning = async () => {
    setScanError(null);
    setScanning(true);
    try {
      const stream = await startCamera(videoRef.current!);
      streamRef.current = stream;
      stopScanRef.current = await scanQRCode(
        videoRef.current!,
        (data) => {
          endScanning();
          setCode(data);
          void join(data);
        },
        () => {
          /* keep scanning through transient frame errors */
        }
      );
    } catch {
      setScanning(false);
      setScanError(
        "Could not open the camera. Allow camera access, or paste the code instead."
      );
    }
  };

  const join = async (scanned?: string) => {
    const invite = decodeInvite(scanned ?? code);
    if (!invite) {
      setState("error");
      setMessage("That invite code was not recognised. Check you copied all of it.");
      return;
    }

    setState("connecting");
    setMessage("Looking for the other device...");

    try {
      storeRoomSecret(invite.weddingId, invite.secret);
      setFamilySyncEnabled(true);

      // Naming the device here means the diagnostic log is identifiable from
      // the first entry, rather than after someone thinks to set it.
      if (yourName.trim()) setDeviceName(yourName.trim());

      handleRef.current = await startFamilySync(invite.weddingId, {
        secret: invite.secret,
        onStatus: (status, peers) => {
          if (status === "connected") {
            setState("receiving");
            setMessage(`Connected to ${peers} device${peers === 1 ? "" : "s"}. Receiving the wedding...`);
          } else if (status === "waiting") {
            setMessage(
              "In the room, but nobody else is here yet. Ask them to open Kalyanam on their device."
            );
          } else if (status === "error") {
            setState("error");
            setMessage("Could not reach the other device. Try a merge file instead.");
          }
        },
        onError: (error) => {
          setState("error");
          setMessage(error.message);
        },
      });

      // The wedding arrives asynchronously once a peer connects.
      pollRef.current = setInterval(async () => {
        const wedding = await db.weddings.get(invite.weddingId);
        if (!wedding) return;

        if (pollRef.current) clearInterval(pollRef.current);
        await activateWedding(invite.weddingId);

        // Make this person a family member straight away, so the very first
        // message they send is attributed to them rather than to whoever the
        // primary organiser happens to be.
        if (yourName.trim()) {
          const members = await db.familyMembers
            .where("weddingId")
            .equals(invite.weddingId)
            .toArray();
          const existing = members.find(
            (m) => m.name.trim().toLowerCase() === yourName.trim().toLowerCase()
          );

          if (existing) {
            setDeviceMemberId(existing.id);
          } else {
            const id = generateId();
            await db.familyMembers.add({
              id,
              weddingId: invite.weddingId,
              name: yourName.trim(),
              relation: "Family",
              side: "mutual",
              role: "helper",
              canEdit: true,
              canViewBudget: false,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as never);
            setDeviceMemberId(id);
          }
        }

        setState("done");
        setMessage(`Joined "${wedding.name}".`);
        setTimeout(() => router.push("/dashboard"), 900);
      }, 800);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not join.");
    }
  };

  const busy = state === "connecting" || state === "receiving";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Join with an Invite
        </CardTitle>
        <CardDescription>
          Paste the invite code from the device that already has the wedding. Both devices need
          Kalyanam open at the same time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="yourName">Your name</Label>
          <Input
            id="yourName"
            placeholder="e.g. Madan"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            disabled={busy || state === "done"}
          />
          <p className="text-xs text-muted-foreground">
            Shown to the family on messages, and used to name this device in any
            diagnostic log.
          </p>
        </div>

        {scanning ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="w-full rounded-lg border border-border bg-black aspect-square object-cover"
              playsInline
              muted
            />
            <Button variant="outline" className="w-full" onClick={endScanning}>
              <X className="w-4 h-4 mr-2" />
              Stop scanning
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Point the camera at the QR code on the other phone.
            </p>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={beginScanning}
              disabled={busy || state === "done"}
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan the QR code
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Paste the invite code
              </Label>
              <Input
                id="inviteCode"
                placeholder="Paste the code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-xs"
                disabled={busy || state === "done"}
              />
            </div>
          </>
        )}

        {scanError && (
          <p className="text-sm text-red-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {scanError}
          </p>
        )}

        {message && (
          <p
            className={`text-sm flex items-start gap-2 ${
              state === "error" ? "text-red-500" : state === "done" ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {state === "error" ? (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : state === "done" ? (
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />
            )}
            {message}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => join()} className="flex-1" disabled={!code.trim() || busy || state === "done"}>
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
