import { useState } from "react";
import AdminSidebar from "./admin-sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Bell, LogOut, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminLayoutProps {
  user?: any;
  notificationCount?: number;
  children: React.ReactNode;
}

export default function AdminLayout({ user, notificationCount = 0, children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.clear();
      window.location.href = "/login-admin";
    } catch (error) {
      console.error("Logout error:", error);
      queryClient.clear();
      window.location.href = "/login-admin";
    }
  };

  const getUserInitials = () => {
    if (!user) return "AD";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || "AD";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Top Bar */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>

            {/* Page Title */}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">
                Gym Management
              </h1>
              <p className="text-xs text-muted-foreground">
                Control panel for fitness operations
              </p>
            </div>
          </div>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-lg hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-bold animate-scale-in">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-10 rounded-lg hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 px-2"
                  data-testid="button-user-menu"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarImage src={user?.profileImageUrl} alt={user?.firstName} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground">
                        {user?.firstName || 'Admin'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Administrator
                      </span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 animate-slide-in">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
