import { ArrowLeft, Camera, Edit, Mail, Phone, User, Calendar, MapPin, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MyProfile() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Logout berhasil" });
      navigate("/login");
    },
    onError: (error: any) => {
      toast({ title: "Logout gagal", description: error?.message || "Silakan coba lagi", variant: "destructive" });
    },
  });

  if (!user) {
    return null;
  }

  const profileSections = [
    {
      icon: Mail,
      label: "Email",
      value: user.email,
      testId: "profile-email"
    },
    {
      icon: Phone,
      label: "Phone",
      value: user.phone || "Belum diatur",
      testId: "profile-phone"
    },
    {
      icon: User,
      label: "Username",
      value: user.username,
      testId: "profile-username"
    },
    {
      icon: Calendar,
      label: "Member Sejak",
      value: user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : "-",
      testId: "profile-member-since"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Header Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-neon-purple/5">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-3xl">
                    {`${user.firstName[0]}${user.lastName[0]}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
                  data-testid="button-change-photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold">{`${user.firstName} ${user.lastName}`}</h2>
                <div className="mt-2 flex items-center gap-2 flex-wrap justify-center">
                  <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-primary capitalize">
                      {user.role}
                    </span>
                  </div>
                  {user.active === false && (
                    <div className="inline-flex items-center gap-2 bg-yellow-500/20 px-4 py-1.5 rounded-full border border-yellow-500/30">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                        Cuti
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full max-w-xs mt-4"
                data-testid="button-edit-profile"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold px-2">Informasi Personal</h3>
          
          <Card>
            <CardContent className="p-4 space-y-4">
              {profileSections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <div key={section.testId}>
                    <div className="flex items-center gap-3" data-testid={section.testId}>
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{section.label}</p>
                        <p className="font-medium">{section.value}</p>
                      </div>
                    </div>
                    {index < profileSections.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Account Status: Cuti notice */}
        {user.active === false && (
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Status Akun: Cuti</p>
                  <p className="text-sm text-muted-foreground">Selama Cuti, fitur Check-in dan Booking dinonaktifkan. Hubungi admin untuk mengaktifkan kembali akun Anda.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Verification Status */}
        <Card className={user.emailVerified ? "border-green-500/20 bg-green-500/5" : "border-yellow-500/20 bg-yellow-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${user.emailVerified ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
                  <Mail className={`h-5 w-5 ${user.emailVerified ? "text-green-600" : "text-yellow-600"}`} />
                </div>
                <div>
                  <p className="font-medium">Status Email</p>
                  <p className="text-sm text-muted-foreground">
                    {user.emailVerified ? "Email terverifikasi ✓" : "Email belum terverifikasi"}
                  </p>
                </div>
              </div>
              {!user.emailVerified && (
                <Button 
                  size="sm" 
                  variant="outline"
                  data-testid="button-verify-email"
                >
                  Verifikasi
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <div className="pt-2">
          <Button
            variant="destructive"
            className="w-full h-12 font-semibold"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            {logoutMutation.isPending ? (
              <span>Keluar…</span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Logout
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
