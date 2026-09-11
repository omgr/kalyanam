"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import QRCode from "qrcode";
import {
  Users, Wifi, WifiOff, Loader2, Copy, Check, AlertCircle, Radio, Download, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFamilySync } from "@/hooks/use-family-sync";
import { createMergeFile, applyMergeFile } from "@/lib/sync/crdt";
import { toast } from "@/hooks/use-toast";

export function FamilySyncPanel({ weddingId }: { weddingId: string }) {
  const sync = useFamilySync(weddingId);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sync.invite) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(sync.invite, { width: 220, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [sync.invite]);

  const states: Record<string, { text: string; icon: ReactElement; tone: string }> = {
    idle: { text: "Off", icon: <WifiOff className="w-4 h-4" />, tone: "text-muted-foreground" },
    connecting: { text: "Connecting...", icon: <Loader2 className="w-4 h-4 animate-spin" />, tone: "text-blue-500" },
    waiting: { text: "Waiting for family", icon: <Radio className="w-4 h-4" />, tone: "text-yellow-600" },
    connected: {
      text: `${sync.peerCount} device${sync.peerCount === 1 ? "" : "s"} connected`,
      icon: <Wifi className="w-4 h-4" />,
      tone: "text-green-600",
    },
    unsupported: { text: "Not supported here", icon: <AlertCircle className="w-4 h-4" />, tone: "text-red-500" },
    error: { text: "Could not connect", icon: <AlertCircle className="w-4 h-4" />, tone: "text-red-500" },
  };
  const state = states[sync.status] ?? states.idle;

  const copyInvite = async () => {
    if (!sync.invite) return;
    await navigator.clipboard.writeText(sync.invite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    try {
      const blob = await createMergeFile(weddingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kalyanam-merge-${new Date().toISOString().split("T")[0]}.kmerge`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        variant: "success",
        title: "Merge file saved",
        description: "Send it to family however you like - it merges, it never overwrites.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not create the merge file",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleImport = async (file: File) => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await applyMergeFile(weddingId, bytes);
      toast({
        variant: "success",
        title: "Changes merged",
        description: "Their edits and yours have been combined.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not merge that file",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Family Sync
          </span>
          <span className={`flex items-center gap-1.5 text-sm font-normal ${state.tone}`}>
            {state.icon}
            {state.text}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Everyone helping with the wedding sees the same plan. Changes merge automatically - if
          two people edit at the same time, both edits survive. Your data still never touches a
          server; devices talk directly to each other.
        </p>

        {!sync.enabled ? (
          <div className="space-y-4">
            <Button onClick={sync.enable} className="w-full">
              <Wifi className="w-4 h-4 mr-2" />
              Turn on Family Sync
            </Button>
            <div className="space-y-2">
              <p className="text-sm font-medium">Or join a wedding you were invited to</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste invite code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!joinCode.trim()}
                  onClick={async () => {
                    if (await sync.joinWith(joinCode)) {
                      setJoinCode("");
                      window.location.reload();
                    }
                  }}
                >
                  Join
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium">Invite family to this wedding</p>
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt="QR code containing the invite for this wedding"
                  className="mx-auto rounded-lg border border-border bg-white p-2"
                />
              )}
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={sync.invite ?? ""}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" size="icon" onClick={copyInvite} aria-label="Copy invite code">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this code can read and edit the wedding, so share it only with family.
              </p>
            </div>

            {sync.status === "waiting" && (
              <p className="text-xs text-muted-foreground border-l-2 border-yellow-500 pl-3">
                You are in the room. Devices connect when someone else has Kalyanam open at the
                same time. If nobody is around right now, use a merge file below.
              </p>
            )}

            <Button variant="outline" onClick={sync.disable} className="w-full">
              <WifiOff className="w-4 h-4 mr-2" />
              Turn off Family Sync
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium">Merge file</p>
          <p className="text-xs text-muted-foreground">
            For when two devices are never online together. Unlike a backup, a merge file combines
            both sides instead of replacing one - and applying it twice is harmless.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Apply
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".kmerge"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {sync.error && (
          <p className="text-sm text-red-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {sync.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
