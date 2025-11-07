import { Home, Calendar, Bell, User, QrCode } from "lucide-react";
import { Link, useLocation } from "wouter";
import ProfileSheet from "@/components/ui/profile-sheet";
import NotificationsSheet from "@/components/ui/notifications-sheet";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema.ts";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  notificationCount?: number;
  onCheckIn?: () => void;
  checkInDisabled?: boolean;
}

export default function BottomNavigation({ notificationCount = 0, onCheckIn, checkInDisabled = false }: BottomNavigationProps) {
  const [location] = useLocation();
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  // Fetch unread notifications count as a fallback so pages that pass 0 still show real counts
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    // Keep light: background refresh, avoid retry noise; React Query caching will dedupe with other views
    refetchInterval: 30000,
    retry: false,
  });
  const fetchedUnread = notifications?.filter((n) => !n.isRead).length || 0;
  // Use the larger of provided prop vs fetched count (so callers can override/increase but never hide unread)
  const notifCount = Math.max(Number(notificationCount) || 0, fetchedUnread);
  const showBadge = Number.isFinite(notifCount) && notifCount > 0;

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      active: location === "/",
      testId: "bottom-nav-home",
      type: "link" as const,
    },
    {
      icon: Calendar,
      label: "Bookings",
      href: "/my-bookings",
      active: location === "/my-bookings",
      testId: "bottom-nav-bookings",
      type: "link" as const,
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "#",
      active: false,
      testId: "bottom-nav-notifications",
      type: "button" as const,
      badge: notifCount,
    },
    {
      icon: User,
      label: "Profile",
      href: "#",
      active: showProfileSheet,
      testId: "bottom-nav-profile",
      type: "profile" as const,
    }
  ];

  // Split into left and right clusters so the center remains clear for the Check-In FAB
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  const renderItem = (item: typeof navItems[number]) => {
    const Icon = item.icon;
    const isActive = item.active;

    // Profile sheet
    if (item.type === "profile") {
      return (
        <ProfileSheet
          key={item.testId}
          open={showProfileSheet}
          onOpenChange={setShowProfileSheet}
        >
          <button
            className={cn(
              "group flex flex-col items-center justify-center gap-0.5 relative h-full",
              "active:opacity-90"
            )}
            data-testid={item.testId}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              setPressedKey(item.testId);
              setTimeout(() => setPressedKey(null), 300);
            }}
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-full w-10 h-10 transition-colors bg-transparent"
              )}
            >
              <Icon className={cn("h-6 w-6 transition-colors duration-300", isActive ? "text-primary" : "text-muted-foreground")} />
            </div>
            <span className={cn("text-[11px] font-semibold mt-0.5 leading-none", isActive ? "text-primary" : "text-muted-foreground")}> 
              {item.label}
            </span>
          </button>
        </ProfileSheet>
      );
    }

    // Notifications sheet
    if (item.type === "button") {
      return (
        <NotificationsSheet
          key={item.testId}
          open={showNotificationsSheet}
          onOpenChange={setShowNotificationsSheet}
        >
          <button
            className={cn(
              "group flex flex-col items-center justify-center gap-0.5 relative h-full",
              "active:opacity-90"
            )}
            data-testid={item.testId}
            aria-current={showNotificationsSheet ? "page" : undefined}
            aria-label={showBadge ? `Notifications, ${Math.min(notifCount, 99)} unread` : "Notifications, no unread"}
            onClick={() => {
              setPressedKey(item.testId);
              setTimeout(() => setPressedKey(null), 300);
            }}
          >
            <div className={cn("flex items-center justify-center rounded-full w-10 h-10 transition-colors bg-transparent")}> 
              <Icon className={cn("h-6 w-6 transition-colors duration-300", showNotificationsSheet ? "text-primary" : "text-muted-foreground")} />
              {showBadge && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center animate-scale-in shadow-lg border-2 border-background">
                  <span className="text-[10px] font-bold text-white px-1">{notifCount > 99 ? "99+" : notifCount > 9 ? "9+" : notifCount}</span>
                </div>
              )}
            </div>
            <span className={cn("text-[11px] font-semibold mt-0.5 leading-none", showNotificationsSheet ? "text-primary" : "text-muted-foreground")}> 
              {item.label}
            </span>
          </button>
        </NotificationsSheet>
      );
    }

    // Regular link
    return (
      <Link
        key={item.testId}
        href={item.href}
        className="group relative flex flex-col items-center justify-center h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded-xl active:opacity-90"
        data-testid={item.testId}
        aria-current={isActive ? "page" : undefined}
        onClick={() => {
          setPressedKey(item.testId);
          setTimeout(() => setPressedKey(null), 300);
        }}
      >
        <div className={cn("flex items-center justify-center rounded-full w-10 h-10 transition-colors bg-transparent")}> 
          <Icon className={cn("h-6 w-6 transition-colors duration-300", isActive ? "text-primary" : "text-muted-foreground")} />
        </div>
        <span className={cn("text-[11px] font-semibold mt-0.5 leading-none", isActive ? "text-primary" : "text-muted-foreground")}> 
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <>
  {/* Spacer so content isn't hidden behind the fixed nav on small screens */}
  <div aria-hidden className="md:hidden h-[96px]" />

      <nav
        role="navigation"
        aria-label="Primary"
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-50",
          // Full-width bar with crisp, light background (no blur) and soft shadow
          "bg-background shadow-[0_-6px_20px_rgba(0,0,0,0.2)]"
        )}
      >
  <div className="relative px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Lowered top divider line for a cleaner gap above the bar */}
          <div aria-hidden className="absolute left-0 right-0 top-3 border-t border-border" />
          {/* Center floating Check-In button (lowered slightly into the bar) with label */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1 z-[60] flex flex-col items-center">
            {/* Pulsing green outline ripples */}
            <div className="relative pointer-events-none inline-flex items-center justify-center">
              {!checkInDisabled && (
                <>
                  <span aria-hidden className="absolute h-16 w-16 rounded-full ring-2 ring-neon-green/60 animate-ping" />
                  <span aria-hidden className="absolute h-20 w-20 rounded-full ring-2 ring-neon-green/30 animate-ping" style={{ animationDelay: "0.8s" }} />
                </>
              )}
              <button
              type="button"
              aria-label="Check-In"
              data-testid="fab-checkin"
              onClick={() => {
                if (checkInDisabled) return;
                onCheckIn?.();
                setPressedKey("fab-checkin");
                setTimeout(() => setPressedKey(null), 300);
              }}
              className={cn(
                "pointer-events-auto relative inline-flex items-center justify-center",
                "h-16 w-16 rounded-full",
                checkInDisabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-80"
                  : "text-white shadow-xl bg-[radial-gradient(circle_at_center,#34d399_0%,#22c55e_55%,#16a34a_100%)]",
                !checkInDisabled && "hover:shadow-2xl transition-shadow",
                "ring-2 ring-background ring-offset-2 ring-offset-background"
              )}
            >
              {/* Removed inner blinking core in favor of outline ripples */}
              {/* Ripple/press effect */}
              {pressedKey === "fab-checkin" && !checkInDisabled && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="animate-ping inline-flex h-14 w-14 rounded-full bg-white/30" />
                </span>
              )}
              {/* Idle subtle pulse to draw attention */}
              {!checkInDisabled && (
                <span aria-hidden className="absolute -z-10 animate-pulse-slow inline-flex h-16 w-16 rounded-full bg-neon-green/20 blur-md" />
              )}
              <QrCode className="h-7 w-7" />
              </button>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-neon-green pointer-events-none select-none drop-shadow-sm">
              Check In
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end h-20 px-2 py-3">
            <div className="flex items-end justify-start gap-6">
              {leftItems.map(renderItem)}
            </div>
            {/* Center spacer widened to push Bookings & Notifications farther from the FAB */}
            <div aria-hidden className="w-28" />
            <div className="flex items-end justify-end gap-6">
              {rightItems.map(renderItem)}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
