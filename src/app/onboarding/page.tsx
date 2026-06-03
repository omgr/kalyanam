"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Users,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db/schema";
import { allCultures, teluguBrahminBudgetCategories, defaultBudgetCategories } from "@/lib/cultures";
import { generateId } from "@/lib/utils";

const steps = [
  { id: 1, title: "Basic Info", icon: Heart },
  { id: 2, title: "Culture", icon: Sparkles },
  { id: 3, title: "Family", icon: Users },
  { id: 4, title: "Date", icon: Calendar },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    weddingName: "",
    brideName: "",
    groomName: "",
    cultureId: "telugu-brahmin",
    customCultureName: "",
    weddingDate: "",
    venue: "",
    city: "",
    budget: "",
    currency: "INR",
    userName: "",
    userPhone: "",
    userEmail: "",
    userRole: "owner" as const,
  });

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.brideName && formData.groomName;
      case 2:
        return formData.cultureId || formData.customCultureName;
      case 3:
        return formData.userName;
      case 4:
        return formData.weddingDate;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCreateWedding = async () => {
    setIsCreating(true);

    try {
      const userId = generateId();
      const weddingId = generateId();

      // Create user
      await db.users.add({
        id: userId,
        name: formData.userName,
        email: formData.userEmail || undefined,
        phone: formData.userPhone || undefined,
        role: "owner",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create wedding
      await db.weddings.add({
        id: weddingId,
        name:
          formData.weddingName ||
          `${formData.brideName} & ${formData.groomName}'s Wedding`,
        brideName: formData.brideName,
        groomName: formData.groomName,
        weddingDate: new Date(formData.weddingDate),
        cultureId: formData.cultureId,
        customCultureName: formData.customCultureName || undefined,
        venue: formData.venue || undefined,
        city: formData.city || undefined,
        status: "planning",
        budget: parseFloat(formData.budget) || 0,
        currency: formData.currency,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add user as family member
      await db.familyMembers.add({
        id: generateId(),
        weddingId,
        userId,
        name: formData.userName,
        relation: "Wedding Planner",
        side: "mutual",
        phone: formData.userPhone || undefined,
        email: formData.userEmail || undefined,
        role: "primary",
        canEdit: true,
        canViewBudget: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add budget categories based on culture
      const budgetCategories =
        formData.cultureId === "telugu-brahmin"
          ? teluguBrahminBudgetCategories
          : defaultBudgetCategories;

      for (const category of budgetCategories) {
        await db.budgetCategories.add({
          id: generateId(),
          weddingId,
          name: category.name,
          allocatedAmount: 0,
          color: category.color,
          icon: category.icon,
          order: category.order,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Add culture if custom or copy rituals as events
      const culture = allCultures.find((c) => c.id === formData.cultureId);
      if (culture) {
        // Copy culture to database if not exists
        const existingCulture = await db.cultures.get(culture.id);
        if (!existingCulture) {
          await db.cultures.add(culture);
        }

        // Create events from rituals
        const weddingDate = new Date(formData.weddingDate);
        for (const ritual of culture.rituals) {
          const eventDate = new Date(weddingDate);
          eventDate.setDate(eventDate.getDate() + (ritual.typicalDay || 0));

          await db.events.add({
            id: generateId(),
            weddingId,
            ritualId: ritual.id,
            name: ritual.name,
            localName: ritual.localName,
            description: ritual.description,
            date: eventDate,
            status: "scheduled",
            category: ritual.category,
            order: ritual.order,
            checklist: ritual.requiredItems?.map((item) => ({
              id: generateId(),
              text: item,
              isCompleted: false,
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Store current user ID in localStorage
      localStorage.setItem("kalyanam_user_id", userId);
      localStorage.setItem("kalyanam_wedding_id", weddingId);

      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating wedding:", error);
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-saffron-50 via-background to-maroon-50/30 dark:from-saffron-950/20 dark:via-background dark:to-maroon-950/20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Step Indicators */}
            {steps.map((step) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <motion.div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                    step.id <= currentStep
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-muted text-muted-foreground"
                  }`}
                  animate={{
                    scale: step.id === currentStep ? 1.1 : 1,
                  }}
                >
                  {step.id < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </motion.div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-display text-center">
                  {currentStep === 1 && "Tell us about the couple 💑"}
                  {currentStep === 2 && "Choose your culture & traditions 🪔"}
                  {currentStep === 3 && "About you 👤"}
                  {currentStep === 4 && "When's the big day? 📅"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brideName">Bride's Name *</Label>
                        <Input
                          id="brideName"
                          placeholder="e.g., Priya"
                          value={formData.brideName}
                          onChange={(e) => updateFormData("brideName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="groomName">Groom's Name *</Label>
                        <Input
                          id="groomName"
                          placeholder="e.g., Rahul"
                          value={formData.groomName}
                          onChange={(e) => updateFormData("groomName", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weddingName">Wedding Name (optional)</Label>
                      <Input
                        id="weddingName"
                        placeholder="e.g., Priya & Rahul's Wedding"
                        value={formData.weddingName}
                        onChange={(e) => updateFormData("weddingName", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to auto-generate
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Culture Selection */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-center mb-4">
                      Select your culture to get pre-built rituals and templates
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {allCultures.map((culture) => (
                        <motion.div
                          key={culture.id}
                          whileHover={{ scale: 1.02 }}
                          className={`relative rounded-xl border-2 transition-all overflow-hidden ${
                            formData.cultureId === culture.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <button
                            onClick={() => updateFormData("cultureId", culture.id)}
                            className="w-full p-4 text-left"
                          >
                            <div className="font-medium">{culture.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {culture.region}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {culture.rituals.length} rituals
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/cultures/${culture.id}`, '_blank');
                            }}
                            className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                          >
                            Preview →
                          </button>
                        </motion.div>
                      ))}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateFormData("cultureId", "custom")}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.cultureId === "custom"
                            ? "border-primary bg-primary/5"
                            : "border-dashed border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-medium">✨ Custom</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Create your own
                        </div>
                      </motion.button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      💡 Click "Preview →" to see all rituals before selecting
                    </p>

                    {formData.cultureId === "custom" && (
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="customCulture">Culture Name</Label>
                        <Input
                          id="customCulture"
                          placeholder="e.g., Bengali Hindu"
                          value={formData.customCultureName}
                          onChange={(e) =>
                            updateFormData("customCultureName", e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: User Info */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="userName">Your Name *</Label>
                      <Input
                        id="userName"
                        placeholder="e.g., Lakshmi"
                        value={formData.userName}
                        onChange={(e) => updateFormData("userName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userPhone">Phone Number (optional)</Label>
                      <Input
                        id="userPhone"
                        type="tel"
                        placeholder="e.g., +91 98765 43210"
                        value={formData.userPhone}
                        onChange={(e) => updateFormData("userPhone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userEmail">Email (optional)</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        placeholder="e.g., lakshmi@email.com"
                        value={formData.userEmail}
                        onChange={(e) => updateFormData("userEmail", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Date & Budget */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="weddingDate">Wedding Date *</Label>
                      <Input
                        id="weddingDate"
                        type="date"
                        value={formData.weddingDate}
                        onChange={(e) => updateFormData("weddingDate", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="venue">Venue (optional)</Label>
                        <Input
                          id="venue"
                          placeholder="e.g., Grand Palace"
                          value={formData.venue}
                          onChange={(e) => updateFormData("venue", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City (optional)</Label>
                        <Input
                          id="city"
                          placeholder="e.g., Hyderabad"
                          value={formData.city}
                          onChange={(e) => updateFormData("city", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="budget">Budget (optional)</Label>
                        <Input
                          id="budget"
                          type="number"
                          placeholder="e.g., 1000000"
                          value={formData.budget}
                          onChange={(e) => updateFormData("budget", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <select
                          id="currency"
                          value={formData.currency}
                          onChange={(e) => updateFormData("currency", e.target.value)}
                          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="INR">₹ INR</option>
                          <option value="USD">$ USD</option>
                          <option value="GBP">£ GBP</option>
                          <option value="EUR">€ EUR</option>
                          <option value="AED">د.إ AED</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  {currentStep < 4 ? (
                    <Button onClick={handleNext} disabled={!canProceed()}>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCreateWedding}
                      disabled={!canProceed() || isCreating}
                      className="gradient-primary"
                    >
                      {isCreating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Start Planning!
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

