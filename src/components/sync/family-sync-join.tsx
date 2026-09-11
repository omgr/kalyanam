"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, Check, AlertCircle } from "lucide-react";
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
  const [state, setState] = useState<JoinState>("idle");
  const [message, setMessage] = useState("");
  const handleRef = useRef<FamilySyncHandle | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const join = async () => {
    const invite = decodeInvite(code);
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
          <Label htmlFor="inviteCode">Invite code</Label>
          <Input
            id="inviteCode"
            placeholder="Paste the code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-xs"
            disabled={busy || state === "done"}
          />
        </div>

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
          <Button onClick={join} className="flex-1" disabled={!code.trim() || busy || state === "done"}>
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
