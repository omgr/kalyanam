"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  PieChart,
  Receipt,
  AlertTriangle,
  Camera,
  Upload,
  CreditCard,
  Calendar,
  Clock,
  Check,
  RefreshCw,
  FileText,
  Bell,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useWedding,
  useBudgetCategories,
  useExpenses,
  useBudgetSummary,
  useVendors,
  useFamilyMembers,
} from "@/lib/db/hooks";
import { db, Expense, PaymentInstallment, Attachment } from "@/lib/db/schema";
import { generateId, formatCurrency, formatDate } from "@/lib/utils";

export default function BudgetPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "payments" | "reconcile">("overview");
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newExpense, setNewExpense] = useState({
    categoryId: "",
    vendorId: "",
    description: "",
    amount: "",
    paidTo: "",
    paymentMethod: "cash" as Expense["paymentMethod"],
    paymentStatus: "pending" as Expense["paymentStatus"],
    amountPaid: "",
    dueDate: "",
    notes: "",
    // Installment options
    useInstallments: false,
    installmentType: "equal" as "equal" | "custom",
    numberOfInstallments: 3,
    startDate: "",
  });

  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [installments, setInstallments] = useState<Partial<PaymentInstallment>[]>([]);

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(storedWeddingId);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const categories = useBudgetCategories(weddingId ?? undefined);
  const expenses = useExpenses(weddingId ?? undefined);
  const summary = useBudgetSummary(weddingId ?? undefined);
  const vendors = useVendors(weddingId ?? undefined);
  const familyMembers = useFamilyMembers(weddingId ?? undefined);

  // Generate installments based on settings
  const generateInstallments = () => {
    if (!newExpense.amount || !newExpense.startDate) return;
    
    const totalAmount = parseFloat(newExpense.amount);
    const numInstallments = newExpense.numberOfInstallments;
    const installmentAmount = Math.floor(totalAmount / numInstallments);
    const remainder = totalAmount - (installmentAmount * (numInstallments - 1));
    
    const startDate = new Date(newExpense.startDate);
    const newInstallments: Partial<PaymentInstallment>[] = [];
    
    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      newInstallments.push({
        id: generateId(),
        description: `Installment ${i + 1} of ${numInstallments}`,
        amount: i === numInstallments - 1 ? remainder : installmentAmount,
        dueDate,
        paidAmount: 0,
        status: "pending",
        reminderSent: false,
      });
    }
    
    setInstallments(newInstallments);
  };

  // Handle receipt capture/upload
  const handleReceiptCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setReceiptImage(base64);
      
      // TODO: In future, integrate OCR to extract amount and vendor
      // For now, just store the image
    };
    reader.readAsDataURL(file);
  };

  const handleAddExpense = async () => {
    if (!weddingId || !newExpense.categoryId || !newExpense.description || !newExpense.amount)
      return;

    const receipt: Attachment | undefined = receiptImage ? {
      id: generateId(),
      name: "Receipt",
      type: "image",
      size: receiptImage.length,
      data: receiptImage,
      createdAt: new Date(),
    } : undefined;

    const paymentSchedule: PaymentInstallment[] | undefined = 
      newExpense.useInstallments && installments.length > 0
        ? installments.map((inst) => ({
            id: inst.id || generateId(),
            description: inst.description || "",
            amount: inst.amount || 0,
            dueDate: inst.dueDate || new Date(),
            paidAmount: 0,
            status: "pending" as const,
            reminderSent: false,
          }))
        : undefined;

    await db.expenses.add({
      id: generateId(),
      weddingId,
      categoryId: newExpense.categoryId,
      vendorId: newExpense.vendorId || undefined,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      paidTo: newExpense.paidTo || undefined,
      paymentMethod: newExpense.paymentMethod,
      paymentStatus: newExpense.paymentStatus,
      amountPaid: parseFloat(newExpense.amountPaid) || 0,
      dueDate: newExpense.dueDate ? new Date(newExpense.dueDate) : undefined,
      receipt,
      receipts: receipt ? [receipt] : undefined,
      notes: newExpense.notes || undefined,
      paymentSchedule,
      isReconciled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create reminders for installments
    if (paymentSchedule) {
      for (const inst of paymentSchedule) {
        const reminderDate = new Date(inst.dueDate);
        reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before
        
        await db.reminders.add({
          id: generateId(),
          weddingId,
          relatedTo: "expense",
          title: `Payment Due: ${newExpense.description}`,
          message: `${inst.description} - ${formatCurrency(inst.amount, wedding?.currency || "INR")} due`,
          scheduledFor: reminderDate,
          isTriggered: false,
          createdBy: localStorage.getItem("kalyanam_user_id") || "",
          createdAt: new Date(),
        });
      }
    }

    // Reset form
    setNewExpense({
      categoryId: "",
      vendorId: "",
      description: "",
      amount: "",
      paidTo: "",
      paymentMethod: "cash",
      paymentStatus: "pending",
      amountPaid: "",
      dueDate: "",
      notes: "",
      useInstallments: false,
      installmentType: "equal",
      numberOfInstallments: 3,
      startDate: "",
    });
    setReceiptImage(null);
    setInstallments([]);
    setIsAddingExpense(false);
  };

  const handlePayInstallment = async (expenseId: string, installmentId: string, amount: number) => {
    const expense = expenses?.find((e) => e.id === expenseId);
    if (!expense?.paymentSchedule) return;

    const updatedSchedule = expense.paymentSchedule.map((inst) =>
      inst.id === installmentId
        ? {
            ...inst,
            paidAmount: inst.paidAmount + amount,
            paidDate: new Date(),
            status: inst.paidAmount + amount >= inst.amount ? "paid" as const : "partial" as const,
          }
        : inst
    );

    const totalPaid = updatedSchedule.reduce((sum, inst) => sum + inst.paidAmount, 0);
    const newStatus = totalPaid >= expense.amount ? "paid" : totalPaid > 0 ? "partial" : "pending";

    await db.expenses.update(expenseId, {
      paymentSchedule: updatedSchedule,
      amountPaid: totalPaid,
      paymentStatus: newStatus,
      updatedAt: new Date(),
    });
  };

  const handleReconcile = async (expenseId: string, reference: string) => {
    await db.expenses.update(expenseId, {
      isReconciled: true,
      reconciledAt: new Date(),
      bankReference: reference,
      updatedAt: new Date(),
    });
  };

  // Pending payments calculation
  const pendingPayments = expenses?.filter(
    (e) => e.paymentStatus !== "paid" && e.paymentSchedule
  ).flatMap((e) => 
    e.paymentSchedule?.filter((inst) => inst.status !== "paid").map((inst) => ({
      expense: e,
      installment: inst,
    })) || []
  ).sort((a, b) => new Date(a.installment.dueDate).getTime() - new Date(b.installment.dueDate).getTime());

  const overduePayments = pendingPayments?.filter(
    (p) => new Date(p.installment.dueDate) < new Date()
  );

  if (!weddingId || !wedding) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Wallet className="w-8 h-8 text-primary" />
              Budget & Expenses
            </h1>
            <p className="text-muted-foreground">
              Track your wedding budget, expenses, and payments
            </p>
          </div>
          <Button onClick={() => setIsAddingExpense(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: PieChart },
            { id: "expenses", label: "Expenses", icon: Receipt },
            { id: "payments", label: "Payment Schedule", icon: CreditCard },
            { id: "reconcile", label: "Reconciliation", icon: RefreshCw },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Budget Overview */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.totalBudget, wedding.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(summary.totalSpent, wedding.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.percentSpent.toFixed(1)}% of budget
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p
                  className={`text-2xl font-bold ${
                    summary.totalRemaining >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.totalRemaining, wedding.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(summary.totalPending, wedding.currency)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overdue Payments Alert */}
        {overduePayments && overduePayments.length > 0 && (
          <Card className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Overdue Payments ({overduePayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overduePayments.slice(0, 3).map((item) => (
                  <div
                    key={`${item.expense.id}-${item.installment.id}`}
                    className="flex items-center justify-between p-2 bg-white dark:bg-black/20 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.installment.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {formatCurrency(item.installment.amount - item.installment.paidAmount, wedding.currency)}
                      </p>
                      <p className="text-xs text-red-500">
                        Due {formatDate(item.installment.dueDate, "relative")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Expense Form */}
        {isAddingExpense && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Add New Expense
              </CardTitle>
              <CardDescription>
                Track expenses with optional receipt scanning and payment schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Receipt Upload */}
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptCapture}
                  className="hidden"
                />
                {receiptImage ? (
                  <div className="relative">
                    <img
                      src={receiptImage}
                      alt="Receipt"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setReceiptImage(null)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Scan or upload a receipt
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newExpense.categoryId}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, categoryId: e.target.value })
                    }
                  >
                    <option value="">Select category...</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor (Optional)</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newExpense.vendorId}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, vendorId: e.target.value })
                    }
                  >
                    <option value="">Select vendor...</option>
                    {vendors?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Photographer advance"
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="50000"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paidTo">Paid To</Label>
                  <Input
                    id="paidTo"
                    placeholder="e.g., Studio XYZ"
                    value={newExpense.paidTo}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, paidTo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={newExpense.paymentMethod}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        paymentMethod: e.target.value as Expense["paymentMethod"],
                      })
                    }
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="upi">📱 UPI</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                    <option value="cheque">📄 Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newExpense.dueDate}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Payment Schedule Options */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useInstallments"
                    checked={newExpense.useInstallments}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, useInstallments: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="useInstallments" className="cursor-pointer">
                    Pay in Installments
                  </Label>
                </div>

                {newExpense.useInstallments && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Number of Installments</Label>
                        <Input
                          type="number"
                          min="2"
                          value={newExpense.numberOfInstallments}
                          onChange={(e) =>
                            setNewExpense({
                              ...newExpense,
                              numberOfInstallments: parseInt(e.target.value) || 2,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={newExpense.startDate}
                          onChange={(e) =>
                            setNewExpense({ ...newExpense, startDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={generateInstallments}
                          disabled={!newExpense.amount || !newExpense.startDate}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Generate Schedule
                        </Button>
                      </div>
                    </div>

                    {installments.length > 0 && (
                      <div className="space-y-2">
                        <Label>Payment Schedule</Label>
                        <div className="space-y-2">
                          {installments.map((inst, index) => (
                            <div
                              key={inst.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                            >
                              <span className="text-sm">{inst.description}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">
                                  {formatCurrency(inst.amount || 0, wedding.currency)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {inst.dueDate ? formatDate(inst.dueDate, "short") : ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Additional notes..."
                  value={newExpense.notes}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAddingExpense(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddExpense}
                  disabled={!newExpense.categoryId || !newExpense.description || !newExpense.amount}
                >
                  Add Expense
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && summary && (
          <>
            {/* Budget Progress */}
            {summary.totalBudget > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Budget Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(summary.percentSpent, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          summary.percentSpent > 100
                            ? "bg-red-500"
                            : summary.percentSpent > 90
                            ? "bg-orange-500"
                            : summary.percentSpent > 75
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {formatCurrency(summary.totalSpent, wedding.currency)} spent
                      </span>
                      <span>
                        {formatCurrency(summary.totalBudget, wedding.currency)} total
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Budget by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
                    summary.categoryBreakdown.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">
                              {formatCurrency(category.spent, wedding.currency)}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              / {formatCurrency(category.allocatedAmount, wedding.currency)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(category.percentUsed, 100)}%`,
                              backgroundColor: category.color,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No categories set up yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                All Expenses ({expenses?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenses && expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((expense) => {
                      const category = categories?.find((c) => c.id === expense.categoryId);
                      const isExpanded = expandedExpense === expense.id;
                      
                      return (
                        <div
                          key={expense.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedExpense(isExpanded ? null : expense.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{category?.icon || "💰"}</span>
                              <div>
                                <p className="font-medium">{expense.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {category?.name}
                                  {expense.paidTo && ` • ${expense.paidTo}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-semibold">
                                  {formatCurrency(expense.amount, wedding.currency)}
                                </p>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    expense.paymentStatus === "paid"
                                      ? "bg-green-100 text-green-800"
                                      : expense.paymentStatus === "partial"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {expense.paymentStatus}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3 border-t bg-muted/30 space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Amount Paid</p>
                                  <p className="font-medium">
                                    {formatCurrency(expense.amountPaid, wedding.currency)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Remaining</p>
                                  <p className="font-medium">
                                    {formatCurrency(expense.amount - expense.amountPaid, wedding.currency)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Method</p>
                                  <p className="font-medium capitalize">{expense.paymentMethod}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Reconciled</p>
                                  <p className="font-medium">
                                    {expense.isReconciled ? "✅ Yes" : "❌ No"}
                                  </p>
                                </div>
                              </div>

                              {expense.paymentSchedule && expense.paymentSchedule.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Payment Schedule</p>
                                  <div className="space-y-2">
                                    {expense.paymentSchedule.map((inst) => (
                                      <div
                                        key={inst.id}
                                        className={`flex items-center justify-between p-2 rounded ${
                                          inst.status === "paid"
                                            ? "bg-green-50 dark:bg-green-950/20"
                                            : inst.status === "overdue" ||
                                              new Date(inst.dueDate) < new Date()
                                            ? "bg-red-50 dark:bg-red-950/20"
                                            : "bg-white dark:bg-black/20"
                                        }`}
                                      >
                                        <div>
                                          <p className="text-sm font-medium">{inst.description}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Due: {formatDate(inst.dueDate, "short")}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">
                                            {formatCurrency(inst.amount, wedding.currency)}
                                          </span>
                                          {inst.status !== "paid" && (
                                            <Button
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handlePayInstallment(expense.id, inst.id, inst.amount);
                                              }}
                                            >
                                              <Check className="w-3 h-3 mr-1" />
                                              Pay
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {expense.receipts && expense.receipts.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Receipts</p>
                                  <div className="flex gap-2">
                                    {expense.receipts.map((receipt) => (
                                      <img
                                        key={receipt.id}
                                        src={receipt.data}
                                        alt="Receipt"
                                        className="w-20 h-20 object-cover rounded border"
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No expenses recorded yet
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Upcoming Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayments && pendingPayments.length > 0 ? (
                <div className="space-y-3">
                  {pendingPayments.map((item) => (
                    <div
                      key={`${item.expense.id}-${item.installment.id}`}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        new Date(item.installment.dueDate) < new Date()
                          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                          : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium">{item.expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.installment.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {formatDate(item.installment.dueDate, "long")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold">
                            {formatCurrency(
                              item.installment.amount - item.installment.paidAmount,
                              wedding.currency
                            )}
                          </p>
                          {new Date(item.installment.dueDate) < new Date() && (
                            <span className="text-xs text-red-500">Overdue</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            handlePayInstallment(
                              item.expense.id,
                              item.installment.id,
                              item.installment.amount - item.installment.paidAmount
                            )
                          }
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No pending payments</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reconciliation Tab */}
        {activeTab === "reconcile" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Reconciliation
              </CardTitle>
              <CardDescription>
                Match your expenses with bank transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses?.filter((e) => !e.isReconciled && e.paymentStatus !== "pending").map((expense) => {
                  const category = categories?.find((c) => c.id === expense.categoryId);
                  
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category?.icon || "💰"}</span>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(expense.amountPaid, wedding.currency)} paid
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Bank ref #"
                          className="w-32"
                          id={`ref-${expense.id}`}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const ref = (document.getElementById(`ref-${expense.id}`) as HTMLInputElement)?.value;
                            handleReconcile(expense.id, ref);
                          }}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Reconcile
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {(!expenses || expenses.filter((e) => !e.isReconciled && e.paymentStatus !== "pending").length === 0) && (
                  <div className="text-center py-8">
                    <Check className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p className="text-muted-foreground">All expenses are reconciled!</p>
                  </div>
                )}
              </div>

              {/* Reconciled Summary */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">Reconciliation Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Total Reconciled</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(
                        expenses?.filter((e) => e.isReconciled).reduce((sum, e) => sum + e.amountPaid, 0) || 0,
                        wedding.currency
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Pending Reconciliation</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {formatCurrency(
                        expenses?.filter((e) => !e.isReconciled && e.paymentStatus !== "pending").reduce((sum, e) => sum + e.amountPaid, 0) || 0,
                        wedding.currency
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
