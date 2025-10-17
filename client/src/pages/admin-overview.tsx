import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/ui/admin-layout";
import AdminCheckInModal from "@/components/admin-checkin-modal";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  CalendarCheck,
  TriangleAlert,
  DollarSign,
  QrCode,
  TrendingUp,
  Bell,
  Sparkles,
  Activity,
  ArrowRight,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminDashboardStats {
  totalMembers?: number;
  activeToday?: number;
  expiringSoon?: number;
  revenue?: {
    thisMonth?: number;
    lastMonth?: number;
    total?: number;
  };
}

interface AdminDashboardResponse {
  stats?: AdminDashboardStats;
  users?: any[];
}

interface CheckInRecord {
  id: string;
  checkInTime: string;
  status?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  membership?: {
    plan?: {
      name?: string;
    };
  };
}

export default function AdminOverview() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "Admin access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/send-inactivity-reminders", {
        daysInactive: 7
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reminder Berhasil Dikirim! ✅",
        description: `${data.count} reminder telah dikirim ke member yang tidak aktif ${data.daysInactive} hari`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Mengirim Reminder",
        description: error.message || "Terjadi kesalahan saat mengirim reminder",
        variant: "destructive",
      });
    },
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<AdminDashboardResponse>({
    queryKey: ["/api/admin/dashboard"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: recentCheckIns } = useQuery<CheckInRecord[]>({
    queryKey: ["/api/admin/checkins"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
    refetchInterval: 10000,
  });

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500/20" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const stats = dashboardData?.stats || {};

  return (
    <AdminLayout user={user} notificationCount={stats.expiringSoon || 0}>
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-8 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Dashboard
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-lg ml-15">Welcome back! Here's your gym performance today</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => sendReminderMutation.mutate()}
                disabled={sendReminderMutation.isPending}
                variant="outline"
                className="group border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                data-testid="button-send-reminder"
              >
                {sendReminderMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 group-hover:animate-bounce" size={16} />
                    Send Reminder
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setShowCheckInModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-validate-checkin"
              >
                <QrCode className="mr-2" size={16} />
                Scan QR Code
                <Zap className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modern Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Total Members */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 cursor-pointer hover:-translate-y-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                  <div className="flex items-center gap-1 text-white">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-bold">+12%</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Total Members</p>
                <p className="text-4xl font-bold text-white" data-testid="text-total-members">{stats.totalMembers || 0}</p>
                <p className="text-white/60 text-xs mt-2">This month performance</p>
              </div>
            </div>
          </Card>

          {/* Active Today */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-500 to-emerald-600 hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 cursor-pointer hover:-translate-y-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarCheck className="w-7 h-7 text-white" />
                </div>
                <Activity className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Active Today</p>
                <p className="text-4xl font-bold text-white" data-testid="text-active-today">{stats.activeToday || 0}</p>
                <p className="text-white/60 text-xs mt-2">Check-ins today</p>
              </div>
            </div>
          </Card>

          {/* Expiring Soon */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-red-600 hover:shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 cursor-pointer hover:-translate-y-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TriangleAlert className="w-7 h-7 text-white" />
                </div>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Expiring Soon</p>
                <p className="text-4xl font-bold text-white" data-testid="text-expiring-soon">{stats.expiringSoon || 0}</p>
                <p className="text-white/60 text-xs mt-2">{"< 20 days remaining"}</p>
              </div>
            </div>
          </Card>

          {/* Monthly Revenue */}
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-pink-600 hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 cursor-pointer hover:-translate-y-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                  <div className="flex items-center gap-1 text-white">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-bold">+8%</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium mb-1">Monthly Revenue</p>
                <p className="text-4xl font-bold text-white" data-testid="text-monthly-revenue">${stats.revenue?.thisMonth || 0}</p>
                <p className="text-white/60 text-xs mt-2">vs last month</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity & Quick Actions Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Activity - Takes 2 columns */}
          <Card className="xl:col-span-2 border-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Latest member check-ins</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="gap-2 hover:gap-3 transition-all group"
                  data-testid="button-view-all-checkins"
                  onClick={() => window.location.href = '/admin/checkins'}
                >
                  View All
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              <div className="space-y-3">
                {!recentCheckIns || recentCheckIns.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                      <Activity className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">No recent check-ins</p>
                  </div>
                ) : (
                  recentCheckIns.slice(0, 5).map((checkin) => (
                    <div 
                      key={checkin.id} 
                      className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/50 dark:to-transparent hover:from-blue-50 dark:hover:from-blue-950/20 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-700 shadow-md ring-2 ring-blue-500/20">
                            <AvatarImage src={checkin.user?.profileImageUrl} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                              {`${checkin.user?.firstName?.[0] || ''}${checkin.user?.lastName?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <CalendarCheck className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {checkin.user?.firstName} {checkin.user?.lastName}
                          </p>
                          <Badge variant="outline" className="mt-1 border-slate-300 dark:border-slate-600 text-xs">
                            {checkin.membership?.plan?.name || 'No Plan'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {format(new Date(checkin.checkInTime), 'HH:mm')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {format(new Date(checkin.checkInTime), 'dd MMM')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quick Actions</h3>
              </div>
              
              <div className="space-y-3">
                {[
                  { label: "Manage Members", icon: Users, color: "from-blue-500 to-blue-600", href: "/admin/members" },
                  { label: "Manage Classes", icon: CalendarCheck, color: "from-green-500 to-green-600", href: "/admin/classes" },
                  { label: "Scan QR Code", icon: QrCode, color: "from-purple-500 to-purple-600", action: () => setShowCheckInModal(true) }
                ].map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={cn(
                      "w-full justify-start gap-3 h-14 group border-2",
                      "hover:border-transparent hover:shadow-lg transition-all",
                      `hover:bg-gradient-to-r hover:${action.color} hover:text-white`
                    )}
                    onClick={action.action || (() => window.location.href = action.href!)}
                    data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      `bg-gradient-to-br ${action.color} text-white shadow-md group-hover:bg-white/20`
                    )}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-left font-semibold">{action.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AdminCheckInModal
        open={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
      />
    </AdminLayout>
  );
}
