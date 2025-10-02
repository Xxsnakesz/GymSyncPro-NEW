import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import QRModal from "@/components/qr-modal";
import PaymentModal from "@/components/payment-modal";
import Navigation from "@/components/ui/navigation";
import {
  CalendarCheck,
  IdCard,
  Users,
  QrCode,
  Crown,
  CreditCard,
  Bus,
  UserCog,
  Bell,
  Clock,
  TriangleAlert,
} from "lucide-react";

export default function MemberDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/member/dashboard"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: classes } = useQuery({
    queryKey: ["/api/classes"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: expiringMemberships } = useQuery({
    queryKey: ["/api/notifications/expiring"],
    enabled: isAuthenticated,
    retry: false,
  });

  const generateQRMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checkin/generate");
      return await response.json();
    },
    onSuccess: () => {
      setShowQRModal(true);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    },
  });

  const bookClassMutation = useMutation({
    mutationFn: async ({ classId, bookingDate }: { classId: string; bookingDate: string }) => {
      const response = await apiRequest("POST", `/api/classes/${classId}/book`, { bookingDate });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member/dashboard"] });
      toast({
        title: "Success",
        description: "Class booked successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to book class",
        variant: "destructive",
      });
    },
  });

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const membership = dashboardData?.membership;
  const checkIns = dashboardData?.checkIns || [];
  const stats = dashboardData?.stats || {};
  const payments = dashboardData?.payments || [];
  const isExpiringSoon = expiringMemberships && expiringMemberships.length > 0;

  const getDaysUntilExpiry = () => {
    if (!membership?.endDate) return 0;
    const now = new Date();
    const expiry = new Date(membership.endDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDuration = (checkIn: any) => {
    if (!checkIn.checkOutTime) return "Active";
    const duration = new Date(checkIn.checkOutTime).getTime() - new Date(checkIn.checkInTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getCrowdLevel = (count: number) => {
    if (count < 10) return { level: "Low", color: "success-gradient", text: "Quiet time - perfect for workouts!" };
    if (count < 25) return { level: "Medium", color: "warning-gradient", text: "Moderate crowd - good availability" };
    return { level: "High", color: "danger-gradient", text: "Busy time - popular hours" };
  };

  const crowdCount = stats.currentCrowd || 0;
  const crowdInfo = getCrowdLevel(crowdCount);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation user={user} notificationCount={isExpiringSoon ? 1 : 0} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Welcome back, {user.firstName || "Member"}!
            </h2>
            <p className="text-muted-foreground mt-1">Here's your fitness journey overview</p>
          </div>
          <Button
            onClick={() => generateQRMutation.mutate()}
            disabled={generateQRMutation.isPending}
            className="success-gradient text-white w-full sm:w-auto"
            size="lg"
            data-testid="button-generate-qr"
          >
            <QrCode size={20} className="mr-2" />
            {generateQRMutation.isPending ? "Generating..." : "Generate Check-in QR"}
          </Button>
        </div>

        {/* Expiring Membership Warning */}
        {isExpiringSoon && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <TriangleAlert className="text-yellow-600 mt-1" size={20} />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Membership Expiring Soon</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your membership expires in {getDaysUntilExpiry()} days. Renew now to avoid interruption.
                  </p>
                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    className="mt-3 warning-gradient text-white"
                    size="sm"
                    data-testid="button-renew-membership"
                  >
                    Renew Membership
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-checkins">
                    {stats.monthlyCheckIns || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                </div>
                <div className="success-gradient w-12 h-12 rounded-lg flex items-center justify-center">
                  <CalendarCheck className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Membership</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-days-remaining">
                    {getDaysUntilExpiry()}
                  </p>
                  <p className="text-xs text-muted-foreground">Days left</p>
                </div>
                <div className="gym-gradient w-12 h-12 rounded-lg flex items-center justify-center">
                  <IdCard className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Classes Booked</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-upcoming-classes">
                    {stats.upcomingClasses || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">This week</p>
                </div>
                <div className="warning-gradient w-12 h-12 rounded-lg flex items-center justify-center">
                  <Users className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gym Crowd</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-crowd-count">
                    {crowdCount}
                  </p>
                  <p className="text-xs text-muted-foreground">People now</p>
                </div>
                <div className={`${crowdInfo.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Users className="text-white" size={20} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center space-x-2">
                  <Badge variant={crowdInfo.level === "Low" ? "default" : crowdInfo.level === "Medium" ? "secondary" : "destructive"}>
                    {crowdInfo.level}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{crowdInfo.text}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Check-in History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
                <p className="text-sm text-muted-foreground">Your gym visit history</p>
              </CardHeader>
              <CardContent>
                {checkIns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No check-ins yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {checkIns.map((checkIn: any) => (
                          <tr key={checkIn.id} data-testid={`row-checkin-${checkIn.id}`}>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {new Date(checkIn.checkInTime).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(checkIn.checkInTime).toLocaleDateString()}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                              {formatDuration(checkIn)}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={checkIn.status === "completed" ? "default" : "secondary"}>
                                {checkIn.status === "completed" ? "Complete" : "Active"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gym Classes */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Available Classes</CardTitle>
                    <p className="text-sm text-muted-foreground">Book your fitness classes</p>
                  </div>
                  <Button className="gym-gradient text-white">View All Classes</Button>
                </div>
              </CardHeader>
              <CardContent>
                {!classes || classes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No classes available</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.slice(0, 4).map((gymClass: any) => (
                      <Card key={gymClass.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground">{gymClass.name}</h4>
                              <p className="text-sm text-muted-foreground">{gymClass.description}</p>
                            </div>
                            <Badge variant={gymClass.currentEnrollment < gymClass.maxCapacity * 0.9 ? "default" : "secondary"}>
                              {gymClass.currentEnrollment < gymClass.maxCapacity * 0.9 ? "Available" : "Few Spots"}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <Clock size={16} className="mr-2" />
                              <span>{gymClass.schedule}</span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Users size={16} className="mr-2" />
                              <span>{gymClass.instructorName}</span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Users size={16} className="mr-2" />
                              <span>{gymClass.currentEnrollment}/{gymClass.maxCapacity} spots</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => bookClassMutation.mutate({
                              classId: gymClass.id,
                              bookingDate: new Date().toISOString()
                            })}
                            disabled={bookClassMutation.isPending}
                            className="mt-4 w-full gym-gradient text-white"
                            data-testid={`button-book-class-${gymClass.id}`}
                          >
                            {bookClassMutation.isPending ? "Booking..." : "Book Class"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Membership Status */}
            <Card>
              <CardHeader>
                <CardTitle>Membership Status</CardTitle>
              </CardHeader>
              <CardContent>
                {membership ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="success-gradient w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Crown className="text-white" size={24} />
                      </div>
                      <h4 className="font-semibold text-foreground">{membership.plan.name}</h4>
                      <p className="text-sm text-muted-foreground">{membership.plan.description}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Member Since</span>
                        <span className="text-sm font-medium text-foreground">
                          {new Date(membership.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm font-medium text-foreground">
                          {new Date(membership.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Auto Renewal</span>
                        <span className="text-sm font-medium text-green-600">
                          {membership.autoRenewal ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No active membership</p>
                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="gym-gradient text-white"
                      data-testid="button-get-membership"
                    >
                      Get Membership
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <p className="text-sm text-muted-foreground">Recent transactions</p>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payments yet</p>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 border border-border rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-foreground">{payment.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">${payment.amount}</p>
                          <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="mt-4 w-full">
                  View All Invoices
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  variant="outline"
                  className="w-full justify-between"
                  data-testid="button-renew-membership-quick"
                >
                  <div className="flex items-center">
                    <CreditCard className="text-primary mr-3" size={20} />
                    <span>Renew Membership</span>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center">
                    <Bus className="text-primary mr-3" size={20} />
                    <span>Book PT Session</span>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center">
                    <UserCog className="text-primary mr-3" size={20} />
                    <span>Update Profile</span>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrData={generateQRMutation.data}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  );
}
