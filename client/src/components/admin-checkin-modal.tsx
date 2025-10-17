import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CheckInNotificationPopup from "@/components/checkin-notification-popup";
import { QrCode, User, Calendar, CreditCard, Clock, CheckCircle2, Camera, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";

interface AdminCheckInModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminCheckInModal({ open, onClose, onSuccess }: AdminCheckInModalProps) {
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState("");
  const [memberData, setMemberData] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef<boolean>(false);
  const scannerDivId = "qr-reader";

  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/admin/checkin/validate", { qrCode: code });
      return await response.json();
    },
    onSuccess: (data) => {
      setMemberData(data);
      
      // Show notification popup
      setNotificationData(data);
      setShowNotification(true);
      
      if (data.success) {
        if (onSuccess) {
          onSuccess();
        }
      }
      
      // Stop scanner after scan
      stopScanner();
    },
    onError: (error: any) => {
      toast({
        title: "Validasi Gagal",
        description: error.message || "QR code tidak valid atau sudah expired",
        variant: "destructive",
      });
      setMemberData(null);
    },
  });


  const startScanner = async () => {
    try {
      setIsScanning(true);
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerDivId);
      }

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
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
          setQrCode(decodedText);
          
          let qrCodeValue = decodedText;
          if (decodedText.includes('/checkin/verify/')) {
            const parts = decodedText.split('/checkin/verify/');
            qrCodeValue = parts[1] || decodedText;
          } else if (decodedText.includes('/')) {
            const parts = decodedText.split('/');
            qrCodeValue = parts[parts.length - 1] || decodedText;
          }
          
          stopScanner();
          
          validateMutation.mutate(qrCodeValue);
        },
        (errorMessage) => {
        }
      );
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      toast({
        title: "Error",
        description: "Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.",
        variant: "destructive",
      });
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

  const handleClose = async () => {
    await stopScanner();
    setQrCode("");
    setMemberData(null);
    processingRef.current = false;
    onClose();
  };


  useEffect(() => {
    if (open && !isScanning && !memberData) {
      processingRef.current = false;
      
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          stopScanner();
        }
      };
    }
    
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, [open, memberData]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const getMembershipStatus = (endDate: Date) => {
    const now = new Date();
    const daysUntilExpiry = Math.ceil((new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: "Expired", variant: "destructive" as const };
    if (daysUntilExpiry <= 7) return { status: "Expiring Soon", variant: "destructive" as const };
    if (daysUntilExpiry <= 30) return { status: "Active", variant: "default" as const };
    return { status: "Active", variant: "default" as const };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-admin-checkin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Validasi Check-in Member
            </DialogTitle>
            <DialogDescription>
              Scan QR code member untuk validasi check-in
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!memberData && (
              <div className="space-y-2">
                <div className="text-sm text-center text-muted-foreground mb-2">
                  Arahkan kamera ke QR code member
                </div>
                <div 
                  id={scannerDivId} 
                  className="w-full border-2 border-dashed border-primary rounded-lg overflow-hidden"
                  data-testid="div-qr-scanner"
                />
                {isScanning && (
                  <p className="text-xs text-center text-muted-foreground">
                    Scanner aktif - mencari QR code...
                  </p>
                )}
              </div>
            )}

            {memberData && (
              <div className="space-y-4">
                {memberData.success ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-500">
                    <div className="bg-green-500 rounded-full p-4 mb-4">
                      <CheckCircle2 className="w-12 h-12 text-white" data-testid="icon-success-checkmark" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-success-message">
                      CHECK-IN BERHASIL
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2" data-testid="text-checkin-time">
                      {format(new Date(memberData.checkInTime), "HH:mm, dd MMMM yyyy")}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-500">
                    <div className="bg-red-500 rounded-full p-4 mb-4">
                      <XCircle className="w-12 h-12 text-white" data-testid="icon-fail-cross" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-fail-message">
                      CHECK-IN GAGAL
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2" data-testid="text-fail-reason">
                      {memberData.message || "Belum Terdaftar Membership"}
                    </p>
                  </div>
                )}

                <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16" data-testid="img-member-avatar">
                      <AvatarImage src={memberData.user?.profileImageUrl} />
                      <AvatarFallback>
                        {`${memberData.user?.firstName?.[0] || ''}${memberData.user?.lastName?.[0] || ''}`}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg" data-testid="text-member-name">
                        {memberData.user?.firstName} {memberData.user?.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-member-email">
                        {memberData.user?.email}
                      </p>
                    </div>
                  </div>

                  {memberData.membership ? (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Membership</span>
                        </div>
                        <Badge 
                          variant={getMembershipStatus(memberData.membership.endDate).variant}
                          data-testid="badge-membership-status"
                        >
                          {memberData.membership.plan.name}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Berlaku Hingga</span>
                        </div>
                        <span className="text-sm" data-testid="text-membership-enddate">
                          {format(new Date(memberData.membership.endDate), "dd MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 text-center border-t border-border">
                      <Badge variant="destructive">Tidak ada membership aktif</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} data-testid="button-close">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Popup */}
      <CheckInNotificationPopup
        show={showNotification}
        data={notificationData}
        onClose={() => {
          setShowNotification(false);
          setNotificationData(null);
        }}
      />
    </>
  );
}
