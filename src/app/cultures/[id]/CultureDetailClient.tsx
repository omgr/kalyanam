"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  Sparkles,
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { allCultures } from "@/lib/cultures";
import { useState } from "react";

interface CultureDetailClientProps {
  cultureId: string;
}

export default function CultureDetailClient({ cultureId }: CultureDetailClientProps) {
  const router = useRouter();
  const [expandedRituals, setExpandedRituals] = useState<Set<string>>(new Set());

  const culture = allCultures.find((c) => c.id === cultureId);

  if (!culture) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Culture not found</p>
          <Button onClick={() => router.push("/cultures")}>
            Browse Cultures
          </Button>
        </div>
      </div>
    );
  }

  const preWeddingRituals = culture.rituals.filter((r) => r.category === "pre-wedding");
  const weddingDayRituals = culture.rituals.filter((r) => r.category === "wedding-day");
  const postWeddingRituals = culture.rituals.filter((r) => r.category === "post-wedding");

  const toggleRitual = (ritualId: string) => {
    setExpandedRituals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ritualId)) {
        newSet.delete(ritualId);
      } else {
        newSet.add(ritualId);
      }
      return newSet;
    });
  };

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

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatTypicalDay = (day?: number) => {
    if (day === undefined || day === null) return null;
    if (day === 0) return "Wedding Day";
    if (day < 0) return `${Math.abs(day)} day${Math.abs(day) > 1 ? "s" : ""} before`;
    return `${day} day${day > 1 ? "s" : ""} after`;
  };

  const RitualCard = ({ ritual, index }: { ritual: typeof culture.rituals[0]; index: number }) => {
    const isExpanded = expandedRituals.has(ritual.id);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
      >
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            isExpanded ? "ring-2 ring-primary/50" : ""
          }`}
          onClick={() => toggleRitual(ritual.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{ritual.name}</h4>
                  {ritual.localName && (
                    <span className="text-sm text-primary font-medium">
                      ({ritual.localName})
                    </span>
                  )}
                  {ritual.isOptional && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      Optional
                    </span>
                  )}
                </div>
                
                {!isExpanded && ritual.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {ritual.description}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {formatTypicalDay(ritual.typicalDay) && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatTypicalDay(ritual.typicalDay)}
                    </span>
                  )}
                  {formatDuration(ritual.typicalDuration) && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(ritual.typicalDuration)}
                    </span>
                  )}
                </div>
              </div>
              
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </div>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 pt-4 border-t space-y-4"
              >
                {ritual.description && (
                  <div>
                    <p className="text-sm">{ritual.description}</p>
                  </div>
                )}

                {ritual.significance && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Significance
                    </h5>
                    <p className="text-sm">{ritual.significance}</p>
                  </div>
                )}

                {ritual.participants && ritual.participants.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Participants
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {ritual.participants.map((participant, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-muted rounded-full"
                        >
                          {participant}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {ritual.requiredItems && ritual.requiredItems.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" /> Required Items
                    </h5>
                    <ul className="text-sm space-y-1">
                      {ritual.requiredItems.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const CategorySection = ({
    title,
    rituals,
    colorClass,
    icon,
    description,
  }: {
    title: string;
    rituals: typeof culture.rituals;
    colorClass: string;
    icon: React.ReactNode;
    description: string;
  }) => {
    if (rituals.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className={`rounded-lg p-4 ${colorClass}`}>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-lg">{title}</h3>
            <span className="ml-auto text-sm text-muted-foreground">
              {rituals.length} ritual{rituals.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="space-y-3 pl-2">
          {rituals.map((ritual, index) => (
            <RitualCard key={ritual.id} ritual={ritual} index={index} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-saffron-50 via-background to-maroon-50/30 dark:from-saffron-950/20 dark:via-background dark:to-maroon-950/20">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex gap-2 mb-4 -ml-2">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/cultures")}
            >
              All Cultures
            </Button>
          </div>

          {/* Culture Header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-3xl">
              {getCultureEmoji(culture.id)}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-display font-bold">{culture.name}</h1>
              <p className="text-muted-foreground">
                {culture.region}
                {culture.religion && ` • ${culture.religion}`}
              </p>
              {culture.description && (
                <p className="mt-2 text-sm">{culture.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{culture.rituals.length}</p>
              <p className="text-sm text-muted-foreground">Total Rituals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{preWeddingRituals.length}</p>
              <p className="text-sm text-muted-foreground">Pre-Wedding</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-pink-600">{weddingDayRituals.length}</p>
              <p className="text-sm text-muted-foreground">Wedding Day</p>
            </CardContent>
          </Card>
        </div>

        {/* Tip */}
        <Card className="mb-8 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-400">Click to Expand</p>
              <p className="text-amber-700 dark:text-amber-500">
                Click on any ritual to see its full description, significance, participants, and required items.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rituals by Category */}
        <div className="space-y-8">
          <CategorySection
            title="Pre-Wedding Ceremonies"
            rituals={preWeddingRituals}
            colorClass="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30"
            icon={<Calendar className="w-5 h-5 text-blue-600" />}
            description="Ceremonies and rituals performed before the wedding day"
          />

          <CategorySection
            title="Wedding Day Rituals"
            rituals={weddingDayRituals}
            colorClass="border-pink-200 bg-pink-50/50 dark:border-pink-900 dark:bg-pink-950/30"
            icon={<Heart className="w-5 h-5 text-pink-600" />}
            description="The main wedding ceremony and associated rituals"
          />

          <CategorySection
            title="Post-Wedding Ceremonies"
            rituals={postWeddingRituals}
            colorClass="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
            icon={<Star className="w-5 h-5 text-green-600" />}
            description="Ceremonies performed after the wedding"
          />
        </div>

        {/* Missing Rituals Note */}
        <Card className="mt-8">
          <CardContent className="py-6">
            <h3 className="font-semibold mb-2">Something Missing?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Every family has unique traditions. If your family follows additional rituals not listed here, 
              don't worry! You can add custom events after creating your wedding to match your exact traditions.
            </p>
            <Button variant="outline" onClick={() => router.push("/onboarding")}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start with This Template
            </Button>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-muted-foreground">
            Like what you see? Start planning your wedding with these ceremonies.
          </p>
          <Button
            size="lg"
            className="gradient-primary"
            onClick={() => router.push("/onboarding")}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Create Wedding with {culture.name} Template
          </Button>
        </div>
      </div>
    </main>
  );
}

