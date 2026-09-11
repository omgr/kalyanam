"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Wallet,
  CheckSquare,
  MapPin,
  Bell,
  MessageSquare,
  Store,
  Camera,
  CreditCard,
  PieChart,
  Clock,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "Event Management",
    description: "Plan and track all wedding ceremonies and rituals. Get pre-built templates for your culture or create custom events.",
    highlights: ["Cultural templates", "Timeline view", "Checklists", "Status tracking"],
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "Guest Management",
    description: "Manage your entire guest list with RSVP tracking, dietary preferences, and seating arrangements.",
    highlights: ["RSVP tracking", "Side organization", "Plus-ones", "Export to CSV"],
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Wallet,
    title: "Budget & Expenses",
    description: "Track every rupee with category-wise budgeting, expense logging, and visual analytics.",
    highlights: ["Category budgets", "Receipt scanning", "Payment tracking", "Visual reports"],
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Store,
    title: "Vendor Management",
    description: "Keep track of all vendors, contracts, payments, and ratings in one place.",
    highlights: ["Vendor profiles", "Contract tracking", "Payment schedules", "Ratings"],
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    description: "Never miss a deadline with priority-based tasks, assignments, and reminders.",
    highlights: ["Priority levels", "Assignments", "Due dates", "Progress tracking"],
    color: "from-orange-500 to-red-500",
  },
  {
    icon: MapPin,
    title: "Location Tracking",
    description: "Find family members during busy wedding events with GPS and zone-based tracking.",
    highlights: ["GPS tracking", "Indoor zones", "One-tap navigation", "Privacy controls"],
    color: "from-teal-500 to-blue-500",
  },
  {
    icon: CreditCard,
    title: "Payment Tracking",
    description: "Track installments, partial payments, and pending dues with automatic reminders.",
    highlights: ["Installment plans", "Payment stages", "Due reminders", "Reconciliation"],
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Camera,
    title: "Receipt Scanning",
    description: "Scan bills and receipts to automatically extract amounts and details.",
    highlights: ["Camera capture", "Auto-extract", "Attach to expenses", "Cloud backup"],
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Get timely notifications for tasks, payments, events, and follow-ups.",
    highlights: ["Event reminders", "Payment dues", "Task deadlines", "Custom alerts"],
    color: "from-amber-500 to-yellow-500",
  },
  {
    icon: MessageSquare,
    title: "Family Communication",
    description: "Stay connected with family members through in-app messages and announcements.",
    highlights: ["Direct messages", "Announcements", "Event updates", "Read receipts"],
    color: "from-cyan-500 to-teal-500",
  },
];

const cultures = [
  { name: "Telugu Brahmin", emoji: "🪔", rituals: 20 },
  { name: "North Indian Hindu", emoji: "🎊", rituals: 15 },
  { name: "South Indian Hindu", emoji: "🌺", rituals: 11 },
  { name: "Muslim (Nikah)", emoji: "🌙", rituals: 13 },
  { name: "Christian", emoji: "⛪", rituals: 19 },
  { name: "Custom", emoji: "✨", rituals: "Unlimited" },
];

export default function ExploreClient() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-br from-saffron-50 via-background to-maroon-50/30 dark:from-saffron-950/20 dark:via-background dark:to-maroon-950/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-primary" fill="currentColor" />
            <span className="text-xl font-display font-bold">Kalyanam</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push("/")}>
              Home
            </Button>
            <Button onClick={() => router.push("/onboarding")}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start Planning
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Explore <span className="text-primary">Kalyanam</span> Features
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to plan, manage, and celebrate your perfect wedding
          </p>
        </motion.div>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-2xl font-display font-bold mb-8 text-center">
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-all group">
                  <CardHeader>
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {feature.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="text-sm text-muted-foreground flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Cultural Support */}
        <section className="mb-20">
          <h2 className="text-2xl font-display font-bold mb-8 text-center">
            Cultural Templates
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Pre-built ceremony templates for various cultures, or create your own custom traditions.
            <br />
            <span className="text-primary font-medium">Click any culture to preview all rituals →</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cultures.map((culture, index) => (
              <motion.div
                key={culture.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="text-center hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer"
                  onClick={() => {
                    const cultureIds: Record<string, string> = {
                      'Telugu Brahmin': 'telugu-brahmin',
                      'North Indian Hindu': 'hindu-north',
                      'South Indian Hindu': 'hindu-south',
                      'Muslim (Nikah)': 'muslim',
                      'Christian': 'christian',
                    };
                    const id = cultureIds[culture.name];
                    if (id) router.push(`/cultures/${id}`);
                    else if (culture.name === 'Custom') router.push('/onboarding');
                    else router.push('/cultures');
                  }}
                >
                  <CardContent className="pt-6">
                    <span className="text-4xl mb-2 block">{culture.emoji}</span>
                    <h3 className="font-medium text-sm mb-1">{culture.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {culture.rituals} rituals
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => router.push('/cultures')}>
              Browse All Templates
            </Button>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="mb-20">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-display font-bold mb-4">
                Your Privacy, Protected
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                All your wedding data stays on your device. No cloud servers, no data mining.
                You control what you share and with whom.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-4 py-2 rounded-full bg-white dark:bg-black/20 text-sm">
                  🔒 Local Storage Only
                </span>
                <span className="px-4 py-2 rounded-full bg-white dark:bg-black/20 text-sm">
                  📴 Works Offline
                </span>
                <span className="px-4 py-2 rounded-full bg-white dark:bg-black/20 text-sm">
                  🔐 Optional Encrypted Sync
                </span>
                <span className="px-4 py-2 rounded-full bg-white dark:bg-black/20 text-sm">
                  💾 Export Your Data Anytime
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-display font-bold mb-4">
              Ready to Plan Your Dream Wedding?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start planning in minutes. No account required.
            </p>
            <Button
              size="lg"
              className="gradient-primary text-lg px-8"
              onClick={() => router.push("/onboarding")}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Planning Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            Made with <Heart className="w-4 h-4 text-red-500" fill="currentColor" /> for beautiful beginnings
          </p>
        </div>
      </footer>
    </main>
  );
}

