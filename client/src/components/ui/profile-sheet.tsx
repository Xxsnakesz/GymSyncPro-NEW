import { LogOut, User, Settings, HelpCircle, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ProfileSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ProfileSheet({ children, open, onOpenChange }: ProfileSheetProps) {
  const { user } = useAuth();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const menuItems = [
    {
      icon: User,
      label: "My Profile",
      href: "#",
      testId: "menu-profile"
    },
    {
      icon: Settings,
      label: "Settings",
      href: "#",
      testId: "menu-settings"
    },
    {
      icon: FileText,
      label: "Terms & Conditions",
      href: "#",
      testId: "menu-terms"
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      href: "#",
      testId: "menu-help"
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[85vh]">
        <SheetHeader className="space-y-4">
          <SheetTitle className="text-left">Profile</SheetTitle>
          
          {/* User Info */}
          <div className="flex items-center gap-3 py-3">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={`${user?.firstName} ${user?.lastName}` || "User"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{user ? `${user.firstName} ${user.lastName}` : "Guest User"}</h3>
              <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1">
                {user?.role || "member"} Account
              </p>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Menu Items */}
        <div className="space-y-1 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.testId}
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                data-testid={item.testId}
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* Logout Button */}
        <Button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          variant="destructive"
          className="w-full gap-2 h-12"
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5" />
          {logoutMutation.isPending ? "Logging out..." : "Log Out"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
