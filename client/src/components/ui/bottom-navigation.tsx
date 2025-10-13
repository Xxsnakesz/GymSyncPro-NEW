import { Home, Calendar, Bell, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import ProfileSheet from "@/components/ui/profile-sheet";
import { useState } from "react";

interface BottomNavigationProps {
  notificationCount?: number;
}

export default function BottomNavigation({ notificationCount = 0 }: BottomNavigationProps) {
  const [location] = useLocation();
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  const navItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
      active: location === "/",
      testId: "bottom-nav-home",
      type: "link" as const,
      badge: undefined as number | undefined
    },
    {
      icon: Calendar,
      label: "Bookings",
      href: "/my-bookings",
      active: location === "/my-bookings",
      testId: "bottom-nav-bookings",
      type: "link" as const,
      badge: undefined as number | undefined
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "#",
      active: false,
      testId: "bottom-nav-notifications",
      badge: notificationCount as number | undefined,
      type: "button" as const
    },
    {
      icon: User,
      label: "Profile",
      href: "#",
      active: showProfileSheet,
      testId: "bottom-nav-profile",
      type: "profile" as const,
      badge: undefined as number | undefined
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="grid grid-cols-4 h-16">
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
                  className={`
                    flex flex-col items-center justify-center gap-1 relative
                    transition-colors duration-200
                    ${isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                  data-testid={item.testId}
                >
                  <div className="relative">
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
                  )}
                </button>
              </ProfileSheet>
            );
          }
          
          // Regular buttons (notifications, etc)
          if (item.type === "button") {
            return (
              <button
                key={item.testId}
                className={`
                  flex flex-col items-center justify-center gap-1 relative
                  transition-colors duration-200
                  ${isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
                data-testid={item.testId}
              >
                <div className="relative">
                  <Icon size={20} />
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs h-4 w-4 flex items-center justify-center p-0"
                      data-testid="badge-bottom-nav-notification"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
                )}
              </button>
            );
          }
          
          return (
            <Link 
              key={item.testId}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 relative
                transition-colors duration-200
                ${isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid={item.testId}
            >
              <div className="relative">
                <Icon size={20} />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs h-4 w-4 flex items-center justify-center p-0"
                    data-testid="badge-bottom-nav-notification"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
