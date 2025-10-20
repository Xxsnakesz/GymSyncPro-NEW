import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import QRModal from "@/components/qr-modal";
import FeedbackModal from "@/components/feedback-modal";
import BottomNavigation from "@/components/ui/bottom-navigation";
import {
  QrCode,
  MessageSquarePlus,
  Activity,
  TrendingUp,
  Dumbbell,
  Clock,
  Calendar,
  Users,
  Crown,
  Zap,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MemberDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Session Expired",
        description: "Please log in again",
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/api/login", 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<any>({
    queryKey: ["/api/member/dashboard"],
    enabled: isAuthenticated,
    retry: false,
  });

  const generateQRMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checkin/generate");
      return await response.json();
    },
    onSuccess: () => setShowQRModal(true),
    onError: () => toast({
      title: "Error",
      description: "Failed to generate QR code",
      variant: "destructive",
    }),
  });

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const membership = dashboardData?.membership;
  const checkIns = dashboardData?.checkIns || [];
  const stats = dashboardData?.stats || {};
  
  const getDaysUntilExpiry = () => {
    if (!membership?.endDate) return 0;
    const now = new Date();
    const expiry = new Date(membership.endDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysUntilExpiry();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modern Header with Greeting */}
      <header className="bg-gradient-to-br from-primary/15 via-neon-purple/10 to-background border-b border-border sticky top-0 z-10 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-4 border-background shadow-lg ring-2 ring-primary/30">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-neon-purple text-white font-bold text-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Hey, {user.firstName}! 👋
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Ready to crush it today?</p>
              </div>
            </div>
          </div>

          {/* Membership Status Banner */}
          {membership && (
            <div className="bg-gradient-to-r from-primary to-neon-purple p-4 rounded-2xl text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium opacity-90">Active Membership</p>
                    <p className="text-sm font-bold">{membership.plan?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-90">{daysLeft} days left</p>
                  <p className="text-xs font-semibold">
                    Exp: {format(new Date(membership.endDate), "MMM dd")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => generateQRMutation.mutate()}
              disabled={generateQRMutation.isPending}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-6 text-left transition-all active:scale-98",
                "bg-gradient-to-br from-neon-green to-green-600 dark:from-neon-green dark:to-green-700",
                "shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30"
              )}
              data-testid="button-generate-qr"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                <p className="text-white font-bold text-lg">Check-In</p>
                <p className="text-white/80 text-xs mt-1">
                  {generateQRMutation.isPending ? "Generating..." : "Scan QR Code"}
                </p>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </button>

            <button
              onClick={() => setShowFeedbackModal(true)}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-6 text-left transition-all active:scale-98",
                "bg-gradient-to-br from-neon-purple to-purple-600 dark:from-neon-purple dark:to-purple-700",
                "shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30"
              )}
              data-testid="button-feedback"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm">
                  <MessageSquarePlus className="h-6 w-6 text-white" />
                </div>
                <p className="text-white font-bold text-lg">Feedback</p>
                <p className="text-white/80 text-xs mt-1">Share your thoughts</p>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </button>
          </div>
        </section>

        {/* Stats Grid */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Your Activity</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/15 dark:bg-primary/10 rounded-xl border border-primary/20">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{checkIns.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">Check-ins</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neon-purple/15 dark:bg-neon-purple/10 rounded-xl border border-neon-purple/20">
                  <TrendingUp className="h-5 w-5 text-neon-purple" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.weeklyCheckIns || 0}</p>
                  <p className="text-xs text-muted-foreground font-medium">This Week</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/15 dark:bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <Dumbbell className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.monthlyCheckIns || 0}</p>
                  <p className="text-xs text-muted-foreground font-medium">This Month</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/15 dark:bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.currentStreak || 0}</p>
                  <p className="text-xs text-muted-foreground font-medium">Day Streak</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Recent Activity */}
        {checkIns.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Recent Check-ins</h2>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {checkIns.slice(0, 3).map((checkIn: any) => (
                <Card key={checkIn.id} className="p-4 border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neon-green/15 dark:bg-neon-green/10 rounded-xl border border-neon-green/20">
                        <Clock className="h-4 w-4 text-neon-green" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {format(new Date(checkIn.checkInTime), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(checkIn.checkInTime), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={checkIn.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {checkIn.status === 'active' ? 'Active' : 'Completed'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Gym Crowd Status */}
        {stats.currentCrowd !== undefined && (
          <Card className="p-6 border-border/50 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Gym Crowd</p>
                  <p className="text-xs text-muted-foreground">Current occupancy</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{stats.currentCrowd}</p>
                <p className="text-xs text-muted-foreground">people</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    stats.currentCrowd < 10 ? "bg-neon-green" : 
                    stats.currentCrowd < 25 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min((stats.currentCrowd / 40) * 100, 100)}%` }}
                />
              </div>
              <Badge variant="outline" className="text-xs">
                {stats.currentCrowd < 10 ? 'Quiet' : stats.currentCrowd < 25 ? 'Moderate' : 'Busy'}
              </Badge>
            </div>
          </Card>
        )}
      </main>

      {/* Modals */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
      <FeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
      />

      {/* Bottom Navigation */}
      <BottomNavigation notificationCount={0} />
    </div>
  );
}
