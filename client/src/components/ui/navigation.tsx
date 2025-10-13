import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Bell, ShieldQuestion, LogOut, Calendar, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoPath from "@assets/image_1759411904981.png";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface NavigationProps {
  user: any;
  isAdmin?: boolean;
  notificationCount?: number;
}

export default function Navigation({ user, isAdmin = false, notificationCount = 0 }: NavigationProps) {
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      queryClient.clear();
      window.location.href = "/login";
    }
  };

  return (
    <nav className="bg-card shadow-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3 sm:space-x-6">
            {isAdmin ? (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600">
                <ShieldQuestion className="text-white" size={18} />
              </div>
            ) : (
              <img 
                src={logoPath} 
                alt="Idachi Logo" 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                data-testid="img-logo"
              />
            )}
            <div>
              <h1 className="text-base sm:text-xl font-bold text-foreground">
                {isAdmin ? "FitZone Admin" : "Idachi Connect"}
              </h1>
              {isAdmin && (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Management Portal
                </p>
              )}
            </div>

            {/* Navigation Links for Members - Hidden on Mobile */}
            {!isAdmin && (
              <div className="hidden md:flex items-center space-x-2 ml-8">
                <Link href="/">
                  <Button 
                    variant={location === "/" ? "default" : "ghost"} 
                    size="sm"
                    className="gap-2"
                    data-testid="link-dashboard"
                  >
                    <Home size={16} />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/my-bookings">
                  <Button 
                    variant={location === "/my-bookings" ? "default" : "ghost"} 
                    size="sm"
                    className="gap-2"
                    data-testid="link-my-bookings"
                  >
                    <Calendar size={16} />
                    My Bookings
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notification Bell - Hidden on Mobile (will be in bottom nav) */}
            {!isAdmin && (
              <div className="relative hidden md:block">
                <Button variant="ghost" size="sm" data-testid="button-notifications">
                  <Bell size={18} className="text-muted-foreground" />
                  {notificationCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs h-5 w-5 flex items-center justify-center p-0"
                      data-testid="badge-notification-count"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </div>
            )}

            {isAdmin && (
              <div className="relative">
                <Button variant="ghost" size="sm" data-testid="button-notifications">
                  <Bell size={18} className="text-muted-foreground" />
                  {notificationCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs h-5 w-5 flex items-center justify-center p-0"
                      data-testid="badge-notification-count"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground" data-testid="text-username">
                  {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? "Administrator" : "Member"}
                </p>
              </div>
              
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10" data-testid="img-avatar">
                <AvatarImage src={user.profileImageUrl} />
                <AvatarFallback>
                  {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'U'}
                </AvatarFallback>
              </Avatar>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                data-testid="button-logout"
                className="hidden sm:flex"
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
