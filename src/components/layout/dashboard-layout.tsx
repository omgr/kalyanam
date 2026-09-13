"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  LayoutDashboard,
  Calendar,
  Users,
  Wallet,
  CheckSquare,
  MapPin,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  MessageSquare,
  Store,
  ChevronDown,
  Moon,
  Sun,
  Share2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearSession } from "@/lib/session";
import { FamilySyncIndicator } from "@/components/sync/family-sync-indicator";
import { LogoutDialog } from "@/components/sync/logout-dialog";
import { useMessageAlerts } from "@/hooks/use-message-alerts";
import { useTheme } from "next-themes";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: Calendar, label: "Events" },
  { href: "/guests", icon: Users, label: "Guests" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/budget", icon: Wallet, label: "Budget" },
  { href: "/messages", icon: MessageSquare, label: "Chat" },
  { href: "/vendors", icon: Store, label: "Vendors" },
  { href: "/family", icon: Users, label: "Family" },
  { href: "/location", icon: MapPin, label: "Location" },
  { href: "/reminders", icon: Bell, label: "Reminders" },
  { href: "/sync", icon: Share2, label: "Sync & Backup" },
  { href: "/diagnostics", icon: FileText, label: "Diagnostics" },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [weddingId, setWeddingId] = useState<string | null>(null);
  useEffect(() => setWeddingId(localStorage.getItem("kalyanam_wedding_id")), []);
  const { unreadCount } = useMessageAlerts(weddingId);

  // Signing out asks what it should mean, rather than guessing.
  const [showLogout, setShowLogout] = useState(false);
  const handleLogout = () => setShowLogout(true);

  return (
    <div className="min-h-screen bg-background">
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md">
            <LogoutDialog onCancel={() => setShowLogout(false)} />
          </div>
        </div>
      )}
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card hidden lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="text-xl font-display font-bold">Kalyanam</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/messages" && unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-border p-4 space-y-2">
            <FamilySyncIndicator />
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" fill="currentColor" />
            <span className="text-lg font-display font-bold">Kalyanam</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-72 bg-card shadow-xl lg:hidden"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="text-lg font-display font-bold">Menu</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4">
                  <ul className="space-y-1">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="border-t border-border p-4 space-y-2">
                  <Link
                    href="/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 lg:pt-0">
          {/*
            The bottom bar is fixed, so content must be padded out from under
            it. This belongs here rather than on each page: every screen had to
            remember `pb-20` and several did not, which left their last row of
            controls hidden behind the bar and untappable. Doing it once means a
            new page cannot get it wrong.

            The extra safe-area inset is for phones with a home indicator,
            where the bar itself sits higher than its own height suggests.
          */}
          <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 lg:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
            { href: "/events", icon: Calendar, label: "Events" },
            { href: "/guests", icon: Users, label: "Guests" },
            { href: "/tasks", icon: CheckSquare, label: "Tasks" },
            { href: "/messages", icon: MessageSquare, label: "Chat" },
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.href === "/messages" && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

