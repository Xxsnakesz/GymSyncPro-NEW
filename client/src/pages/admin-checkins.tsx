import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/ui/admin-layout";
import AdminCheckInModal from "@/components/admin-checkin-modal";
import { QrCode, Clock } from "lucide-react";
import { format } from "date-fns";

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

export default function AdminCheckIns() {
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

  const { data: dashboardData } = useQuery<any>({
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

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-foreground">Check-ins</h1>
            <p className="text-muted-foreground mt-1">Monitor member check-in activity</p>
          </div>
          <Button 
            onClick={() => setShowCheckInModal(true)}
            className="gym-gradient text-white"
            data-testid="button-validate-checkin"
          >
            <QrCode className="mr-2" size={16} />
            Validate Check-in
          </Button>
        </div>

        {/* Check-ins List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentCheckIns || recentCheckIns.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No check-ins yet</p>
            ) : (
              <div className="space-y-3">
                {recentCheckIns.map((checkin) => (
                  <div 
                    key={checkin.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    data-testid={`checkin-${checkin.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={checkin.user?.profileImageUrl} />
                        <AvatarFallback>
                          {`${checkin.user?.firstName?.[0] || ''}${checkin.user?.lastName?.[0] || ''}` || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {checkin.user?.firstName} {checkin.user?.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {checkin.membership?.plan?.name || 'No Plan'}
                          </Badge>
                          {checkin.status && (
                            <Badge variant="default" className="text-xs">
                              {checkin.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <Clock size={16} className="text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">
                          {format(new Date(checkin.checkInTime), 'HH:mm')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(checkin.checkInTime), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
