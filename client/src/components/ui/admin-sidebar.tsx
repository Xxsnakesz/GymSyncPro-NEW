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
  X,
  HelpCircle,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/image_1759411904981.png";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ className, isOpen, onClose }: AdminSidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", color: "bg-green-500/10 text-green-500" },
    { href: "/admin/members", icon: Users, label: "Members", color: "bg-blue-500/10 text-blue-500" },
    { href: "/admin/classes", icon: Dumbbell, label: "Classes", color: "bg-purple-500/10 text-purple-500" },
    { href: "/admin/trainers", icon: UserCog, label: "Trainers", color: "bg-orange-500/10 text-orange-500" },
    { href: "/admin/plans", icon: CreditCard, label: "Plans", color: "bg-yellow-500/10 text-yellow-500" },
    { href: "/admin/pt-bookings", icon: Calendar, label: "PT Bookings", color: "bg-pink-500/10 text-pink-500" },
    { href: "/admin/class-bookings", icon: CalendarCheck, label: "Bookings", color: "bg-red-500/10 text-red-500" },
    { href: "/admin/checkins", icon: QrCode, label: "Check-ins", color: "bg-cyan-500/10 text-cyan-500" },
    { href: "/admin/feedback", icon: MessageSquare, label: "Feedback", color: "bg-indigo-500/10 text-indigo-500" },
  ];

  const handleContactUs = () => {
    const whatsappNumber = "6281234567890";
    const message = encodeURIComponent("Halo, saya admin Idachi Fitness");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Navigating to:', href);
    window.location.href = href;
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col",
          "bg-[#0a0e27] dark:bg-[#0a0e27]",
          "transition-transform duration-200",
          "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Header with Logo */}
        <div className="px-6 py-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <img 
              src={logoPath} 
              alt="Idachi Fitness Logo" 
              className="w-12 h-12 object-contain"
              data-testid="img-sidebar-logo"
            />
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-slate-800 rounded text-slate-400"
              data-testid="button-close-sidebar"
            >
              <X size={20} />
            </button>
          </div>
          <h2 className="text-sm font-semibold text-white tracking-wide">
            IDACHI FITNESS JAKARTA
          </h2>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <button
                key={item.href}
                type="button"
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                  "text-slate-300 hover:bg-slate-800/50",
                  isActive && "bg-slate-800/50"
                )}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={cn("p-2 rounded-lg", item.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-4 pb-6 space-y-4">
          <div className="px-4">
            <button
              className="flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors"
              data-testid="button-help-center"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm">Help Center</span>
            </button>
          </div>
          
          <Button
            onClick={handleContactUs}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium shadow-lg"
            size="lg"
            data-testid="button-contact-us"
          >
            <Phone className="w-4 h-4 mr-2" />
            Contact Us
          </Button>
        </div>
      </aside>
    </>
  );
}
