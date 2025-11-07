import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  UserCog, 
  CreditCard, 
  QrCode, 
  MessageSquare,
  Calendar,
  CalendarCheck,
  Megaphone,
  X,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/image_1759411904981.png";
import { useState } from "react";

interface AdminSidebarProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminSidebar({ 
  className, 
  isOpen, 
  onClose,
  isCollapsed = false,
  onToggleCollapse
}: AdminSidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/members", icon: Users, label: "Members" },
    { href: "/admin/classes", icon: Dumbbell, label: "Classes" },
    { href: "/admin/trainers", icon: UserCog, label: "Trainers" },
    { href: "/admin/plans", icon: CreditCard, label: "Plans" },
    { href: "/admin/pt-bookings", icon: Calendar, label: "PT Bookings" },
    { href: "/admin/class-bookings", icon: CalendarCheck, label: "Bookings" },
    { href: "/admin/checkins", icon: QrCode, label: "Check-In" },
    { href: "/admin/promotions", icon: Megaphone, label: "Promotions" },
    { href: "/admin/feedback", icon: MessageSquare, label: "Feedback" },
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = href;
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in backdrop-blur-sm"
          onClick={onClose}
          data-testid="overlay-sidebar"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col border-r border-border bg-card smooth-transition",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-20" : "w-64",
          className
        )}
        data-testid="sidebar-admin"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-3 animate-fade-in">
              <img 
                src={logoPath} 
                alt="Gym Logo" 
                className="w-10 h-10 object-contain rounded-lg"
                data-testid="img-sidebar-logo"
              />
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-foreground">Idachi Fitness</h2>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </div>
          )}
          
          {isCollapsed && (
            <img 
              src={logoPath} 
              alt="Logo" 
              className="w-10 h-10 object-contain rounded-lg mx-auto animate-scale-in"
              data-testid="img-sidebar-logo-collapsed"
            />
          )}

          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-close-sidebar"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <button
                key={item.href}
                type="button"
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn(
                  "w-full sidebar-item group relative",
                  isActive ? "sidebar-item-active" : "sidebar-item-inactive",
                  isCollapsed && "justify-center px-0"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={cn(
                  "flex items-center justify-center",
                  isCollapsed ? "w-full" : ""
                )}>
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                </div>
                
                {!isCollapsed && (
                  <span className={cn(
                    "text-sm font-medium transition-colors animate-fade-in",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                )}

                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full animate-scale-in" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border p-3 space-y-2">
          <button
            className={cn(
              "w-full sidebar-item sidebar-item-inactive group",
              isCollapsed && "justify-center px-0"
            )}
            data-testid="button-help-center"
            title={isCollapsed ? "Help Center" : undefined}
          >
            <HelpCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-transform group-hover:scale-110" />
            {!isCollapsed && (
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground animate-fade-in">
                Help Center
              </span>
            )}
          </button>

          {/* Collapse Toggle (Desktop Only) */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex w-full items-center justify-center p-3 hover:bg-muted rounded-lg transition-colors group"
              data-testid="button-toggle-collapse"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:scale-110" />
              ) : (
                <>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:scale-110" />
                  <span className="ml-2 text-sm font-medium text-muted-foreground group-hover:text-foreground">
                    Collapse
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
