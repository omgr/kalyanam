"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Heart,
  LogIn,
  Plus,
  Calendar,
  Trash2,
  ChevronRight,
  Wifi,
  Upload,
  Smartphone,
  Monitor,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileJson,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { db, Wedding } from "@/lib/db/schema";
import { activateWedding, clearSession } from "@/lib/session";
import { FamilySyncJoin } from "@/components/sync/family-sync-join";
import { runLocalOnly } from "@/lib/sync/crdt";
import { DiagnosticsPanel } from "@/components/sync/diagnostics-panel";
import { formatDate, getDaysUntil } from "@/lib/utils";
import {
  importWeddingData,
  readFile,
} from "@/lib/sync";

type LoginMode = 'select' | 'import' | 'family-invite' | 'diagnostics';

export default function LoginPage() {
  const router = useRouter();
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<LoginMode>('select');
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWeddings();
  }, []);

  const loadWeddings = async () => {
    try {
      const allWeddings = await db.weddings.orderBy("weddingDate").toArray();
      setWeddings(allWeddings);
    } catch (error) {
      console.error("Error loading weddings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWedding = async (wedding: Wedding) => {
    const familyMembers = await db.familyMembers
      .where("weddingId")
      .equals(wedding.id)
      .toArray();
    
    const primaryMember = familyMembers.find(m => m.role === "primary") || familyMembers[0];
    
    if (primaryMember?.userId) {
      localStorage.setItem("kalyanam_user_id", primaryMember.userId);
    }
    await activateWedding(wedding.id);
    
    router.push("/dashboard");
  };

  const handleDeleteWedding = async (e: React.MouseEvent, weddingId: string) => {
    e.stopPropagation();
    
    if (
      !confirm(
        "Remove this wedding from THIS device?\n\n" +
          "Other family devices keep their own copy - this does not delete it for them."
      )
    ) {
      return;
    }

    try {
      // Local only. Deleting a task should reach the family; "I am done with
      // this on this phone" must not, or one person logging out wipes the
      // wedding for everyone.
      await runLocalOnly(() => db.transaction("rw", 
        [db.weddings, db.events, db.guests, db.tasks, db.expenses, 
         db.budgetCategories, db.vendors, db.messages, db.reminders, 
         db.familyMembers, db.followUps, db.locationPings, db.locationRequests, db.venues],
        async () => {
          await db.events.where("weddingId").equals(weddingId).delete();
          await db.guests.where("weddingId").equals(weddingId).delete();
          await db.tasks.where("weddingId").equals(weddingId).delete();
          await db.expenses.where("weddingId").equals(weddingId).delete();
          await db.budgetCategories.where("weddingId").equals(weddingId).delete();
          await db.vendors.where("weddingId").equals(weddingId).delete();
          await db.messages.where("weddingId").equals(weddingId).delete();
          await db.reminders.where("weddingId").equals(weddingId).delete();
          await db.familyMembers.where("weddingId").equals(weddingId).delete();
          await db.followUps.where("weddingId").equals(weddingId).delete();
          await db.locationPings.where("weddingId").equals(weddingId).delete();
          await db.locationRequests.where("weddingId").equals(weddingId).delete();
          await db.venues.where("weddingId").equals(weddingId).delete();
          await db.weddings.delete(weddingId);
        }
      ));
      
      if (localStorage.getItem("kalyanam_wedding_id") === weddingId) {
        clearSession();
      }
      
      loadWeddings();
    } catch (error) {
      console.error("Error deleting wedding:", error);
      alert("Failed to delete wedding. Please try again.");
    }
  };

  // Handle file import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const content = await readFile(file);
      let result = await importWeddingData(content, { mode: 'new' });

      // The wedding is already here - importing again would duplicate it, so
      // confirm an overwrite instead.
      if (!result.success && result.alreadyExists) {
        if (confirm(`${result.error}\n\nReplace the copy on this device with this backup?`)) {
          result = await importWeddingData(content, { mode: 'new', replaceExisting: true });
        } else {
          setImportResult({ success: false, message: 'Import cancelled - existing data kept.' });
          return;
        }
      }

      if (result.success) {
        setImportResult({
          success: true,
          message: `Successfully imported "${result.weddingName}" with ${result.stats?.events || 0} events, ${result.stats?.guests || 0} guests.`,
        });
        
        if (result.weddingId) {
          await activateWedding(result.weddingId);
        }
        
        loadWeddings();
      } else {
        setImportResult({
          success: false,
          message: result.error || 'Import failed',
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusColor = (wedding: Wedding) => {
    const daysUntil = getDaysUntil(wedding.weddingDate);
    if (wedding.status === "completed") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (wedding.status === "cancelled") return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    if (daysUntil < 0) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    if (daysUntil <= 7) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (daysUntil <= 30) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const resetMode = () => {
    setMode('select');
    setImportResult(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-saffron-50 via-background to-maroon-50/30 dark:from-saffron-950/20 dark:via-background dark:to-maroon-950/20">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Heart className="w-12 h-12 text-primary animate-bounce" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-saffron-50 via-background to-maroon-50/30 dark:from-saffron-950/20 dark:via-background dark:to-maroon-950/20">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => mode === 'select' ? router.push('/') : resetMode()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {mode === 'select' ? 'Back to Home' : 'Back'}
          </Button>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-10 h-10 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">
            {mode === 'diagnostics' && 'Diagnostics'}
            {mode === 'family-invite' && 'Join with Family Sync'}
            {mode === 'select' && 'Welcome to Kalyanam'}
            {mode === 'import' && 'Import Wedding Data'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'select' && 'Continue with an existing wedding or sync from another device'}
            {mode === 'import' && 'Import a backup file to restore your wedding'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* SELECT MODE */}
          {mode === 'diagnostics' && <DiagnosticsPanel />}

          {mode === 'family-invite' && (
            <FamilySyncJoin onCancel={() => setMode('select')} />
          )}

          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Sync Options for New Users */}
              {weddings.length === 0 && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">First Time Here?</CardTitle>
                    <CardDescription>
                      Sync from another device or start fresh
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-4"
                      onClick={() => setMode('family-invite')}
                    >
                      <Users className="w-5 h-5 mr-3 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Join with Family Sync</p>
                        <p className="text-xs text-muted-foreground">
                          Paste an invite code and stay in sync from then on
                        </p>
                      </div>
                    </Button>

                    
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-4"
                      onClick={() => setMode('import')}
                    >
                      <Upload className="w-5 h-5 mr-3 text-green-500" />
                      <div className="text-left">
                        <p className="font-medium">Import Backup File</p>
                        <p className="text-xs text-muted-foreground">
                          Restore from a .kalyanam.json file
                        </p>
                      </div>
                    </Button>
                    
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-2 text-sm text-muted-foreground">or</span>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full"
                      onClick={() => router.push("/onboarding")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Wedding
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Existing Weddings */}
              {weddings.length > 0 && (
                <>
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      Your Weddings on This Device
                    </h2>
                    
                    {weddings.map((wedding, index) => {
                      const daysUntil = getDaysUntil(wedding.weddingDate);
                      
                      return (
                        <motion.div
                          key={wedding.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card 
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
                            onClick={() => handleSelectWedding(wedding)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                  <Heart className="w-7 h-7 text-primary" fill="currentColor" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h3 className="font-semibold text-lg truncate">
                                        {wedding.name}
                                      </h3>
                                      <p className="text-sm text-muted-foreground">
                                        {wedding.brideName} & {wedding.groomName}
                                      </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStatusColor(wedding)}`}>
                                      {wedding.status === "completed" 
                                        ? "Completed" 
                                        : wedding.status === "cancelled"
                                        ? "Cancelled"
                                        : daysUntil < 0 
                                        ? `${Math.abs(daysUntil)} days ago`
                                        : daysUntil === 0
                                        ? "Today!"
                                        : `${daysUntil} days left`}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {formatDate(wedding.weddingDate, "short")}
                                    </span>
                                    {wedding.city && (
                                      <span className="truncate">{wedding.city}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    onClick={(e) => handleDeleteWedding(e, wedding.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Additional Options */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">More Options</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex-col gap-1"
                        onClick={() => setMode('import')}
                      >
                        <Upload className="w-5 h-5 text-green-500" />
                        <span className="text-xs">Import</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto py-3 flex-col gap-1"
                        onClick={() => router.push("/onboarding")}
                      >
                        <Plus className="w-5 h-5 text-primary" />
                        <span className="text-xs">New</span>
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          )}

          {/* SYNC CODE MODE */}
          {mode === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                    <FileJson className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle>Import Backup File</CardTitle>
                  <CardDescription>
                    Select a .kalyanam.json file to restore your wedding data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.kalyanam.json,.kalyanam.enc"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <Button
                    variant="outline"
                    className="w-full h-32 border-dashed flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                    <span>{isImporting ? 'Importing...' : 'Click to select file'}</span>
                    <span className="text-xs text-muted-foreground">.json or .kalyanam.json</span>
                  </Button>

                  {importResult && (
                    <div
                      className={`flex items-start gap-2 p-4 rounded-lg ${
                        importResult.success
                          ? 'text-green-600 bg-green-50 dark:bg-green-950/20'
                          : 'text-red-600 bg-red-50 dark:bg-red-950/20'
                      }`}
                    >
                      {importResult.success ? (
                        <CheckCircle className="w-5 h-5 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mt-0.5" />
                      )}
                      <span className="text-sm">{importResult.message}</span>
                    </div>
                  )}

                  {importResult?.success && (
                    <Button
                      className="w-full"
                      onClick={() => router.push('/dashboard')}
                    >
                      Go to Dashboard
                    </Button>
                  )}

                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <h4 className="font-medium mb-2">About Import Files:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Export files from Kalyanam's Sync & Backup feature</li>
                      <li>Contains all wedding data including events, guests, budget</li>
                      <li>Your data stays private - files are stored on your device only</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Your data is stored locally on this device.
          <br />
          Use Sync or Export to transfer between devices.
        </p>

        {/* Reachable without a wedding, because the problems worth reporting
            often happen before anyone gets that far. */}
        <p className="text-center mt-3">
          <button
            onClick={() => setMode(mode === 'diagnostics' ? 'select' : 'diagnostics')}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            {mode === 'diagnostics' ? 'Hide diagnostics' : 'Something not working? Get a log'}
          </button>
        </p>
      </div>
    </main>
  );
}
