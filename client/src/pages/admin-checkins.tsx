import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/ui/admin-layout";
import { Clock, Activity, CalendarCheck, Sparkles, Camera, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const [isScanning, setIsScanning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef<boolean>(false);
  const scannerDivId = "auto-qr-scanner";

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

  const { data: recentCheckIns, refetch: refetchCheckIns } = useQuery<CheckInRecord[]>({
    queryKey: ["/api/admin/checkins"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
    refetchInterval: 10000,
  });

  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/admin/checkin/validate", { qrCode: code });
      return await response.json();
    },
    onSuccess: (data) => {
      setCheckInData(data);
      setShowSuccessModal(true);
      stopScanner();
      refetchCheckIns();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      
      setTimeout(() => {
        startScanner();
      }, 6000);
    },
    onError: (error: any) => {
      toast({
        title: "Validasi Gagal",
        description: error.message || "QR code tidak valid atau sudah expired",
        variant: "destructive",
      });
      setTimeout(() => {
        processingRef.current = false;
      }, 1000);
    },
  });

  const startScanner = async () => {
    try {
      setIsScanning(true);
      setCameraError("");
      processingRef.current = false;
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerDivId);
      }

      const config = { 
        fps: 10, 
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0
      };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (processingRef.current) {
            return;
          }
          
          processingRef.current = true;
          
          let qrCodeValue = decodedText;
          if (decodedText.includes('/checkin/verify/')) {
            const parts = decodedText.split('/checkin/verify/');
            qrCodeValue = parts[1] || decodedText;
          } else if (decodedText.includes('/')) {
            const parts = decodedText.split('/');
            qrCodeValue = parts[parts.length - 1] || decodedText;
          }
          
          validateMutation.mutate(qrCodeValue);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = await scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
        setIsScanning(false);
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      const timer = setTimeout(() => {
        startScanner();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          stopScanner();
        }
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-xs text-muted-foreground">Loading...</p>
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
      <div className="space-y-4 bg-[#0F172A] min-h-screen -m-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="space-y-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-white">
                Check-ins
              </h1>
              <Activity className="w-4 h-4 text-[#10B981] animate-pulse" />
            </div>
            <p className="text-gray-400 text-xs">Monitor member check-in activity</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 bg-[#1E293B] shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400">Today's Check-ins</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {recentCheckIns?.filter(c => {
                      const today = new Date();
                      const checkInDate = new Date(c.checkInTime);
                      return checkInDate.toDateString() === today.toDateString();
                    }).length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#10B981] flex items-center justify-center shadow-lg">
                  <CalendarCheck className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-[#1E293B] shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400">Total Check-ins</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {recentCheckIns?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
                  <Activity className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-[#1E293B] shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400">Active Members</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.activeToday || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Auto Camera Section */}
        <Card className="border-0 bg-[#1E293B] shadow-xl">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-[#10B981]" />
                <h2 className="text-lg font-bold text-white">Auto Check-in Camera</h2>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Arahkan QR code member ke kamera untuk check-in otomatis
              </p>
              
              <div className="relative max-w-md mx-auto">
                <div 
                  id={scannerDivId} 
                  className="w-full rounded-2xl overflow-hidden border-4 border-[#10B981] shadow-2xl"
                  data-testid="div-auto-scanner"
                />
                
                {isScanning && !cameraError && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[#10B981] animate-spin" />
                      <span className="text-xs text-white">Scanning...</span>
                    </div>
                  </div>
                )}
                
                {cameraError && (
                  <div className="bg-[#1E293B] rounded-2xl p-8 border-2 border-red-500">
                    <div className="text-center space-y-3">
                      <Camera className="w-12 h-12 text-red-500 mx-auto" />
                      <p className="text-sm text-red-400">{cameraError}</p>
                      <Button 
                        onClick={startScanner}
                        size="sm"
                        className="bg-[#10B981] hover:bg-[#0ea570] text-white"
                        data-testid="button-retry-camera"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Gunakan Kamera Manual
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-ins List */}
        <Card className="border-0 bg-[#1E293B] shadow-xl">
          <CardHeader className="pb-3 px-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base text-white">Recent Check-ins</CardTitle>
                <p className="text-xs text-gray-400 mt-0">Complete history</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!recentCheckIns || recentCheckIns.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-sm font-medium text-white mb-1">No check-ins yet</p>
                <p className="text-xs text-gray-400">Check-ins will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentCheckIns.map((checkin) => (
                  <div 
                    key={checkin.id} 
                    className="group flex items-center justify-between p-3 rounded-xl bg-[#0F172A] hover:bg-[#0F172A]/80 transition-all border border-gray-700 hover:border-[#10B981] cursor-pointer"
                    data-testid={`checkin-${checkin.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-[#10B981] shadow-lg">
                          <AvatarImage src={checkin.user?.profileImageUrl} />
                          <AvatarFallback className="bg-[#10B981] text-white font-semibold text-sm">
                            {`${checkin.user?.firstName?.[0] || ''}${checkin.user?.lastName?.[0] || ''}` || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#10B981] rounded-full border-2 border-[#0F172A] flex items-center justify-center">
                          <CalendarCheck className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white group-hover:text-[#10B981] transition-colors">
                          {checkin.user?.firstName} {checkin.user?.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="text-xs font-medium bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30">
                            {checkin.membership?.plan?.name || 'No Plan'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock size={14} className="text-gray-400" />
                        <p className="font-semibold text-white text-sm">
                          {format(new Date(checkin.checkInTime), 'HH:mm')}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(checkin.checkInTime), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Modal Pop-up */}
      {showSuccessModal && checkInData && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setShowSuccessModal(false)}
          data-testid="modal-success-overlay"
        >
          <div 
            className="bg-[#1E293B] rounded-2xl shadow-2xl border-2 border-[#10B981] w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-success-content"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              data-testid="button-close-modal"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-[#10B981] to-emerald-500 px-6 py-6 text-center relative">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <CalendarCheck className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Check-in Berhasil!</h3>
              <p className="text-sm text-white/90 mt-1">
                ✅ {checkInData.checkInTime ? format(new Date(checkInData.checkInTime), "HH:mm | dd MMM yyyy") : format(new Date(), "HH:mm | dd MMM yyyy")}
              </p>
            </div>

            {/* Member Info */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-4 border-[#10B981] shadow-lg">
                  <AvatarImage src={checkInData.user?.profileImageUrl} />
                  <AvatarFallback className="bg-[#10B981] text-white font-bold text-xl">
                    {`${checkInData.user?.firstName?.[0] || ''}${checkInData.user?.lastName?.[0] || ''}`}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white" data-testid="text-member-name">
                    {checkInData.user?.firstName} {checkInData.user?.lastName}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1" data-testid="text-member-email">
                    {checkInData.user?.email}
                  </p>
                </div>
              </div>

              {/* Membership Info */}
              {checkInData.membership && (
                <div className="bg-[#0F172A] rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-400">Membership</span>
                    <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 text-xs">
                      {checkInData.membership.plan?.name}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Berlaku Hingga</span>
                    <span className="text-sm font-semibold text-white" data-testid="text-membership-expiry">
                      {format(new Date(checkInData.membership.endDate), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
