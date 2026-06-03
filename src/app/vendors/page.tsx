"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Store,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Trash2,
  Globe,
  CreditCard,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useVendors, useWedding } from "@/lib/db/hooks";
import { db, Vendor } from "@/lib/db/schema";
import { generateId, formatCurrency } from "@/lib/utils";

const vendorCategories = [
  "Photography",
  "Videography",
  "Catering",
  "Decoration",
  "Venue",
  "Music/DJ",
  "Makeup & Beauty",
  "Mehendi Artist",
  "Priest/Officiant",
  "Florist",
  "Jeweler",
  "Clothing/Tailor",
  "Invitation Cards",
  "Transportation",
  "Accommodation",
  "Lighting",
  "Tent/Pandal",
  "Other",
];

export default function VendorsPage() {
  const router = useRouter();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    quotedAmount: "",
    finalAmount: "",
    advancePaid: "",
    paymentStatus: "pending" as Vendor["paymentStatus"],
    contractDate: "",
    serviceDate: "",
    rating: "",
    notes: "",
  });

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(storedWeddingId);
  }, [router]);

  const wedding = useWedding(weddingId ?? undefined);
  const vendors = useVendors(weddingId ?? undefined);

  const filteredVendors = vendors?.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || vendor.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      website: "",
      quotedAmount: "",
      finalAmount: "",
      advancePaid: "",
      paymentStatus: "pending",
      contractDate: "",
      serviceDate: "",
      rating: "",
      notes: "",
    });
    setEditingVendor(null);
  };

  const handleSubmit = async () => {
    if (!weddingId || !formData.name || !formData.category) return;

    const vendorData = {
      name: formData.name,
      category: formData.category,
      contactPerson: formData.contactPerson || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      website: formData.website || undefined,
      quotedAmount: formData.quotedAmount ? parseFloat(formData.quotedAmount) : undefined,
      finalAmount: formData.finalAmount ? parseFloat(formData.finalAmount) : undefined,
      advancePaid: formData.advancePaid ? parseFloat(formData.advancePaid) : undefined,
      paymentStatus: formData.paymentStatus,
      contractDate: formData.contractDate ? new Date(formData.contractDate) : undefined,
      serviceDate: formData.serviceDate ? new Date(formData.serviceDate) : undefined,
      rating: formData.rating ? parseInt(formData.rating) : undefined,
      notes: formData.notes || undefined,
      updatedAt: new Date(),
    };

    if (editingVendor) {
      await db.vendors.update(editingVendor.id, vendorData);
    } else {
      await db.vendors.add({
        id: generateId(),
        weddingId,
        ...vendorData,
        createdAt: new Date(),
      } as Vendor);
    }

    resetForm();
    setIsAddingVendor(false);
  };

  const handleEdit = (vendor: Vendor) => {
    setFormData({
      name: vendor.name,
      category: vendor.category,
      contactPerson: vendor.contactPerson || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      website: vendor.website || "",
      quotedAmount: vendor.quotedAmount?.toString() || "",
      finalAmount: vendor.finalAmount?.toString() || "",
      advancePaid: vendor.advancePaid?.toString() || "",
      paymentStatus: vendor.paymentStatus,
      contractDate: vendor.contractDate
        ? new Date(vendor.contractDate).toISOString().split("T")[0]
        : "",
      serviceDate: vendor.serviceDate
        ? new Date(vendor.serviceDate).toISOString().split("T")[0]
        : "",
      rating: vendor.rating?.toString() || "",
      notes: vendor.notes || "",
    });
    setEditingVendor(vendor);
    setIsAddingVendor(true);
  };

  const handleDelete = async (vendorId: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      await db.vendors.delete(vendorId);
    }
  };

  const getPaymentStatusBadge = (status: Vendor["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "partial":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  const getPaymentStatusIcon = (status: Vendor["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "partial":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Calculate totals
  const totalQuoted = vendors?.reduce((sum, v) => sum + (v.quotedAmount || 0), 0) || 0;
  const totalFinal = vendors?.reduce((sum, v) => sum + (v.finalAmount || 0), 0) || 0;
  const totalPaid = vendors?.reduce((sum, v) => sum + (v.advancePaid || 0), 0) || 0;
  const totalPending = totalFinal - totalPaid;

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
              <Store className="w-8 h-8 text-primary" />
              Vendors
            </h1>
            <p className="text-muted-foreground">
              {vendors?.length || 0} vendors • {formatCurrency(totalPending, wedding.currency)} pending
            </p>
          </div>
          <Button onClick={() => setIsAddingVendor(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-bold">{vendors?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalFinal || totalQuoted, wedding.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid, wedding.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalPending, wedding.currency)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {vendorCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Add/Edit Vendor Form */}
        {isAddingVendor && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                {editingVendor ? "Edit Vendor" : "Add New Vendor"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input
                    id="vendorName"
                    placeholder="e.g., Royal Photography"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">Select category...</option>
                    {vendorCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Name"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vendor@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://..."
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quotedAmount">Quoted Amount</Label>
                  <Input
                    id="quotedAmount"
                    type="number"
                    placeholder="100000"
                    value={formData.quotedAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, quotedAmount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finalAmount">Final Amount</Label>
                  <Input
                    id="finalAmount"
                    type="number"
                    placeholder="95000"
                    value={formData.finalAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, finalAmount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advancePaid">Advance Paid</Label>
                  <Input
                    id="advancePaid"
                    type="number"
                    placeholder="20000"
                    value={formData.advancePaid}
                    onChange={(e) =>
                      setFormData({ ...formData, advancePaid: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={formData.paymentStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentStatus: e.target.value as Vendor["paymentStatus"],
                      })
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractDate">Contract Date</Label>
                  <Input
                    id="contractDate"
                    type="date"
                    value={formData.contractDate}
                    onChange={(e) =>
                      setFormData({ ...formData, contractDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceDate">Service Date</Label>
                  <Input
                    id="serviceDate"
                    type="date"
                    value={formData.serviceDate}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-input bg-background px-3"
                    value={formData.rating}
                    onChange={(e) =>
                      setFormData({ ...formData, rating: e.target.value })
                    }
                  >
                    <option value="">Not rated</option>
                    <option value="1">⭐ 1</option>
                    <option value="2">⭐⭐ 2</option>
                    <option value="3">⭐⭐⭐ 3</option>
                    <option value="4">⭐⭐⭐⭐ 4</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Any additional notes..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsAddingVendor(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.category}
                >
                  {editingVendor ? "Update Vendor" : "Add Vendor"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors && filteredVendors.length > 0 ? (
            filteredVendors.map((vendor, index) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{vendor.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {vendor.category}
                        </span>
                      </div>
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getPaymentStatusBadge(
                          vendor.paymentStatus
                        )}`}
                      >
                        {getPaymentStatusIcon(vendor.paymentStatus)}
                        {vendor.paymentStatus}
                      </span>
                    </div>

                    {vendor.contactPerson && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Contact: {vendor.contactPerson}
                      </p>
                    )}

                    <div className="space-y-1 text-sm">
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                        >
                          <Phone className="w-3 h-3" />
                          {vendor.phone}
                        </a>
                      )}
                      {vendor.email && (
                        <a
                          href={`mailto:${vendor.email}`}
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                        >
                          <Mail className="w-3 h-3" />
                          {vendor.email}
                        </a>
                      )}
                    </div>

                    {(vendor.finalAmount || vendor.quotedAmount) && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              vendor.finalAmount || vendor.quotedAmount || 0,
                              wedding.currency
                            )}
                          </span>
                        </div>
                        {vendor.advancePaid && vendor.advancePaid > 0 && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Paid:</span>
                            <span className="text-green-600">
                              {formatCurrency(vendor.advancePaid, wedding.currency)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {vendor.rating && (
                      <div className="mt-2 flex items-center gap-1">
                        {Array.from({ length: vendor.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 text-yellow-500"
                            fill="currentColor"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(vendor)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(vendor.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Store className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || filterCategory !== "all"
                    ? "Try adjusting your filters"
                    : "Start adding vendors for your wedding"}
                </p>
                <Button onClick={() => setIsAddingVendor(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Vendor
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

