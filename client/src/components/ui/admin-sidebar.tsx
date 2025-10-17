import { Link, useLocation } from "wouter";
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
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  className?: string;
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", color: "from-blue-500 to-cyan-500" },
    { href: "/admin/members", icon: Users, label: "Members", color: "from-purple-500 to-pink-500" },
    { href: "/admin/classes", icon: Dumbbell, label: "Classes", color: "from-orange-500 to-red-500" },
    { href: "/admin/trainers", icon: UserCog, label: "Trainers", color: "from-green-500 to-emerald-500" },
    { href: "/admin/plans", icon: CreditCard, label: "Plans", color: "from-yellow-500 to-amber-500" },
    { href: "/admin/pt-bookings", icon: Calendar, label: "PT Bookings", color: "from-indigo-500 to-blue-500" },
    { href: "/admin/class-bookings", icon: CalendarCheck, label: "Bookings", color: "from-teal-500 to-cyan-500" },
    { href: "/admin/checkins", icon: QrCode, label: "Check-ins", color: "from-pink-500 to-rose-500" },
    { href: "/admin/feedback", icon: MessageSquare, label: "Feedback", color: "from-violet-500 to-purple-500" },
  ];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo/Brand */}
      <div className={cn("px-6 py-8 transition-all duration-300", collapsed && !isMobile && "px-3")}>
        <div className={cn("flex items-center gap-3", collapsed && !isMobile && "justify-center")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="overflow-hidden">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400 whitespace-nowrap">
                Gym Admin
              </h2>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Management Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 px-4 space-y-2", collapsed && !isMobile && "px-2")}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer",
                  isActive 
                    ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20" 
                    : "hover:bg-muted/50",
                  collapsed && !isMobile && "justify-center px-0"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => isMobile && setMobileOpen(false)}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full" />
                )}
                
                {/* Icon with gradient background */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0",
                  isActive 
                    ? `bg-gradient-to-br ${item.color}` 
                    : "bg-muted group-hover:bg-gradient-to-br group-hover:" + item.color
                )}>
                  <Icon className={cn(
                    "w-4.5 h-4.5 transition-colors",
                    isActive ? "text-white" : "text-muted-foreground group-hover:text-white"
                  )} />
                </div>
                
                {/* Label */}
                {(!collapsed || isMobile) && (
                  <span className={cn(
                    "font-medium transition-colors text-sm whitespace-nowrap",
                    isActive 
                      ? "text-foreground" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      {(!collapsed || isMobile) && (
        <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground">Quick Check-in</h3>
              <p className="text-[10px] text-muted-foreground">Scan member QR</p>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Toggle Button */}
      {!isMobile && (
        <div className="p-4 border-t border-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors",
              collapsed && "px-0"
            )}
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="button-toggle-sidebar-mobile"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-card/50 backdrop-blur-xl border-r border-border/50 transition-all duration-300",
          collapsed ? "w-20" : "w-72",
          className
        )}
      >
        <SidebarContent isMobile={false} />
      </aside>

      {/* Mobile Sidebar */}
      <aside 
        className={cn(
          "md:hidden fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-card border-r border-border transition-transform duration-300",
          "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent isMobile={true} />
      </aside>
    </>
  );
}
