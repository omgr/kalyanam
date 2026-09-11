"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startFamilySync,
  getActiveSync,
  decodeInvite,
  storeRoomSecret,
  type SyncStatus,
  type FamilySyncHandle,
} from "@/lib/sync/crdt";

const ENABLED_KEY = "kalyanam_family_sync_enabled";

export function isFamilySyncEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "true";
}

export function setFamilySyncEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

export interface FamilySyncState {
  enabled: boolean;
  status: SyncStatus;
  peerCount: number;
  invite: string | null;
  error: string | null;
  /** Plain-language explanation of the last failure. */
  diagnosis: string | null;
  /** When this device last received anything from a peer. */
  lastSyncedAt: Date | null;
  enable: () => Promise<void>;
  disable: () => void;
  retry: () => Promise<void>;
  joinWith: (code: string) => Promise<boolean>;
}

/**
 * Drives family sync for the active wedding.
 *
 * Sync is opt-in and off until someone turns it on, because it is the only
 * part of Kalyanam that talks to the network at all.
 */
export function useFamilySync(weddingId: string | null | undefined): FamilySyncState {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [peerCount, setPeerCount] = useState(0);
  const [invite, setInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const handleRef = useRef<FamilySyncHandle | null>(null);

  const begin = useCallback(
    async (id: string, secret?: string) => {
      setError(null);
      setDiagnosis(null);
      setStatus("connecting");
      try {
        const handle = await startFamilySync(id, {
          secret,
          onStatus: (s, peers) => {
            setStatus(s);
            setPeerCount(peers);
            if (s === "connected") setDiagnosis(null);
          },
          onError: (e) => setError(e.message),
          onDiagnosis: setDiagnosis,
          onSynced: setLastSyncedAt,
        });
        handleRef.current = handle;
        setInvite(handle.invite());
        setStatus(handle.status());
        setPeerCount(handle.peerCount());
        setDiagnosis(handle.diagnosis());
        setLastSyncedAt(handle.lastSyncedAt());
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Could not start sync");
      }
    },
    []
  );

  useEffect(() => {
    if (!weddingId) return;
    const on = isFamilySyncEnabled();
    setEnabled(on);
    if (!on) return;

    const existing = getActiveSync();
    if (existing?.weddingId === weddingId) {
      handleRef.current = existing;
      setInvite(existing.invite());
      setStatus(existing.status());
      setPeerCount(existing.peerCount());
      setDiagnosis(existing.diagnosis());
      setLastSyncedAt(existing.lastSyncedAt());
      return;
    }
    void begin(weddingId);
  }, [weddingId, begin]);

  const enable = useCallback(async () => {
    if (!weddingId) return;
    setFamilySyncEnabled(true);
    setEnabled(true);
    await begin(weddingId);
  }, [weddingId, begin]);

  const disable = useCallback(() => {
    setFamilySyncEnabled(false);
    setEnabled(false);
    handleRef.current?.stop();
    handleRef.current = null;
    setStatus("idle");
    setPeerCount(0);
    setInvite(null);
    setDiagnosis(null);
    setLastSyncedAt(null);
  }, []);

  const retry = useCallback(async () => {
    setDiagnosis(null);
    setError(null);
    await handleRef.current?.retry();
  }, []);

  const joinWith = useCallback(
    async (code: string) => {
      const parsed = decodeInvite(code);
      if (!parsed) {
        setError("That invite code was not recognised.");
        return false;
      }
      // Adopt the inviting device's room, then connect to it.
      storeRoomSecret(parsed.weddingId, parsed.secret);
      localStorage.setItem("kalyanam_wedding_id", parsed.weddingId);
      setFamilySyncEnabled(true);
      setEnabled(true);
      await begin(parsed.weddingId, parsed.secret);
      return true;
    },
    [begin]
  );

  return {
    enabled, status, peerCount, invite, error, diagnosis, lastSyncedAt,
    enable, disable, retry, joinWith,
  };
}
