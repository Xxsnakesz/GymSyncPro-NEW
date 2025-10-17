import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Clock,
  UserPlus,
  Bell,
} from "lucide-react";
import { format } from "date-fns";

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
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const stats = dashboardData?.stats || {};

  return (
    <AdminLayout user={user} notificationCount={stats.expiringSoon || 0}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-1">Monitor your gym performance</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => sendReminderMutation.mutate()}
              disabled={sendReminderMutation.isPending}
              variant="outline"
              data-testid="button-send-reminder"
            >
              {sendReminderMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Bell className="mr-2" size={16} />
                  Kirim Reminder
                </>
              )}
            </Button>
            <Button 
              onClick={() => setShowCheckInModal(true)}
              className="gym-gradient text-white"
              data-testid="button-validate-checkin"
            >
              <QrCode className="mr-2" size={16} />
              Validate Check-in
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-total-members">
                    {stats.totalMembers || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">+12 this month</p>
                </div>
                <div className="gym-gradient w-14 h-14 rounded-xl flex items-center justify-center">
                  <Users className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Today</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-active-today">
                    {stats.activeToday || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Current check-ins</p>
                </div>
                <div className="success-gradient w-14 h-14 rounded-xl flex items-center justify-center">
                  <CalendarCheck className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-3xl font-bold text-destructive mt-2" data-testid="text-expiring-soon">
                    {stats.expiringSoon || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{"< 20 days"}</p>
                </div>
                <div className="bg-gradient-to-r from-red-500 to-red-600 w-14 h-14 rounded-xl flex items-center justify-center">
                  <TriangleAlert className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-monthly-revenue">
                    ${stats.revenue?.thisMonth || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">+8% vs last month</p>
                </div>
                <div className="warning-gradient w-14 h-14 rounded-xl flex items-center justify-center">
                  <DollarSign className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Check-ins</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Latest member activity</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-view-all-checkins">
                <Clock className="mr-2" size={14} />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!recentCheckIns || recentCheckIns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent check-ins</p>
            ) : (
              <div className="space-y-4">
                {recentCheckIns.slice(0, 5).map((checkin) => (
                  <div key={checkin.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="text-primary" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {checkin.user?.firstName} {checkin.user?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {checkin.membership?.plan?.name || 'No Plan'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(checkin.checkInTime), 'HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(checkin.checkInTime), 'dd MMM')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={() => window.location.href = '/admin/members'}
                data-testid="button-manage-members"
              >
                <Users size={24} />
                <span>Manage Members</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={() => window.location.href = '/admin/classes'}
                data-testid="button-manage-classes"
              >
                <CalendarCheck size={24} />
                <span>Manage Classes</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex-col gap-2"
                onClick={() => setShowCheckInModal(true)}
                data-testid="button-quick-checkin"
              >
                <QrCode size={24} />
                <span>Validate Check-in</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-in Modal */}
      <AdminCheckInModal
        open={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
      />
    </AdminLayout>
  );
}
