import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/ui/admin-layout";
import { Clock, Activity, CalendarCheck, Sparkles, Camera, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CheckInRecord {
  id: string;
  checkInTime: string;
  status?: string;
  lockerNumber?: string;
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
  // Success modal removed per request; we will resume scanning immediately after approve
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

  // Step 1: preview the member info (no creation)
  const previewMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/admin/checkin/preview", { qrCode: code });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(text && text.startsWith("<!DOCTYPE") ? "Sesi admin berakhir atau rute tidak tersedia. Refresh halaman dan coba lagi." : (text || "Respon tidak valid dari server"));
      }
      return await res.json();
    },
    onSuccess: (data) => {
      if (!data?.success) {
        toast({ title: "Validasi Gagal", description: data?.message || "QR tidak valid", variant: "destructive" });
        processingRef.current = false;
        return;
      }
      setApprovalState({
        open: true,
        qrCode: data.qrCode,
        user: data.user,
        membership: data.membership,
        lastCheckIn: data.lastCheckIn,
      });
      stopScanner();
    },
    onError: (error: any) => {
      toast({ title: "Validasi Gagal", description: error.message || "QR code tidak valid atau sudah expired", variant: "destructive" });
      setTimeout(() => { processingRef.current = false; }, 1000);
    },
  });

  // Step 2: approve to create the check-in
  const approveMutation = useMutation({
    mutationFn: async (payload: { qrCode: string; lockerNumber?: string }) => {
      const res = await apiRequest("POST", "/api/admin/checkin/approve", payload);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(text && text.startsWith("<!DOCTYPE") ? "Sesi admin berakhir atau rute tidak tersedia. Refresh halaman dan coba lagi." : (text || "Respon tidak valid dari server"));
      }
      return await res.json();
    },
    onSuccess: (data) => {
      if (!data?.success) {
        toast({ title: "Gagal", description: data?.message || "Tidak bisa membuat check-in", variant: "destructive" });
        return;
      }
      // Close confirmation and resume scanning without a success modal
      setApprovalState((prev: any) => ({ ...prev, open: false, lockerNumber: '' }));
      refetchCheckIns();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      setTimeout(() => { startScanner(); }, 600);
    },
    onError: (error: any) => {
      toast({ title: "Gagal", description: error.message || "Tidak bisa menyetujui check-in", variant: "destructive" });
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
          
          previewMutation.mutate(qrCodeValue);
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

  const [approvalState, setApprovalState] = useState<any>({ open: false, qrCode: '', user: null, membership: null, lockerNumber: '', lastCheckIn: null });

  const approveCheckIn = () => {
    if (!approvalState.qrCode) return;
    approveMutation.mutate({ qrCode: approvalState.qrCode, lockerNumber: approvalState.lockerNumber });
  };

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
                <p className="text-sm font-medium text-white mb-1">Belum ada check-in</p>
                <p className="text-xs text-gray-400">Data check-in akan muncul di sini</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-700 overflow-hidden">
                {/* Header row */}
                <div className="hidden md:grid grid-cols-12 gap-3 items-center px-4 py-3 bg-[#0F172A] border-b border-gray-700 text-[11px] uppercase tracking-wide text-gray-400">
                  <div className="col-span-5">Member</div>
                  <div className="col-span-2">Plan</div>
                  <div className="col-span-2">Loker</div>
                  <div className="col-span-1 text-right">Jam</div>
                  <div className="col-span-2 text-right">Tanggal</div>
                </div>
                {/* Rows */}
                <div className="max-h-[480px] overflow-auto divide-y divide-gray-800">
                  {recentCheckIns.map((checkin, idx) => (
                    <div
                      key={checkin.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-4 py-3 bg-[#0B1220] hover:bg-[#0B1220]/90 transition-colors"
                      data-testid={`checkin-${checkin.id}`}
                    >
                      {/* Member */}
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-[#10B981] shadow-lg">
                            <AvatarImage src={checkin.user?.profileImageUrl} />
                            <AvatarFallback className="bg-[#10B981] text-white font-semibold text-sm">
                              {`${checkin.user?.firstName?.[0] || ''}${checkin.user?.lastName?.[0] || ''}` || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#10B981] rounded-full border-2 border-[#0B1220] flex items-center justify-center">
                            <CalendarCheck className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-white truncate">{checkin.user?.firstName} {checkin.user?.lastName}</p>
                          <p className="text-[11px] text-gray-400 truncate">{format(new Date(checkin.checkInTime), 'EEEE')}</p>
                        </div>
                      </div>

                      {/* Plan */}
                      <div className="col-span-2 flex md:justify-start">
                        <Badge className="text-xs font-medium bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30">
                          {checkin.membership?.plan?.name || 'No Plan'}
                        </Badge>
                      </div>

                      {/* Locker */}
                      <div className="col-span-2 text-left">
                        {checkin.lockerNumber ? (
                          <Badge className="text-xs font-medium bg-blue-500/20 text-blue-400 border-blue-500/30">Loker #{checkin.lockerNumber}</Badge>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </div>

                      {/* Time */}
                      <div className="col-span-1 md:text-right">
                        <div className="flex md:justify-end items-center gap-1 text-sm">
                          <Clock size={14} className="text-gray-400" />
                          <span className="font-semibold text-white">{format(new Date(checkin.checkInTime), 'HH:mm')}</span>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="col-span-2 md:text-right">
                        <span className="text-xs text-gray-400">{format(new Date(checkin.checkInTime), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Modal removed per request */}

      {/* Approve Check-in Dialog - redesigned wide confirmation card */}
      {approvalState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setApprovalState((p: any) => ({ ...p, open: false }))}>
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-700/60 bg-gradient-to-r from-emerald-600/20 to-transparent">
              <h3 className="text-lg font-bold text-white">Konfirmasi Check-in</h3>
              <p className="text-xs text-gray-300">Periksa data member lalu masukkan nomor loker sebelum menyetujui</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
              <div className="space-y-3">
                <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-[#1E293B] border border-gray-700">
                  {approvalState.user?.profileImageUrl ? (
                    <img src={approvalState.user.profileImageUrl} alt="Foto Member" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-gray-400 text-sm">No Photo</div>
                  )}
                </div>
                <div className="bg-[#0B1220] rounded-xl p-3 border border-gray-700">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Nomor Loker</div>
                  <input
                    type="text"
                    placeholder="Contoh: 27"
                    value={approvalState.lockerNumber || ''}
                    onChange={(e) => setApprovalState((p: any) => ({ ...p, lockerNumber: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-700 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/60"
                  />
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="text-xs text-gray-400">Member</div>
                  <div className="flex items-center gap-3 mt-1">
                    <Avatar className="h-12 w-12 border-2 border-emerald-500/40">
                      <AvatarImage src={approvalState.user?.profileImageUrl} />
                      <AvatarFallback className="bg-emerald-600 text-white">
                        {`${approvalState.user?.firstName?.[0] || ''}${approvalState.user?.lastName?.[0] || ''}` || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-base font-semibold text-white">{approvalState.user?.firstName} {approvalState.user?.lastName}</p>
                      <p className="text-xs text-gray-400">{approvalState.user?.email}</p>
                    </div>
                  </div>
                </div>
                {approvalState.membership && (
                  <div className="bg-[#0B1220] rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">{approvalState.membership.plan?.name}</div>
                      <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 text-[11px]">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-gray-400">Mulai</div>
                        <div className="font-semibold text-white">{format(new Date(approvalState.membership.startDate), 'dd MMM yyyy')}</div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-gray-400">Berakhir</div>
                        <div className="font-semibold text-white">{format(new Date(approvalState.membership.endDate), 'dd MMM yyyy')}</div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-gray-400">Sisa Hari</div>
                        <div className="font-semibold text-white">{Math.max(0, Math.ceil((new Date(approvalState.membership.endDate).getTime() - Date.now()) / (1000*60*60*24)))}</div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-gray-400">Perpanjangan</div>
                        <div className="font-semibold text-white">{approvalState.membership.autoRenewal ? 'Auto-renew' : 'Manual'}</div>
                      </div>
                    </div>
                  </div>
                )}
                {approvalState.lastCheckIn && (
                  <div className="bg-[#0B1220] rounded-xl p-4 border border-gray-700">
                    <div className="text-xs text-gray-400">Check-in Terakhir</div>
                    <div className="mt-1 text-sm font-semibold text-white">{format(new Date(approvalState.lastCheckIn.checkInTime), 'HH:mm • dd MMM yyyy')}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-5 border-t border-gray-700/60 flex justify-end gap-2 bg-[#0B1220]">
              <Button variant="outline" onClick={() => setApprovalState((p: any) => ({ ...p, open: false }))}>Batal</Button>
              <Button onClick={approveCheckIn} disabled={approveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500">
                {approveMutation.isPending ? 'Menyetujui...' : 'Setujui & Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
