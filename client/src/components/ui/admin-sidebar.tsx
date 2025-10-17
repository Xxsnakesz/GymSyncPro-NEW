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
  X,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ className, isOpen, onClose }: AdminSidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", color: "bg-gradient-to-br from-blue-500 to-blue-600" },
    { href: "/admin/members", icon: Users, label: "Members", color: "bg-gradient-to-br from-purple-500 to-purple-600" },
    { href: "/admin/classes", icon: Dumbbell, label: "Classes", color: "bg-gradient-to-br from-orange-500 to-orange-600" },
    { href: "/admin/trainers", icon: UserCog, label: "Trainers", color: "bg-gradient-to-br from-green-500 to-green-600" },
    { href: "/admin/plans", icon: CreditCard, label: "Plans", color: "bg-gradient-to-br from-yellow-500 to-yellow-600" },
    { href: "/admin/pt-bookings", icon: Calendar, label: "PT Bookings", color: "bg-gradient-to-br from-indigo-500 to-indigo-600" },
    { href: "/admin/class-bookings", icon: CalendarCheck, label: "Bookings", color: "bg-gradient-to-br from-teal-500 to-teal-600" },
    { href: "/admin/checkins", icon: QrCode, label: "Check-ins", color: "bg-gradient-to-br from-pink-500 to-pink-600" },
    { href: "/admin/feedback", icon: MessageSquare, label: "Feedback", color: "bg-gradient-to-br from-violet-500 to-violet-600" },
  ];

  const handleNavClick = (href: string) => {
    window.location.href = href;
    onClose();
  };

  return (
    <>
      {/* Overlay with blur effect */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col",
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl",
          "border-r border-slate-200/50 dark:border-slate-700/50",
          "shadow-2xl lg:shadow-none",
          "transition-all duration-300 ease-out lg:translate-x-0",
          "w-72",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Header with gradient */}
        <div className="relative px-6 py-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                  Gym Admin
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Management Panel
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Navigation with enhanced styling */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 cursor-pointer",
                  isActive 
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {/* Icon with enhanced styling */}
                <div className={cn(
                  "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                  isActive 
                    ? "bg-white/20 shadow-inner" 
                    : `${item.color} group-hover:scale-110 shadow-md`
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-white" : "text-white"
                  )} />
                </div>
                
                {/* Label with better typography */}
                <span className={cn(
                  "font-semibold transition-colors text-sm tracking-wide",
                  isActive 
                    ? "text-white" 
                    : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                )}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute right-4 w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Enhanced bottom section */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-4">
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Quick Scan</h3>
                <p className="text-xs text-white/80">Check-in members</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
