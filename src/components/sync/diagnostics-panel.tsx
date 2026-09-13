"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Download, Share2, Trash2, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  availableDays, buildLogFile, clearLogs, describeDevice,
  entriesFor, today, getDeviceName, setDeviceName, type DeviceInfo,
} from "@/lib/diagnostics/logger";

/**
 * Finding and sending a diagnostic log.
 *
 * A browser cannot save into a folder of its own choosing, so the log is kept
 * in the app's storage and written out on request. The filename carries the
 * device and the date - kalyanam-log-SM-S911B-2026-09-13.txt - so the right
 * one is easy to pick out of Downloads when someone asks for it.
 */
export function DiagnosticsPanel() {
  const [days, setDays] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; problems: number }>>({});
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const refresh = useCallback(async () => {
    const [list, info] = await Promise.all([availableDays(), describeDevice()]);
    setDays(list);
    setDevice(info);
    setNameDraft(getDeviceName() ?? "");

    const summary: Record<string, { total: number; problems: number }> = {};
    for (const day of list.slice(0, 7)) {
      const entries = await entriesFor(day);
      summary[day] = {
        total: entries.length,
        problems: entries.filter((e) => e.level !== "info").length,
      };
    }
    setCounts(summary);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async (day: string) => {
    setBusy(true);
    try {
      const { filename, text } = await buildLogFile(day);
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        variant: "success",
        title: "Log saved to Downloads",
        description: filename,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not save the log",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const share = async (day: string) => {
    setBusy(true);
    try {
      const { filename, text } = await buildLogFile(day);
      const file = new File([text], filename, { type: "text/plain" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Log copied to the clipboard",
          description: "Sharing a file is not available here, so paste it into a message.",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast({
        variant: "destructive",
        title: "Could not share the log",
        description: error instanceof Error ? error.message : "Try saving it instead.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          Diagnostics
        </CardTitle>
        <CardDescription>
          If something is not working, save the log for that day and send it on. It records what
          the app did, not what your wedding says.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chrome on Android reports every phone as "K", so two devices in one
            family would otherwise write identically named files. */}
        {device?.labelIsGeneric && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-50 dark:bg-yellow-900/20 p-3 space-y-2">
            <Label htmlFor="deviceName" className="flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4" />
              Name this device
            </Label>
            <p className="text-xs text-muted-foreground">
              Your browser does not reveal the model, so logs from two phones would have the
              same filename. A name makes them easy to tell apart.
            </p>
            <div className="flex gap-2">
              <Input
                id="deviceName"
                placeholder="e.g. Madan Samsung"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!nameDraft.trim()}
                onClick={() => {
                  setDeviceName(nameDraft);
                  void refresh();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {device && (
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-0.5">
            <p>
              <span className="text-muted-foreground">Device:</span>{" "}
              <strong>{device.label}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Network:</span>{" "}
              {device.network ?? "unknown"}
              {device.online ? "" : " (offline)"} ·{" "}
              <span className="text-muted-foreground">Installed:</span>{" "}
              {device.standalone ? "yes" : "browser tab"}
            </p>
          </div>
        )}

        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing logged yet. Use the app and come back here if something goes wrong.
          </p>
        ) : (
          <div className="space-y-2">
            {days.slice(0, 7).map((day) => {
              const count = counts[day];
              return (
                <div
                  key={day}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {day}
                      {day === today() && (
                        <span className="text-muted-foreground font-normal"> · today</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {count ? `${count.total} entries` : "…"}
                      {count?.problems ? ` · ${count.problems} warnings or errors` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => share(day)}
                    aria-label={`Share the log for ${day}`}
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => save(day)}
                    aria-label={`Save the log for ${day}`}
                    title="Save"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || days.length === 0}
            onClick={async () => {
              if (!confirm("Delete all diagnostic logs on this device?")) return;
              await clearLogs();
              await refresh();
            }}
          >
            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
            Clear
          </Button>
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-2 border-t border-border pt-3">
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
          <span>
            Logs are kept on this device for 7 days and never sent anywhere on their own. They
            contain no guest names, phone numbers, messages or invite codes - only what happened
            and how many records were involved.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
