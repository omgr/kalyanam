"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, HardDrive, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DiagnosticsPanel } from "@/components/sync/diagnostics-panel";
import { areaCounts, storageUsedKb, RETENTION_DAYS, today } from "@/lib/diagnostics/logger";

/**
 * Diagnostics as a feature in its own right.
 *
 * It lived under Sync & Backup, which meant it could only be found by someone
 * who already suspected the problem was sync. Logging covers every part of the
 * app, so it belongs somewhere anybody can reach when anything misbehaves.
 */
export default function DiagnosticsClient() {
  const router = useRouter();
  const [areas, setAreas] = useState<Array<[string, { total: number; problems: number }]>>([]);
  const [kb, setKb] = useState<number | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("kalyanam_wedding_id")) {
      router.push("/login");
      return;
    }
    void areaCounts(today()).then((counts) =>
      setAreas(Object.entries(counts).sort((a, b) => b[1].total - a[1].total))
    );
    void storageUsedKb().then(setKb);
  }, [router]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Diagnostics
          </h1>
          <p className="text-muted-foreground">
            A record of what the app did, to send on when something is not working.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-muted-foreground" />
              Today&apos;s activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {areas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded yet today.</p>
            ) : (
              <div className="space-y-1.5">
                {areas.map(([area, count]) => (
                  <div key={area} className="flex items-center gap-3 text-sm">
                    <span className="font-medium capitalize w-28">{area}</span>
                    <span className="text-muted-foreground flex-1">{count.total} entries</span>
                    {count.problems > 0 && (
                      <span className="text-yellow-600 text-xs">
                        {count.problems} warning{count.problems === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-center gap-2 border-t border-border pt-3">
              <HardDrive className="w-4 h-4" />
              About {kb ?? "?"} KB used. A fresh log starts each day and only the last{" "}
              {RETENTION_DAYS} days are kept.
            </p>
          </CardContent>
        </Card>

        <DiagnosticsPanel />
      </div>
    </DashboardLayout>
  );
}
