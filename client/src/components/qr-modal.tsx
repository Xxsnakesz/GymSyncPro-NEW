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
      QRCode.toDataURL(currentQRData.qrCode, {
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
          
          <p className="text-sm text-muted-foreground text-center">
            Tunjukkan QR code ini ke resepsionis untuk check-in
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
