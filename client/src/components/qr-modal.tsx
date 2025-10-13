import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import QRCode from "qrcode";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData?: any;
}

export default function QRModal({ isOpen, onClose, qrData }: QRModalProps) {
  const { toast } = useToast();
  const [currentQRData, setCurrentQRData] = useState(qrData);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateNewQRMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checkin/generate");
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentQRData(data);
      toast({
        title: "Success",
        description: "New QR code generated",
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
        description: "Failed to generate new QR code",
        variant: "destructive",
      });
    },
  });

  // Generate QR code image when data changes
  useEffect(() => {
    if (currentQRData?.qrCode) {
      // Create a URL for the QR code that member can scan to check-in
      const checkInUrl = `${window.location.origin}/checkin/verify/${currentQRData.qrCode}`;
      
      QRCode.toDataURL(checkInUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then(url => {
        setQrCodeDataURL(url);
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });
    }
  }, [currentQRData]);

  // Update currentQRData when qrData prop changes
  useEffect(() => {
    if (qrData && qrData !== currentQRData) {
      setCurrentQRData(qrData);
    }
  }, [qrData, currentQRData]);

  // Countdown timer for QR expiry
  useEffect(() => {
    if (!currentQRData?.expiresAt) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expires = new Date(currentQRData.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      return remaining;
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Track if refresh is already in progress
    let refreshInProgress = false;

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Auto-refresh QR 30 seconds before expiry (or when expired)
      // Only trigger once and avoid flood of requests
      if (remaining <= 30 && !refreshInProgress && !generateNewQRMutation.isPending) {
        refreshInProgress = true;
        generateNewQRMutation.mutate();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQRData?.expiresAt, generateNewQRMutation]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-qr-code">
        <DialogHeader>
          <DialogTitle className="text-center">Check-in QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 p-6">
          {/* Membership Status Badge */}
          {currentQRData?.hasActiveMembership !== undefined && (
            <div className={`w-full flex items-center justify-center gap-3 p-4 rounded-lg border-2 ${
              currentQRData.hasActiveMembership 
                ? 'bg-green-50 dark:bg-green-950/20 border-green-500' 
                : 'bg-red-50 dark:bg-red-950/20 border-red-500'
            }`} data-testid="membership-status-banner">
              {currentQRData.hasActiveMembership ? (
                <>
                  <div className="bg-green-500 rounded-full p-2">
                    <CheckCircle2 className="w-6 h-6 text-white" data-testid="icon-membership-active" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-green-600 dark:text-green-400" data-testid="text-membership-active">
                      Membership Active
                    </h3>
                    {currentQRData.membership && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {currentQRData.membership.plan?.name}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-red-500 rounded-full p-2">
                    <XCircle className="w-6 h-6 text-white" data-testid="icon-no-membership" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-600 dark:text-red-400" data-testid="text-no-membership">
                      Belum Terdaftar Membership
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Silakan daftar membership terlebih dahulu
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* QR Code Display */}
          <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center">
              {qrCodeDataURL ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={qrCodeDataURL} 
                    alt="Check-in QR Code" 
                    className="w-48 h-48 rounded-lg"
                    data-testid="img-qr-code"
                  />
                  <p className="text-xs text-gray-500 mt-2">Scan to Check-in</p>
                  {currentQRData?.qrCode && (
                    <p className="text-xs text-gray-400 mt-1 font-mono" data-testid="text-qr-code">
                      ID: {currentQRData.qrCode.slice(-8)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode size={64} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Generating QR Code...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          {timeRemaining > 0 && (
            <div className={`w-full p-3 rounded-lg border-2 ${
              timeRemaining <= 60 ? 'bg-red-50 dark:bg-red-950/20 border-red-500' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
            }`} data-testid="countdown-timer">
              <div className="flex items-center justify-center gap-2">
                <span className={`font-bold ${
                  timeRemaining <= 60 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                }`} data-testid="text-time-remaining">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {timeRemaining <= 60 ? 'QR akan expired!' : 'berlaku'}
                </span>
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground text-center">
            Scan QR code ini untuk check-in otomatis. QR sekali pakai berlaku 5 menit.
          </p>
          
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => generateNewQRMutation.mutate()}
              disabled={generateNewQRMutation.isPending}
              className="flex-1 gym-gradient text-white"
              data-testid="button-refresh-qr"
            >
              <RefreshCw 
                size={16} 
                className={`mr-2 ${generateNewQRMutation.isPending ? 'animate-spin' : ''}`} 
              />
              {generateNewQRMutation.isPending ? "Generating..." : "Generate New Code"}
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-close-qr-modal"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
