import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  UserCog, 
  CreditCard, 
  QrCode, 
  MessageSquare,
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
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Overview" },
    { href: "/admin/members", icon: Users, label: "Members" },
    { href: "/admin/classes", icon: Dumbbell, label: "Classes" },
    { href: "/admin/trainers", icon: UserCog, label: "Trainers" },
    { href: "/admin/plans", icon: CreditCard, label: "Membership Plans" },
    { href: "/admin/checkins", icon: QrCode, label: "Check-ins" },
    { href: "/admin/feedback", icon: MessageSquare, label: "Feedback" },
  ];

  return (
    <aside 
      className={cn(
        "bg-card border-r border-border transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Management</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
          data-testid="button-toggle-sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  collapsed && "justify-center px-0"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
