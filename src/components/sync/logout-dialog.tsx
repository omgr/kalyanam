"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, Smartphone, Eraser, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db/schema";
import { clearSession } from "@/lib/session";
import { runLocalOnly, forgetSyncData } from "@/lib/sync/crdt";
import { logInfo } from "@/lib/diagnostics/logger";

/**
 * Leaving, with the two meanings separated.
 *
 * "Log out" is ambiguous on a shared or borrowed phone: it can mean "I will be
 * back on this device" or "take my family's wedding off this handset". Doing
 * the wrong one silently is bad either way - keeping data on a phone that was
 * borrowed, or wiping the only copy on a phone that was not.
 */
export function LogoutDialog({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const keepData = async () => {
    setBusy(true);
    await logInfo("session", "signed out, keeping local data");
    clearSession();
    router.push("/login");
  };

  const removeEverything = async () => {
    if (
      !confirm(
        "Remove this wedding from THIS device?\n\n" +
          "The rest of the family keep their copies - this does not delete it for them.\n\n" +
          "If this is the only device with the wedding, export a backup first."
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const weddingId = localStorage.getItem("kalyanam_wedding_id") ?? undefined;
      await logInfo("session", "signing out and wiping this device");

      // Stop syncing and drop the replicated document, or the next sign-in
      // would restore everything that was just removed.
      await forgetSyncData(weddingId);

      // Local only: this is "off this phone", not "delete for the family".
      await runLocalOnly(async () => {
        await db.delete();
      });

      clearSession();
      localStorage.removeItem("kalyanam_family_sync_enabled");
      window.location.href = "/";
    } catch {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOut className="w-5 h-5" />
          Sign out of Kalyanam
        </CardTitle>
        <CardDescription>Two different things, so worth choosing.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start h-auto py-4"
          onClick={keepData}
          disabled={busy}
        >
          <Smartphone className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
          <span className="text-left">
            <span className="block font-medium">Sign out, keep the wedding here</span>
            <span className="block text-xs text-muted-foreground whitespace-normal">
              Stays on this device and resumes syncing next time you sign in. Use this on your
              own phone.
            </span>
          </span>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start h-auto py-4"
          onClick={removeEverything}
          disabled={busy}
        >
          <Eraser className="w-5 h-5 mr-3 text-red-500 flex-shrink-0" />
          <span className="text-left">
            <span className="block font-medium">Leave family sync and erase this device</span>
            <span className="block text-xs text-muted-foreground whitespace-normal">
              Removes the wedding and stops syncing here. Use this on a borrowed or shared
              phone.
            </span>
          </span>
        </Button>

        <p className="text-xs text-muted-foreground flex items-start gap-2 border-t border-border pt-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
          Neither option affects anyone else&apos;s device. The family keep their own copies
          either way.
        </p>

        <Button variant="ghost" className="w-full" onClick={onCancel} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}
