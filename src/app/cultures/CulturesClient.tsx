"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Sparkles,
  Calendar,
  Clock,
  ListChecks,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { allCultures } from "@/lib/cultures";

export default function CulturesClient() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCultures = allCultures.filter(
    (culture) =>
      culture.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      culture.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      culture.religion?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCultureEmoji = (cultureId: string) => {
    switch (cultureId) {
      case "telugu-brahmin":
        return "🪔";
      case "hindu-north":
        return "🎊";
      case "hindu-south":
        return "🌺";
      case "muslim":
        return "🌙";
      case "christian":
        return "⛪";
      default:
        return "✨";
    }
  };

  const getCultureColor = (cultureId: string) => {
    switch (cultureId) {
      case "telugu-brahmin":
        return "from-saffron-500 to-vermillion-500";
      case "hindu-north":
        return "from-maroon-500 to-pink-500";
      case "hindu-south":
        return "from-green-500 to-emerald-500";
      case "muslim":
        return "from-emerald-500 to-teal-500";
      case "christian":
        return "from-blue-500 to-indigo-500";
      default:
        return "from-purple-500 to-pink-500";
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-saffron-50 via-background to-maroon-50/30 dark:from-saffron-950/20 dark:via-background dark:to-maroon-950/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-display font-bold mb-2">
            Cultural Templates
          </h1>
          <p className="text-muted-foreground">
            Browse wedding traditions from different cultures. Click on any culture to see all rituals and ceremonies included.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cultures..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-400">Preview Before You Start</p>
              <p className="text-blue-700 dark:text-blue-500">
                Click on any culture to see all the rituals and ceremonies. If something specific to your family is missing, you can always add custom events after creating your wedding.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cultures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCultures.map((culture, index) => {
            const preWeddingCount = culture.rituals.filter(r => r.category === "pre-wedding").length;
            const weddingDayCount = culture.rituals.filter(r => r.category === "wedding-day").length;
            const postWeddingCount = culture.rituals.filter(r => r.category === "post-wedding").length;

            return (
              <motion.div
                key={culture.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 h-full group"
                  onClick={() => router.push(`/cultures/${culture.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Culture Icon */}
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getCultureColor(culture.id)} flex items-center justify-center text-2xl flex-shrink-0`}
                      >
                        {getCultureEmoji(culture.id)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">{culture.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {culture.region}
                              {culture.religion && ` • ${culture.religion}`}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>

                        {culture.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {culture.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                            <Calendar className="w-3 h-3" />
                            {culture.rituals.length} rituals
                          </span>
                          {preWeddingCount > 0 && (
                            <span className="text-muted-foreground">
                              {preWeddingCount} pre-wedding
                            </span>
                          )}
                          {weddingDayCount > 0 && (
                            <span className="text-muted-foreground">
                              {weddingDayCount} wedding day
                            </span>
                          )}
                          {postWeddingCount > 0 && (
                            <span className="text-muted-foreground">
                              {postWeddingCount} post-wedding
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Custom Culture Note */}
        <Card className="mt-6">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl flex-shrink-0">
              ✨
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Custom Culture</h3>
              <p className="text-sm text-muted-foreground">
                Don't see your culture? No problem! You can create a wedding with custom events tailored to your family's unique traditions.
              </p>
            </div>
            <Button onClick={() => router.push("/onboarding")}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start Custom
            </Button>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Ready to start planning?
          </p>
          <Button
            size="lg"
            className="gradient-primary"
            onClick={() => router.push("/onboarding")}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Create Your Wedding
          </Button>
        </div>
      </div>
    </main>
  );
}

