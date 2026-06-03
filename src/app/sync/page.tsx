"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Upload,
  QrCode,
  Wifi,
  Share2,
  Shield,
  Check,
  X,
  Copy,
  RefreshCw,
  Smartphone,
  Monitor,
  Camera,
  FileJson,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  Circle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useWedding } from "@/lib/db/hooks";
import {
  exportWeddingData,
  downloadExport,
  importWeddingData,
  readFile,
  generateQRSyncData,
  generateQRCodeDataURL,
  parseQRSyncData,
  startCamera,
  stopCamera,
  scanQRCode,
  generateSyncCode,
  createHostConnection,
  createGuestConnection,
  ConnectionState,
  PeerConnection,
  QRSyncData,
} from "@/lib/sync";

type SyncMode = 'menu' | 'export' | 'import' | 'qr-share' | 'qr-scan' | 'p2p-host' | 'p2p-join' | 'family-room';

export default function SyncPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [mode, setMode] = useState<SyncMode>('menu');
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // QR state
  const [qrData, setQrData] = useState<QRSyncData | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  
  // P2P state
  const [syncCode, setSyncCode] = useState('');
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [peerConnection, setPeerConnection] = useState<PeerConnection | null>(null);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/login");
      return;
    }
    setWeddingId(storedWeddingId);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) stopCamera(streamRef.current);
      if (stopScanRef.current) stopScanRef.current();
      if (peerConnection) peerConnection.close();
    };
  }, [peerConnection]);

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
  
  const handleExport = async (encrypted: boolean = false) => {
    if (!weddingId) return;
    
    setIsExporting(true);
    try {
      const { data, filename } = await exportWeddingData(weddingId, { encrypt: encrypted });
      downloadExport(data, filename);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================
  // IMPORT FUNCTIONS
  // ============================================
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const content = await readFile(file);
      const result = await importWeddingData(content, { mode: 'new' });
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `Successfully imported "${result.weddingName}" with ${result.stats?.events || 0} events, ${result.stats?.guests || 0} guests, and ${result.stats?.vendors || 0} vendors.`,
        });
        
        // Switch to the imported wedding
        if (result.weddingId) {
          localStorage.setItem("kalyanam_wedding_id", result.weddingId);
        }
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

  // ============================================
  // QR CODE FUNCTIONS
  // ============================================
  
  const generateQRCode = async () => {
    if (!weddingId || !wedding) return;
    
    const data = generateQRSyncData(weddingId, wedding.name);
    setQrData(data);
    
    // Generate QR code image (async)
    const qrImage = await generateQRCodeDataURL(JSON.stringify(data), 300);
    setQrCodeImage(qrImage);
    
    // Also generate sync code for manual entry
    setSyncCode(data.syncCode);
  };

  const startQRScanning = async () => {
    if (!videoRef.current) return;
    
    setIsScanning(true);
    
    try {
      const stream = await startCamera(videoRef.current, 'environment');
      streamRef.current = stream;
      
      stopScanRef.current = await scanQRCode(
        videoRef.current,
        (data) => {
          const parsed = parseQRSyncData(data);
          if (parsed) {
            // Valid QR code found - initiate P2P connection
            stopQRScanning();
            setInputSyncCode(parsed.syncCode);
            setMode('p2p-join');
            handleJoinSync(parsed.syncCode);
          }
        },
        (error) => {
          console.error('Scan error:', error);
        }
      );
    } catch (error) {
      console.error('Camera error:', error);
      setIsScanning(false);
      alert('Failed to access camera. Please check permissions.');
    }
  };

  const stopQRScanning = () => {
    if (stopScanRef.current) stopScanRef.current();
    if (streamRef.current) stopCamera(streamRef.current);
    streamRef.current = null;
    stopScanRef.current = null;
    setIsScanning(false);
  };

  // ============================================
  // P2P SYNC FUNCTIONS
  // ============================================
  
  const handleStartHosting = async () => {
    if (!weddingId) return;
    
    const code = generateSyncCode();
    setSyncCode(code);
    setSyncProgress('Waiting for other device to connect...');
    
    try {
      const { data } = await exportWeddingData(weddingId);
      
      const connection = await createHostConnection(code, {
        onStateChange: (state) => {
          setConnectionState(state);
          if (state === 'connected') {
            setSyncProgress('Connected! Sending data...');
          } else if (state === 'failed') {
            setSyncProgress('Connection failed. Please try again.');
          }
        },
        onDataReceived: (receivedData) => {
          if (receivedData.type === 'request-data') {
            connection.sendData({ type: 'wedding-data', payload: data });
          } else if (receivedData.type === 'ack') {
            setSyncProgress('Data sent successfully!');
            setSyncComplete(true);
          }
        },
        onGuestConnected: () => {
          setSyncProgress('Device connected! Waiting for data request...');
        },
      });
      
      setPeerConnection(connection);
    } catch (error) {
      console.error('Host error:', error);
      setSyncProgress('Failed to start. Please try again.');
    }
  };

  const handleJoinSync = async (code?: string) => {
    const syncCodeToUse = code || inputSyncCode;
    if (!syncCodeToUse || syncCodeToUse.length !== 6) {
      alert('Please enter a valid 6-character sync code');
      return;
    }
    
    setSyncProgress('Connecting to host device...');
    
    try {
      const connection = await createGuestConnection(syncCodeToUse.toUpperCase(), {
        onStateChange: (state) => {
          setConnectionState(state);
          if (state === 'failed') {
            setSyncProgress('Connection failed. Please check the code and try again.');
          }
        },
        onDataReceived: async (receivedData) => {
          if (receivedData.type === 'wedding-data') {
            setSyncProgress('Receiving data...');
            
            try {
              const result = await importWeddingData(receivedData.payload, { mode: 'new' });
              
              if (result.success) {
                connection.sendData({ type: 'ack' });
                setSyncProgress(`Imported "${result.weddingName}" successfully!`);
                setSyncComplete(true);
                
                if (result.weddingId) {
                  localStorage.setItem("kalyanam_wedding_id", result.weddingId);
                }
              } else {
                setSyncProgress('Failed to import data: ' + result.error);
              }
            } catch (error) {
              setSyncProgress('Import error: ' + (error instanceof Error ? error.message : 'Unknown'));
            }
          }
        },
        onConnected: () => {
          setSyncProgress('Connected! Requesting data...');
          connection.sendData({ type: 'request-data' });
        },
      });
      
      setPeerConnection(connection);
    } catch (error) {
      console.error('Join error:', error);
      setSyncProgress('Failed to connect. Please try again.');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
  };

  const resetSync = () => {
    if (peerConnection) peerConnection.close();
    setPeerConnection(null);
    setConnectionState('disconnected');
    setSyncCode('');
    setInputSyncCode('');
    setSyncProgress('');
    setSyncComplete(false);
    setQrData(null);
    setQrCodeImage(null);
    setMode('menu');
  };

  if (!weddingId || !wedding) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            className="mb-2 -ml-2"
            onClick={() => mode === 'menu' ? router.back() : resetSync()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {mode === 'menu' ? 'Back' : 'Back to Sync Options'}
          </Button>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Share2 className="w-8 h-8 text-primary" />
            Sync & Backup
          </h1>
          <p className="text-muted-foreground">
            Transfer wedding data between devices securely
          </p>
        </div>

        {/* Privacy Notice */}
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="flex items-start gap-3 py-4">
            <Shield className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-800 dark:text-green-400">End-to-End Privacy</p>
              <p className="text-green-700 dark:text-green-500">
                Your data is transferred directly between devices. No data is stored on any server.
              </p>
            </div>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {/* MAIN MENU */}
          {mode === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Export/Import */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-blue-500" />
                    Export / Import File
                  </CardTitle>
                  <CardDescription>
                    Save your wedding data as a file or restore from a backup
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => setMode('export')}
                  >
                    <ArrowDownToLine className="w-6 h-6 text-blue-500" />
                    <span>Export Data</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => setMode('import')}
                  >
                    <ArrowUpFromLine className="w-6 h-6 text-green-500" />
                    <span>Import Data</span>
                  </Button>
                </CardContent>
              </Card>

              {/* QR Code Sync */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-purple-500" />
                    QR Code Sync
                  </CardTitle>
                  <CardDescription>
                    Scan a QR code to quickly sync with another device
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => {
                      generateQRCode();
                      setMode('qr-share');
                    }}
                  >
                    <QrCode className="w-6 h-6 text-purple-500" />
                    <span>Show QR Code</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => setMode('qr-scan')}
                  >
                    <Camera className="w-6 h-6 text-pink-500" />
                    <span>Scan QR Code</span>
                  </Button>
                </CardContent>
              </Card>

              {/* P2P Real-time Sync */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-orange-500" />
                    Real-time P2P Sync
                  </CardTitle>
                  <CardDescription>
                    Connect two devices directly for real-time data transfer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Important Notice */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-400">
                          Both devices must be online
                        </p>
                        <p className="text-amber-700 dark:text-amber-500">
                          Keep this app open on both devices during sync. If the sharing device goes offline, the connection will fail.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={() => {
                        handleStartHosting();
                        setMode('p2p-host');
                      }}
                    >
                      <Monitor className="w-6 h-6 text-orange-500" />
                      <span>Share from Here</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={() => setMode('p2p-join')}
                    >
                      <Smartphone className="w-6 h-6 text-teal-500" />
                      <span>Receive Data</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Family Room - Persistent Sync */}
              <Card className="hover:shadow-lg transition-shadow border-2 border-primary/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Family Room
                    </CardTitle>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <CardDescription>
                    Stay connected with family for continuous sync when both devices are online
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800 dark:text-blue-400">
                        <p className="font-medium">How Family Room works:</p>
                        <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-500">
                          <li>• Devices remember each other after first pairing</li>
                          <li>• Auto-sync when both devices open the app</li>
                          <li>• Changes sync in real-time while connected</li>
                          <li>• Works even when family is in different countries</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full"
                    onClick={() => setMode('family-room')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Open Family Room
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* EXPORT MODE */}
          {mode === 'export' && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Wedding Data
                  </CardTitle>
                  <CardDescription>
                    Download all data for "{wedding.name}"
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <Button
                      size="lg"
                      className="w-full justify-start"
                      onClick={() => handleExport(false)}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <FileJson className="w-5 h-5 mr-3" />
                      )}
                      <div className="text-left">
                        <p className="font-medium">Export as JSON</p>
                        <p className="text-xs opacity-70">Human-readable format</p>
                      </div>
                    </Button>
                  </div>

                  {exportSuccess && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      <span>Export downloaded successfully!</span>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    The export file can be imported on any device with Kalyanam installed.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* IMPORT MODE */}
          {mode === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Import Wedding Data
                  </CardTitle>
                  <CardDescription>
                    Restore from a backup file
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.kalyanam.json,.kalyanam.enc"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <Button
                    size="lg"
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
                      className={`flex items-start gap-2 p-3 rounded-lg ${
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
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* QR SHARE MODE */}
          {mode === 'qr-share' && (
            <motion.div
              key="qr-share"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Scan to Sync
                  </CardTitle>
                  <CardDescription>
                    Scan this QR code with another device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* QR Code Display */}
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                      {qrCodeImage ? (
                        <img src={qrCodeImage} alt="QR Code" className="w-64 h-64" />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Code Entry */}
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Or enter this code manually:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-2xl font-mono font-bold tracking-widest bg-muted px-4 py-2 rounded-lg">
                        {syncCode}
                      </code>
                      <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">On the other device:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Open Kalyanam app</li>
                      <li>Go to Sync & Backup</li>
                      <li>Tap "Scan QR Code" or enter the code above</li>
                    </ol>
                  </div>

                  {/* Start P2P after QR is shown */}
                  {connectionState === 'disconnected' && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        handleStartHosting();
                        setMode('p2p-host');
                      }}
                    >
                      <Wifi className="w-4 h-4 mr-2" />
                      Start Sharing
                    </Button>
                  )}

                  {/* Regenerate */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={generateQRCode}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate New Code
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* QR SCAN MODE */}
          {mode === 'qr-scan' && (
            <motion.div
              key="qr-scan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Camera className="w-5 h-5" />
                    Scan QR Code
                  </CardTitle>
                  <CardDescription>
                    Point your camera at the QR code
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Camera View */}
                  <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <Camera className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {/* Scanner overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-primary rounded-lg" />
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={isScanning ? stopQRScanning : startQRScanning}
                  >
                    {isScanning ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Stop Scanning
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera
                      </>
                    )}
                  </Button>

                  {/* Manual Code Entry */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-background px-2 text-sm text-muted-foreground">
                        or enter code manually
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter 6-digit code"
                      value={inputSyncCode}
                      onChange={(e) => setInputSyncCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="text-center text-lg font-mono tracking-widest"
                    />
                    <Button
                      onClick={() => {
                        stopQRScanning();
                        setMode('p2p-join');
                        handleJoinSync();
                      }}
                      disabled={inputSyncCode.length !== 6}
                    >
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* P2P HOST MODE */}
          {mode === 'p2p-host' && (
            <motion.div
              key="p2p-host"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Sharing from this Device
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Sync Code */}
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Share this code with the other device:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-3xl font-mono font-bold tracking-widest bg-primary/10 text-primary px-6 py-3 rounded-lg">
                        {syncCode}
                      </code>
                      <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Connection Status */}
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        connectionState === 'connected'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : connectionState === 'connecting'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : connectionState === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-muted'
                      }`}
                    >
                      {connectionState === 'connected' ? (
                        <Check className="w-8 h-8 text-green-600" />
                      ) : connectionState === 'connecting' ? (
                        <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
                      ) : connectionState === 'failed' ? (
                        <X className="w-8 h-8 text-red-600" />
                      ) : (
                        <Wifi className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-center text-muted-foreground">{syncProgress}</p>
                  </div>

                  {syncComplete && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-green-800 dark:text-green-400">
                        Sync Complete!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-500">
                        Wedding data has been transferred successfully.
                      </p>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" onClick={resetSync}>
                    {syncComplete ? 'Done' : 'Cancel'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* P2P JOIN MODE */}
          {mode === 'p2p-join' && (
            <motion.div
              key="p2p-join"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Receive Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {connectionState === 'disconnected' && !syncProgress && (
                    <>
                      {/* Important Notice */}
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-700 dark:text-amber-500">
                            Make sure the sharing device has the app open and is waiting for connection.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Enter sync code from other device</Label>
                        <Input
                          placeholder="XXXXXX"
                          value={inputSyncCode}
                          onChange={(e) => setInputSyncCode(e.target.value.toUpperCase())}
                          maxLength={6}
                          className="text-center text-2xl font-mono tracking-widest"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleJoinSync()}
                        disabled={inputSyncCode.length !== 6}
                      >
                        <Wifi className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    </>
                  )}

                  {syncProgress && (
                    <>
                      {/* Connection Status */}
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center ${
                            connectionState === 'connected' || syncComplete
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : connectionState === 'connecting'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30'
                              : connectionState === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-muted'
                          }`}
                        >
                          {syncComplete ? (
                            <Check className="w-8 h-8 text-green-600" />
                          ) : connectionState === 'connecting' ? (
                            <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
                          ) : connectionState === 'failed' ? (
                            <X className="w-8 h-8 text-red-600" />
                          ) : (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          )}
                        </div>
                        <p className="text-center text-muted-foreground">{syncProgress}</p>
                      </div>

                      {connectionState === 'failed' && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                          <p className="text-sm text-red-700 dark:text-red-400">
                            <strong>Connection failed.</strong> This usually means:
                          </p>
                          <ul className="text-sm text-red-600 dark:text-red-500 mt-1 list-disc list-inside">
                            <li>The other device is not online or app is closed</li>
                            <li>The sync code has expired (try a new code)</li>
                            <li>Network/firewall is blocking the connection</li>
                          </ul>
                        </div>
                      )}

                      {syncComplete && (
                        <Button
                          className="w-full"
                          onClick={() => router.push('/dashboard')}
                        >
                          Go to Dashboard
                        </Button>
                      )}
                    </>
                  )}

                  <Button variant="outline" className="w-full" onClick={resetSync}>
                    {syncComplete ? 'Done' : 'Cancel'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* FAMILY ROOM MODE */}
          {mode === 'family-room' && (
            <motion.div
              key="family-room"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Family Room
                  </CardTitle>
                  <CardDescription>
                    Connect devices for continuous synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* How it works */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">How Family Room Works</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                        <p>One person creates a room and shares the code</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                        <p>Others join using the code (both devices must be online)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                        <p>Devices remember each other for future auto-sync</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
                        <p>When both devices open the app later, they'll auto-connect and sync</p>
                      </div>
                    </div>
                  </div>

                  {/* Important Notice */}
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-400">
                          Initial pairing requires both devices online
                        </p>
                        <p className="text-amber-700 dark:text-amber-500">
                          After the first sync, devices will automatically reconnect whenever both are online with the app open.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => {
                        handleStartHosting();
                        setMode('p2p-host');
                      }}
                    >
                      <Monitor className="w-6 h-6 text-primary" />
                      <span className="font-medium">Create Room</span>
                      <span className="text-xs text-muted-foreground">I have the data</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => setMode('p2p-join')}
                    >
                      <Smartphone className="w-6 h-6 text-primary" />
                      <span className="font-medium">Join Room</span>
                      <span className="text-xs text-muted-foreground">I have a code</span>
                    </Button>
                  </div>

                  {/* Paired Devices Section - Future enhancement */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Previously Paired Devices
                    </h4>
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No devices paired yet. Create or join a room to pair devices.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card>
                <CardContent className="py-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Tips for Successful Sync
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Use WiFi for faster and more reliable sync</li>
                    <li>• Keep the app in foreground during initial sync</li>
                    <li>• For large weddings, allow a few minutes for full transfer</li>
                    <li>• If connection fails, try generating a new code</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

