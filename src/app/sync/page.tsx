"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowDownToLine, Upload, FileJson, Loader2,
  CheckCircle, AlertCircle, Share2, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useWedding } from "@/lib/db/hooks";
import { activateWedding } from "@/lib/session";
import { exportWeddingData, downloadExport, importWeddingData, readFile } from "@/lib/sync";
import { FamilySyncPanel } from "@/components/sync/family-sync-panel";

/**
 * Sync and backup.
 *
 * This page used to offer four ways to move data between devices: a
 * six-character code, a QR code, a "family room", and file export. Three of
 * them shared a transport that signalled over BroadcastChannel and a
 * localStorage poll - both scoped to a single browser on a single machine - so
 * they could never work between two phones. They span forever instead of
 * failing, and they sat directly above the one that does work.
 *
 * They are gone. What remains is Family Sync, which genuinely connects devices
 * peer to peer, and file export, which always works.
 */
export default function SyncPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kalyanam_wedding_id");
    if (!stored) {
      router.push("/login");
      return;
    }
    setWeddingId(stored);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);

  const handleExport = async () => {
    if (!weddingId) return;
    setIsExporting(true);
    try {
      const { data, filename } = await exportWeddingData(weddingId);
      downloadExport(data, filename);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Could not export your data.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const content = await readFile(file);
      let result = await importWeddingData(content, { mode: "new" });

      if (!result.success && result.alreadyExists) {
        if (confirm(`${result.error}\n\nReplace the copy on this device with this backup?`)) {
          result = await importWeddingData(content, { mode: "new", replaceExisting: true });
        } else {
          setImportResult({ success: false, message: "Import cancelled - existing data kept." });
          return;
        }
      }

      if (result.success) {
        setImportResult({
          success: true,
          message:
            `Imported "${result.weddingName}" - ${result.stats?.events ?? 0} events, ` +
            `${result.stats?.guests ?? 0} guests, ${result.stats?.vendors ?? 0} vendors.`,
        });
        if (result.weddingId) await activateWedding(result.weddingId);
      } else {
        setImportResult({ success: false, message: result.error || "Import failed" });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!weddingId || !wedding) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-0">
        <div>
          <Button variant="ghost" className="mb-2 -ml-2" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Share2 className="w-8 h-8 text-primary" />
            Sync &amp; Backup
          </h1>
          <p className="text-muted-foreground">
            Keep the family&apos;s devices together, and keep a copy of everything.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* The one that connects devices */}
          <FamilySyncPanel weddingId={weddingId} />

          {/* The one that always works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-500" />
                Backup file
              </CardTitle>
              <CardDescription>
                A complete copy of this wedding, saved to your device. Keep one somewhere safe -
                clearing your browser data would otherwise lose everything.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="w-6 h-6 text-blue-500" />
                  )}
                  <span>Export</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-green-600" />
                  )}
                  <span>Import</span>
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.kalyanam.json,application/json"
                className="hidden"
                onChange={handleFileSelect}
              />

              {exportSuccess && (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Backup saved.
                </p>
              )}

              {importResult && (
                <p
                  className={`text-sm flex items-start gap-2 ${
                    importResult.success ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {importResult.success ? (
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  {importResult.message}
                </p>
              )}

              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                A backup <strong>replaces</strong> what is on a device. To combine changes from two
                devices instead, use the merge file under Family Sync above.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span>
                  Your wedding is stored on your own devices. Family Sync sends it directly between
                  them, encrypted. No server holds a copy - which is also why keeping a backup
                  matters.
                </span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
