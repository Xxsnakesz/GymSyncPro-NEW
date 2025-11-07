import { LogOut, User, Settings, HelpCircle, FileText, ChevronRight } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import PushNotificationToggle from "@/components/push-notification-toggle";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProfileSheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ProfileSheet({ children, open, onOpenChange }: ProfileSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Logout berhasil" });
      navigate("/login");
    },
    onError: (err: any) => {
      toast({ title: "Logout gagal", description: err?.message || "Silakan coba lagi", variant: "destructive" });
    }
  });

  const handleMenuClick = (action: string) => {
    onOpenChange?.(false);
    
    switch (action) {
      case "profile":
        setTimeout(() => navigate("/my-profile"), 300);
        break;
      case "settings":
        setTimeout(() => navigate("/settings"), 300);
        break;
      case "terms":
        setTimeout(() => navigate("/terms"), 300);
        break;
      case "help":
        toast({
          title: "Help & Support",
          description: "Need help? Contact us at support@idachifitness.com",
        });
        break;
      default:
        break;
    }
  };

  const menuItems = [
    {
      icon: User,
      label: "My Profile",
      action: "profile",
      testId: "menu-profile",
      color: "text-neon-green"
    },
    {
      icon: Settings,
      label: "Settings",
      action: "settings",
      testId: "menu-settings",
      color: "text-muted-foreground"
    },
    {
      icon: FileText,
      label: "Terms & Conditions",
      action: "terms",
      testId: "menu-terms",
      color: "text-muted-foreground"
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      action: "help",
      testId: "menu-help",
      color: "text-muted-foreground"
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[90vh] rounded-t-3xl border-0 bg-card"
      >
        <SheetHeader className="space-y-6 pt-2">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />
          <SheetTitle className="text-left text-2xl font-bold">Profile</SheetTitle>
          
          {/* User Info Card */}
          <div className="bg-gradient-to-br from-primary/10 to-neon-purple/10 dark:from-primary/20 dark:to-neon-purple/20 rounded-2xl p-4 border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={`${user?.firstName} ${user?.lastName}` || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-2xl">
                    {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neon-green dark:bg-neon-green rounded-full border-4 border-background" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-foreground">
                  {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">{user?.email || ""}</p>
                <div className="mt-2 inline-flex items-center gap-2 bg-primary/20 dark:bg-primary/30 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-primary capitalize">
                    {user?.role || "member"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        {/* Push Notifications */}
        <div className="mb-4">
          <PushNotificationToggle />
        </div>

        <Separator className="my-6" />

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.testId}
                variant="ghost"
                onClick={() => handleMenuClick(item.action)}
                className={cn(
                  "w-full justify-between h-14 rounded-2xl hover:bg-muted/50 transition-all duration-200 active:scale-98",
                  "group"
                )}
                data-testid={item.testId}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                    <Icon className={cn("h-5 w-5", item.color)} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            );
          })}
        </div>

        <Separator className="my-6" />

        {/* Logout Button with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={logoutMutation.isPending}
              variant="outline"
              className="w-full h-14 rounded-2xl border-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 active:scale-98 font-semibold mb-4"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 mr-2" />
              {logoutMutation.isPending ? "Keluar…" : "Logout"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda akan keluar dari sesi ini. Anda bisa login kembali kapan saja.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => logoutMutation.mutate()}
              >
                Ya, Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-center text-xs text-muted-foreground pb-2">
          Idachi Fitness v1.0.0
        </p>
      </SheetContent>
    </Sheet>
  );
}
