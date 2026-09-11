"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Sparkles, Users, Calendar, Wallet, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeddings } from "@/lib/db/hooks";
import { db, initializeDatabase } from "@/lib/db/schema";

const features = [
  {
    icon: Calendar,
    title: "Event Management",
    description: "Track all ceremonies and rituals for your culture",
  },
  {
    icon: Users,
    title: "Family Collaboration",
    description: "Invite family members to help plan and coordinate",
  },
  {
    icon: Wallet,
    title: "Budget Tracking",
    description: "Monitor expenses and stay within budget",
  },
  {
    icon: MapPin,
    title: "Location Sharing",
    description: "Find family members during busy wedding events",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Never miss a task or important deadline",
  },
];

export default function HomeClient() {
  const router = useRouter();
  const weddings = useWeddings();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error("DB init error:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    // If user has weddings, check if there's an active session
    if (isInitialized && weddings && weddings.length > 0) {
      const activeWeddingId = localStorage.getItem("kalyanam_wedding_id");
      if (activeWeddingId) {
        // Active session exists, go to dashboard
        router.push("/dashboard");
      } else {
        // Weddings exist but no active session, go to login to select one
        router.push("/login");
      }
    }
  }, [weddings, isInitialized, router]);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-saffron-50 via-background to-maroon-50/30 dark:from-saffron-950/20 dark:via-background dark:to-maroon-950/20" />
        
        {/* Decorative Pattern */}
        <div className="absolute inset-0 pattern-kolam opacity-50" />
        
        {/* Animated Circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-10 h-10 text-primary" fill="currentColor" />
              <Sparkles className="w-6 h-6 text-accent" />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-vermillion-600 to-secondary bg-clip-text text-transparent">
                Kalyanam
              </span>
            </h1>

            {/* Telugu Title */}
            <p className="text-2xl md:text-3xl font-telugu text-muted-foreground">
              కళ్యాణం
            </p>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Plan your perfect wedding with love, tradition, and ease.
              <br />
              <span className="text-lg">Every culture. Every ritual. One beautiful journey.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button
                size="lg"
                className="text-lg px-8 py-6 gradient-primary hover:opacity-90 transition-opacity"
                onClick={() => router.push("/onboarding")}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Planning
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => router.push("/login")}
              >
                Login / Sync
              </Button>
            </div>
            
            {/* Secondary link */}
            <div className="pt-4">
              <Button
                variant="link"
                className="text-muted-foreground"
                onClick={() => router.push("/cultures")}
              >
                Browse cultural templates first →
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 bg-primary rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need for a Perfect Wedding
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From traditional rituals to modern planning tools, Kalyanam helps you
              manage every aspect of your special day.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cultural Support Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Celebrate Your Culture
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Pre-built templates for various cultures, or create your own custom traditions.
              <br />
              <span className="text-primary">Click any culture to preview all rituals</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { id: "telugu-brahmin", name: "Telugu Brahmin", emoji: "🪔", color: "from-saffron-500 to-vermillion-500", rituals: 20 },
              { id: "hindu-north", name: "North Indian", emoji: "🎊", color: "from-maroon-500 to-pink-500", rituals: 15 },
              { id: "hindu-south", name: "South Indian", emoji: "🌺", color: "from-green-500 to-emerald-500", rituals: 11 },
              { id: "muslim", name: "Muslim", emoji: "🌙", color: "from-emerald-500 to-teal-500", rituals: 13 },
              { id: "christian", name: "Christian", emoji: "⛪", color: "from-blue-500 to-indigo-500", rituals: 19 },
              { id: null, name: "Jewish", emoji: "✡️", color: "from-blue-600 to-purple-600", rituals: "Soon" },
              { id: null, name: "Sikh", emoji: "🙏", color: "from-orange-500 to-yellow-500", rituals: "Soon" },
              { id: "custom", name: "Custom", emoji: "✨", color: "from-purple-500 to-pink-500", rituals: "∞" },
            ].map((culture, index) => (
              <motion.div
                key={culture.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
                onClick={() => culture.id && culture.id !== 'custom' && router.push(`/cultures/${culture.id}`)}
              >
                <div className={`p-4 rounded-xl bg-gradient-to-br ${culture.color} text-white text-center hover:scale-105 transition-transform duration-200 relative overflow-hidden`}>
                  <span className="text-3xl mb-2 block">{culture.emoji}</span>
                  <span className="text-sm font-medium">{culture.name}</span>
                  <span className="text-xs opacity-80 block mt-1">
                    {typeof culture.rituals === 'number' ? `${culture.rituals} rituals` : culture.rituals}
                  </span>
                  {culture.id && culture.id !== 'custom' && (
                    <span className="absolute top-2 right-2 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                      Preview →
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => router.push("/cultures")}>
              View All Cultural Templates
            </Button>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Your Data, Your Control
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              All your wedding data stays on your device. No cloud servers, no data mining.
              Share only what you want, with whom you want.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                🔒 Local Storage
              </span>
              <span className="px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                🚫 No Server Required
              </span>
              <span className="px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                📱 Works Offline
              </span>
              <span className="px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                🔐 Optional Encrypted Sync
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-warm opacity-90" />
        <div className="absolute inset-0 pattern-paisley" />
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Ready to Plan Your Dream Wedding?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of families who trust Kalyanam to make their special day perfect.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90"
              onClick={() => router.push("/onboarding")}
            >
              <Heart className="w-5 h-5 mr-2" />
              Get Started Free
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            Made with <Heart className="w-4 h-4 text-red-500" fill="currentColor" /> for beautiful beginnings
          </p>
          <p className="text-sm mt-3">
            Product &amp; design by{" "}
            <a
              href="https://harini-amperayani.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Harini Amperayani
            </a>
            {" · "}Engineering by{" "}
            <a
              href="https://www.linkedin.com/in/ongolemadangopal/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Madan Gopal Ongole
            </a>
          </p>
          <p className="text-sm mt-1">
            <a
              href="https://github.com/omgr/kalyanam"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground hover:underline"
            >
              Free and open source on GitHub
            </a>
          </p>
          <p className="text-sm mt-2">© {new Date().getFullYear()} Kalyanam. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

