import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import QRModal from "@/components/qr-modal";
import PaymentModal from "@/components/payment-modal";
import FeedbackModal from "@/components/feedback-modal";
import Navigation from "@/components/ui/navigation";
import {
  CalendarCheck,
  IdCard,
  Users,
  QrCode,
  Crown,
  CreditCard,
  UserCog,
  Clock,
  TriangleAlert,
  MessageSquarePlus,
  Activity,
  TrendingUp,
  Dumbbell,
} from "lucide-react";

export default function MemberDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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

  const { data: trainers } = useQuery({
    queryKey: ["/api/trainers"],
    enabled: isAuthenticated,
    retry: false,
  });

  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [ptBookingDate, setPtBookingDate] = useState("");
  const [ptNotes, setPtNotes] = useState("");
  const [showPtBookingModal, setShowPtBookingModal] = useState(false);

  const bookPtMutation = useMutation({
    mutationFn: async (data: { trainerId: string; bookingDate: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/pt-bookings", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-bookings"] });
      setShowPtBookingModal(false);
      setPtBookingDate("");
      setPtNotes("");
      setSelectedTrainer(null);
      toast({
        title: "Success",
        description: "PT session booked successfully!",
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
        description: "Failed to book PT session",
        variant: "destructive",
      });
    },
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
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <Navigation user={user} notificationCount={isExpiringSoon ? 1 : 0} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Section - More Compact */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Hi, {user.firstName || "Member"}! 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Ready for your workout today?</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={() => generateQRMutation.mutate()}
                disabled={generateQRMutation.isPending}
                className="success-gradient text-white shadow-lg hover:shadow-xl transition-all"
                size="default"
                data-testid="button-generate-qr"
              >
                <QrCode className="mr-2 h-4 w-4" />
                {generateQRMutation.isPending ? "Generating..." : "Check-in QR"}
              </Button>
              <Button
                onClick={() => setShowFeedbackModal(true)}
                variant="outline"
                size="default"
                data-testid="button-feedback"
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Feedback
              </Button>
            </div>
          </div>
        </div>

        {/* Expiring Membership Warning - More Compact */}
        {isExpiringSoon && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50/80 dark:bg-yellow-950/20 dark:border-yellow-800">
            <CardContent className="p-4 flex items-start gap-3">
              <TriangleAlert className="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                  Membership Expiring Soon
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-0.5">
                  {getDaysUntilExpiry()} days left. Renew to continue your fitness journey.
                </p>
              </div>
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="warning-gradient text-white flex-shrink-0"
                size="sm"
                data-testid="button-renew-membership"
              >
                Renew Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats - Improved Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <CalendarCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-checkins">
                {stats.monthlyCheckIns || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Check-ins this month</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <IdCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-days-remaining">
                {getDaysUntilExpiry()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Days remaining</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <Dumbbell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-upcoming-classes">
                {stats.upcomingClasses || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Classes booked</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <Badge variant={crowdInfo.level === "Low" ? "default" : crowdInfo.level === "Medium" ? "secondary" : "destructive"} className="text-xs">
                  {crowdInfo.level}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-crowd-count">
                {crowdCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">People now</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Check-in History - Simplified */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Recent Check-ins</CardTitle>
                    <CardDescription className="text-xs">Your latest gym visits</CardDescription>
                  </div>
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-6 pb-6">
                {checkIns.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                      <CalendarCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No check-ins yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start your fitness journey today!</p>
                  </div>
                ) : (
                  <div className="space-y-3 px-4 sm:px-0">
                    {checkIns.slice(0, 5).map((checkIn: any) => (
                      <div 
                        key={checkIn.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        data-testid={`row-checkin-${checkIn.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {new Date(checkIn.checkInTime).toLocaleDateString('id-ID', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(checkIn.checkInTime).toLocaleTimeString('id-ID', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} • {formatDuration(checkIn)}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={checkIn.status === "completed" ? "default" : "secondary"} 
                          className="text-xs flex-shrink-0"
                        >
                          {checkIn.status === "completed" ? "Done" : "Active"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gym Classes - Simplified */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Available Classes</CardTitle>
                    <CardDescription className="text-xs">Book your next workout</CardDescription>
                  </div>
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {!classes || classes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                      <Dumbbell className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No classes available</p>
                    <p className="text-xs text-muted-foreground mt-1">Check back soon for new classes</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classes.slice(0, 3).map((gymClass: any) => (
                      <div 
                        key={gymClass.id} 
                        className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{gymClass.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{gymClass.description}</p>
                          </div>
                          <Badge 
                            variant={gymClass.currentEnrollment < gymClass.maxCapacity * 0.9 ? "default" : "secondary"}
                            className="ml-2 flex-shrink-0"
                          >
                            {gymClass.currentEnrollment < gymClass.maxCapacity * 0.9 ? "Available" : "Few Spots"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{gymClass.schedule}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{gymClass.currentEnrollment}/{gymClass.maxCapacity}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => bookClassMutation.mutate({
                            classId: gymClass.id,
                            bookingDate: new Date().toISOString()
                          })}
                          disabled={bookClassMutation.isPending}
                          className="w-full gym-gradient text-white"
                          size="sm"
                          data-testid={`button-book-class-${gymClass.id}`}
                        >
                          {bookClassMutation.isPending ? "Booking..." : "Book Class"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Trainers - Simplified */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Personal Trainers</CardTitle>
                    <CardDescription className="text-xs">Expert guidance for your goals</CardDescription>
                  </div>
                  <UserCog className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {!trainers || trainers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                      <UserCog className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No trainers available</p>
                    <p className="text-xs text-muted-foreground mt-1">Check back later</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trainers.map((trainer: any) => (
                      <div 
                        key={trainer.id} 
                        className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={trainer.imageUrl} alt={trainer.name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {trainer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{trainer.name}</h4>
                            <p className="text-xs text-muted-foreground">{trainer.specialization}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-primary">
                              Rp{parseFloat(trainer.pricePerSession).toLocaleString('id-ID')}
                            </p>
                            <p className="text-xs text-muted-foreground">per session</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedTrainer(trainer);
                            setShowPtBookingModal(true);
                          }}
                          variant="outline"
                          className="w-full"
                          size="sm"
                          data-testid={`button-book-trainer-${trainer.id}`}
                        >
                          Book Session
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Membership Status - Improved */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Membership</CardTitle>
              </CardHeader>
              <CardContent>
                {membership ? (
                  <div className="space-y-4">
                    <div className="text-center pb-4 border-b">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full success-gradient mb-3">
                        <Crown className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="font-bold text-foreground text-lg">{membership.plan.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{membership.plan.description}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Member Since</span>
                        <span className="text-sm font-medium text-foreground">
                          {new Date(membership.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm font-medium text-foreground">
                          {new Date(membership.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Auto Renewal</span>
                        <Badge variant={membership.autoRenewal ? "default" : "secondary"} className="text-xs">
                          {membership.autoRenewal ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                      <Crown className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">No active membership</p>
                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="gym-gradient text-white w-full"
                      data-testid="button-get-membership"
                    >
                      Get Membership
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History - Improved */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No payments yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.slice(0, 3).map((payment: any) => (
                      <div 
                        key={payment.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`payment-${payment.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              Rp{parseFloat(payment.amount).toLocaleString('id-ID')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleDateString('id-ID', { 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={payment.status === "success" ? "default" : "secondary"}
                          className="text-xs flex-shrink-0"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions - Simplified */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => setShowPaymentModal(true)}
                  variant="outline" 
                  className="w-full justify-start"
                  data-testid="button-renew-quick"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Renew Membership
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Update Profile
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

      <FeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
      />

      {/* PT Booking Modal */}
      <Dialog open={showPtBookingModal} onOpenChange={setShowPtBookingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book PT Session</DialogTitle>
            <DialogDescription>
              Schedule a personal training session with {selectedTrainer?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTrainer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedTrainer.imageUrl} alt={selectedTrainer.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedTrainer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{selectedTrainer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTrainer.specialization}</p>
                  <p className="text-sm font-medium text-primary">Rp{parseFloat(selectedTrainer.pricePerSession).toLocaleString('id-ID')}/session</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="booking-date">Booking Date & Time</Label>
                <Input
                  id="booking-date"
                  type="datetime-local"
                  value={ptBookingDate}
                  onChange={(e) => setPtBookingDate(e.target.value)}
                  required
                  data-testid="input-pt-booking-date"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="booking-notes">Notes (Optional)</Label>
                <Textarea
                  id="booking-notes"
                  placeholder="Any specific goals or requirements..."
                  value={ptNotes}
                  onChange={(e) => setPtNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-pt-notes"
                />
              </div>

              <Button
                onClick={() => {
                  if (!ptBookingDate) {
                    toast({
                      title: "Error",
                      description: "Please select a date and time",
                      variant: "destructive",
                    });
                    return;
                  }
                  bookPtMutation.mutate({
                    trainerId: selectedTrainer.id,
                    bookingDate: ptBookingDate,
                    notes: ptNotes || undefined,
                  });
                }}
                disabled={bookPtMutation.isPending}
                className="w-full gym-gradient text-white"
                data-testid="button-confirm-pt-booking"
              >
                {bookPtMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
