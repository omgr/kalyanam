"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wifi, WifiOff, Loader2, Radio, AlertCircle } from "lucide-react";
import { useFamilySync } from "@/hooks/use-family-sync";

/**
 * Keeps family sync running wherever you are in the app, and shows its state.
 *
 * Mounted in the dashboard shell rather than on the sync page, because an edit
 * made on the budget screen should reach the rest of the family without anyone
 * having to sit on the sync page for it to happen.
 */
export function FamilySyncIndicator() {
  const [weddingId, setWeddingId] = useState<string | null>(null);

  useEffect(() => {
    setWeddingId(localStorage.getItem("kalyanam_wedding_id"));
  }, []);

  const sync = useFamilySync(weddingId);

  if (!sync.enabled) return null;

  const view = {
    idle: { icon: <WifiOff className="h-4 w-4" />, text: "Sync off", tone: "text-muted-foreground" },
    connecting: { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: "Connecting", tone: "text-blue-500" },
    waiting: { icon: <Radio className="h-4 w-4" />, text: "Waiting for family", tone: "text-yellow-600" },
    connected: {
      icon: <Wifi className="h-4 w-4" />,
      text: `${sync.peerCount} device${sync.peerCount === 1 ? "" : "s"}`,
      tone: "text-green-600",
    },
    unsupported: { icon: <AlertCircle className="h-4 w-4" />, text: "Sync unavailable", tone: "text-red-500" },
    error: { icon: <AlertCircle className="h-4 w-4" />, text: "Sync problem", tone: "text-red-500" },
  }[sync.status];

  return (
    <Link
      href="/sync"
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-muted ${view.tone}`}
      title="Family sync status"
    >
      {view.icon}
      <span className="truncate">{view.text}</span>
    </Link>
  );
}
