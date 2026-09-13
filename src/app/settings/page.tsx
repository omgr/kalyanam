"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings,
  Moon,
  Sun,
  Globe,
  Bell,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Info,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppSettings, useWedding } from "@/lib/db/hooks";
import { db, AppSettings } from "@/lib/db/schema";
import { activateWedding, clearSession } from "@/lib/session";
import { runLocalOnly, forgetSyncData } from "@/lib/sync/crdt";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const settings = useAppSettings();
  const wedding = useWedding(weddingId ?? undefined);

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (storedWeddingId) {
      setWeddingId(storedWeddingId);
    }
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    await db.appSettings.update("default", {
      ...updates,
      updatedAt: new Date(),
    });
  };

  const handleExportData = async () => {
    try {
      const data = {
        weddings: await db.weddings.toArray(),
        familyMembers: await db.familyMembers.toArray(),
        events: await db.events.toArray(),
        guests: await db.guests.toArray(),
        tasks: await db.tasks.toArray(),
        expenses: await db.expenses.toArray(),
        budgetCategories: await db.budgetCategories.toArray(),
        vendors: await db.vendors.toArray(),
        cultures: await db.cultures.toArray(),
        settings: await db.appSettings.toArray(),
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kalyanam-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  const handleImportData = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version || !data.weddings) {
          throw new Error("Invalid backup file");
        }

        if (
          confirm(
            "This will replace all your current data. Are you sure you want to continue?"
          )
        ) {
          // Clear existing data
          await db.weddings.clear();
          await db.familyMembers.clear();
          await db.events.clear();
          await db.guests.clear();
          await db.tasks.clear();
          await db.expenses.clear();
          await db.budgetCategories.clear();
          await db.vendors.clear();

          // Import new data
          if (data.weddings) await db.weddings.bulkAdd(data.weddings);
          if (data.familyMembers) await db.familyMembers.bulkAdd(data.familyMembers);
          if (data.events) await db.events.bulkAdd(data.events);
          if (data.guests) await db.guests.bulkAdd(data.guests);
          if (data.tasks) await db.tasks.bulkAdd(data.tasks);
          if (data.expenses) await db.expenses.bulkAdd(data.expenses);
          if (data.budgetCategories) await db.budgetCategories.bulkAdd(data.budgetCategories);
          if (data.vendors) await db.vendors.bulkAdd(data.vendors);
          if (data.cultures) await db.cultures.bulkAdd(data.cultures);

          // Update localStorage
          if (data.weddings.length > 0) {
            await activateWedding(data.weddings[0].id);
          }

          alert("Data imported successfully!");
          window.location.reload();
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert("Failed to import data. Please check the file and try again.");
      }
    };
    input.click();
  };

  const handleClearAllData = async () => {
    if (
      confirm(
        "⚠️ This will permanently delete ALL wedding data on THIS device. This cannot be undone!\n\n" +
          "Other family devices keep their own copy.\n\nAre you absolutely sure?"
      )
    ) {
      if (confirm("Last chance! Type 'DELETE' to confirm.")) {
        const weddingId = localStorage.getItem("kalyanam_wedding_id") ?? undefined;
        // The replicated document is a separate database. Leaving it behind
        // means the next sync restores everything that was just deleted.
        await forgetSyncData(weddingId);
        await db.delete();
        clearSession();
        localStorage.removeItem("kalyanam_family_sync_enabled");
        window.location.href = "/";
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Settings className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your app preferences and data
          </p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
            <CardDescription>Customize how Kalyanam looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred color scheme
                </p>
              </div>
              <div className="flex gap-2">
                {["light", "dark", "system"].map((t) => (
                  <Button
                    key={t}
                    variant={theme === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme(t)}
                    className="capitalize"
                  >
                    {t === "light" && <Sun className="w-4 h-4 mr-1" />}
                    {t === "dark" && <Moon className="w-4 h-4 mr-1" />}
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "enabled", label: "Enable Notifications", desc: "Receive app notifications" },
              { key: "reminders", label: "Task Reminders", desc: "Get reminded about upcoming tasks" },
              { key: "messages", label: "Messages", desc: "Notifications for new messages" },
              { key: "locationRequests", label: "Location Requests", desc: "When someone wants to find you" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={
                      settings?.notifications?.[item.key as keyof typeof settings.notifications] ??
                      true
                    }
                    onChange={(e) =>
                      updateSettings({
                        notifications: {
                          ...settings?.notifications,
                          [item.key]: e.target.checked,
                        } as AppSettings["notifications"],
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy
            </CardTitle>
            <CardDescription>Control your privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Share Location</p>
                <p className="text-sm text-muted-foreground">
                  Allow family members to see your location
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings?.privacy?.shareLocation ?? true}
                  onChange={(e) =>
                    updateSettings({
                      privacy: {
                        ...settings?.privacy,
                        shareLocation: e.target.checked,
                      } as AppSettings["privacy"],
                    })
                  }
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Location Accuracy</p>
                <p className="text-sm text-muted-foreground">
                  How precise your shared location is
                </p>
              </div>
              <select
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={settings?.privacy?.locationAccuracy ?? "zone_only"}
                onChange={(e) =>
                  updateSettings({
                    privacy: {
                      ...settings?.privacy,
                      locationAccuracy: e.target.value as AppSettings["privacy"]["locationAccuracy"],
                    } as AppSettings["privacy"],
                  })
                }
              >
                <option value="exact">Exact Location</option>
                <option value="approximate">Approximate</option>
                <option value="zone_only">Zone Only</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </CardTitle>
            <CardDescription>Export, import, or clear your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleImportData}>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </div>

            <div className="border-t pt-4 mt-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleClearAllData}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Data
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                This action cannot be undone
              </p>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              About Kalyanam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" fill="white" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Kalyanam</h3>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                <p className="text-sm text-muted-foreground">
                  Wedding Planning Made Beautiful
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                All data stored locally on your device
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Works offline
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                No account required
              </p>
              <p className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Your privacy is protected
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Made with ❤️ for beautiful beginnings
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

