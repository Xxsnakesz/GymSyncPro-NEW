import { Home, Calendar, Bell, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import ProfileSheet from "@/components/ui/profile-sheet";
import NotificationsSheet from "@/components/ui/notifications-sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  notificationCount?: number;
}

export default function BottomNavigation({ notificationCount = 0 }: BottomNavigationProps) {
  const [location] = useLocation();
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);

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
      badge: notificationCount,
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-2xl border-t-2 border-primary/20 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 pb-safe">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
      
      <div className="grid grid-cols-4 h-[72px] px-3 gap-1">
        {navItems.map((item) => {
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
                    "flex flex-col items-center justify-center gap-1.5 relative rounded-2xl transition-all duration-300 h-full",
                    "active:scale-95",
                    isActive ? "bg-primary/10 shadow-lg shadow-primary/20" : "hover:bg-muted/30"
                  )}
                  data-testid={item.testId}
                >
                  {isActive && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                  )}
                  <div className={cn(
                    "relative p-3 rounded-2xl transition-all duration-300",
                    isActive 
                      ? "bg-gradient-to-br from-primary to-neon-purple shadow-lg" 
                      : "bg-muted/50"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6 transition-colors duration-300",
                      isActive ? "text-white" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold transition-colors duration-300",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
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
                    "flex flex-col items-center justify-center gap-1.5 relative rounded-2xl transition-all duration-300 h-full",
                    "active:scale-95",
                    showNotificationsSheet ? "bg-primary/10 shadow-lg shadow-primary/20" : "hover:bg-muted/30"
                  )}
                  data-testid={item.testId}
                >
                  {showNotificationsSheet && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                  )}
                  <div className={cn(
                    "relative p-3 rounded-2xl transition-all duration-300",
                    showNotificationsSheet 
                      ? "bg-gradient-to-br from-primary to-neon-purple shadow-lg" 
                      : "bg-muted/50"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6 transition-colors duration-300",
                      showNotificationsSheet ? "text-white" : "text-muted-foreground"
                    )} />
                    {item.badge && item.badge > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-gradient-to-br from-neon-green to-green-600 rounded-full flex items-center justify-center animate-scale-in shadow-lg border-2 border-background">
                        <span className="text-[10px] font-bold text-white px-1">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold transition-colors duration-300",
                    showNotificationsSheet ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </button>
              </NotificationsSheet>
            );
          }
          
          // Regular links
          return (
            <Link 
              key={item.testId}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 relative rounded-2xl transition-all duration-300 h-full",
                "active:scale-95",
                isActive ? "bg-primary/10 shadow-lg shadow-primary/20" : "hover:bg-muted/30"
              )}
              data-testid={item.testId}
            >
              {isActive && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
              <div className={cn(
                "relative p-3 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-gradient-to-br from-primary to-neon-purple shadow-lg" 
                  : "bg-muted/50"
              )}>
                <Icon className={cn(
                  "h-6 w-6 transition-colors duration-300",
                  isActive ? "text-white" : "text-muted-foreground"
                )} />
              </div>
              <span className={cn(
                "text-[11px] font-bold transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
