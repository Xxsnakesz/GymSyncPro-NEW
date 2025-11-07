import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, CreditCard, Building, Copy, CheckCircle, Clock, AlertCircle } from "lucide-react";
import * as QRCode from 'qrcode';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [selectedBank, setSelectedBank] = useState("bca");
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: plan & method, 2: payment result
  const [qrCodeSvg, setQrCodeSvg] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");

  const { data: membershipPlans } = useQuery<any[]>({
    queryKey: ["/api/membership-plans"],
    enabled: isOpen,
  });

  const qrisPaymentMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/payment/qris", { planId });
      return await response.json();
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      setStep(2);
      setTimeLeft(15 * 60); // 15 minutes
      
      // Generate QR code data URL
      if (data.qrString) {
        try {
          QRCode.toDataURL(data.qrString, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          }, (err, url) => {
            if (err) {
              console.error('Error generating QR code:', err);
            } else {
              setQrCodeSvg(url);
            }
          });
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/member/dashboard"] });
      toast({
        title: "QRIS Generated",
        description: "Scan QR code untuk melakukan pembayaran",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal membuat pembayaran QRIS",
        variant: "destructive",
      });
    },
  });

  const vaPaymentMutation = useMutation({
    mutationFn: async ({ planId, bankCode }: { planId: string; bankCode: string }) => {
      const response = await apiRequest("POST", "/api/payment/va", { planId, bankCode });
      return await response.json();
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      setStep(2);
      setTimeLeft(24 * 60 * 60); // 24 hours for VA
      queryClient.invalidateQueries({ queryKey: ["/api/member/dashboard"] });
      toast({
        title: "Virtual Account Created",
        description: `Transfer ke Virtual Account ${data.bank}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal membuat Virtual Account",
        variant: "destructive",
      });
    },
  });

  const handleProceedToPayment = () => {
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Pilih paket membership terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "qris") {
      qrisPaymentMutation.mutate(selectedPlan);
    } else if (paymentMethod === "va") {
      vaPaymentMutation.mutate({ planId: selectedPlan, bankCode: selectedBank });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} berhasil disalin`,
    });
  };

  const resetModal = () => {
    setStep(1);
    setPaymentResult(null);
    setSelectedPlan("");
    setPaymentMethod("qris");
    setSelectedBank("bca");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const plans = membershipPlans || [];
  const selectedPlanData = plans.find((plan: any) => plan.id === selectedPlan);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft <= 0) {
      setPaymentStatus('expired');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev ? prev - 1 : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Status polling effect  
  useEffect(() => {
    if (!paymentResult?.orderId || paymentStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiRequest('GET', `/api/payment/status/${paymentResult.orderId}`);
        const statusData = await response.json();
        
        if (statusData.status === 'completed') {
          setPaymentStatus('completed');
          toast({
            title: "Pembayaran Berhasil!",
            description: "Membership Anda telah aktif",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/member/dashboard"] });
          clearInterval(pollInterval);
        } else if (statusData.status === 'failed' || statusData.status === 'expired') {
          setPaymentStatus(statusData.status);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [paymentResult?.orderId, paymentStatus, toast, queryClient]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const bankOptions = [
    { value: "bca", label: "BCA", name: "Bank Central Asia" },
    { value: "bni", label: "BNI", name: "Bank Negara Indonesia" },
    { value: "bri", label: "BRI", name: "Bank Rakyat Indonesia" },
    { value: "mandiri", label: "Mandiri", name: "Bank Mandiri" },
    { value: "permata", label: "Permata", name: "Bank Permata" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-0" data-testid="modal-payment">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {step === 1 ? "Pilih Paket & Metode Pembayaran" : "Informasi Pembayaran"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-6">
          <div className="space-y-6">
          {step === 1 ? (
            <>
              {/* Plan Selection */}
              <div>
                <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3 block">Pilih Paket Membership</Label>
                <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                  <div className="space-y-3">
                    {plans.map((plan: any) => (
                      <div key={plan.id}>
                        <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                        <Label
                          htmlFor={plan.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                            selectedPlan === plan.id ? 'border-primary bg-primary/5 border-2' : 'border-border'
                          }`}
                          data-testid={`option-plan-${plan.id}`}
                        >
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-foreground">{plan.name}</span>
                              <span className="font-bold text-foreground">Rp {parseInt(plan.price).toLocaleString('id-ID')}/bulan</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Method Selection */}
              <div>
                <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3 block">Metode Pembayaran</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    <div>
                      <RadioGroupItem value="qris" id="qris" className="sr-only" />
                      <Label
                        htmlFor="qris"
                        className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                          paymentMethod === "qris" ? 'border-primary bg-primary/5 border-2' : 'border-border'
                        }`}
                        data-testid="option-payment-qris"
                      >
                        <QrCode className="text-primary mr-3" size={20} />
                        <div className="flex-1">
                          <span className="font-medium text-foreground">QRIS</span>
                          <p className="text-sm text-muted-foreground">Scan QR dengan GoPay, DANA, OVO, ShopeePay</p>
                        </div>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem value="va" id="va" className="sr-only" />
                      <Label
                        htmlFor="va"
                        className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                          paymentMethod === "va" ? 'border-primary bg-primary/5 border-2' : 'border-border'
                        }`}
                        data-testid="option-payment-va"
                      >
                        <Building className="text-primary mr-3" size={20} />
                        <div className="flex-1">
                          <span className="font-medium text-foreground">Virtual Account</span>
                          <p className="text-sm text-muted-foreground">Transfer bank melalui ATM atau internet banking</p>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Bank Selection for VA */}
              {paymentMethod === "va" && (
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3 block">Pilih Bank</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger data-testid="select-bank">
                      <SelectValue placeholder="Pilih bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankOptions.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          {bank.label} - {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Total */}
              {selectedPlanData && (
                <Card className="bg-muted">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">Total</span>
                      <span className="text-2xl font-bold text-foreground" data-testid="text-payment-total">
                        Rp {parseInt(selectedPlanData.price).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Pembayaran bulanan</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <Button
                  onClick={handleProceedToPayment}
                  disabled={!selectedPlan || qrisPaymentMutation.isPending || vaPaymentMutation.isPending}
                  className="flex-1 success-gradient text-white text-sm sm:text-base h-10 sm:h-11"
                  data-testid="button-proceed-payment"
                >
                  {qrisPaymentMutation.isPending || vaPaymentMutation.isPending ? (
                    "Memproses..."
                  ) : (
                    <>
                      {paymentMethod === "qris" ? <QrCode size={14} className="mr-2" /> : <Building size={14} className="mr-2" />}
                      Lanjutkan Pembayaran
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 text-sm sm:text-base h-10 sm:h-11"
                  data-testid="button-cancel-payment"
                >
                  Batal
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Payment Result */}
              {paymentResult && (
                <>
                  {paymentMethod === "qris" ? (
                    <div className="text-center space-y-6">
                      <div className="success-gradient w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <QrCode className="text-white" size={24} />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">QRIS Pembayaran</h3>
                        <p className="text-muted-foreground">Scan QR code di bawah dengan aplikasi e-wallet Anda</p>
                      </div>

                      <Card>
                        <CardContent className="p-6">
                          <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300 mb-4">
                            <div className="w-48 h-48 bg-white rounded flex items-center justify-center mx-auto">
                              {qrCodeSvg ? (
                                <img 
                                  src={qrCodeSvg} 
                                  alt="QR Code untuk pembayaran" 
                                  className="w-full h-full object-contain"
                                  data-testid="img-qr-code"
                                />
                              ) : (
                                <div className="text-center">
                                  <QrCode size={64} className="text-gray-400 mx-auto mb-2" />
                                  <p className="text-xs text-gray-500">Generating QR Code...</p>
                                </div>
                              )}
                            </div>
                            
                            {timeLeft && paymentStatus === 'pending' && (
                              <div className="flex items-center justify-center mt-3 text-sm text-muted-foreground">
                                <Clock size={16} className="mr-2" />
                                <span>Berlaku selama: {formatTime(timeLeft)}</span>
                              </div>
                            )}
                            
                            {paymentStatus === 'expired' && (
                              <div className="flex items-center justify-center mt-3 text-sm text-red-600">
                                <AlertCircle size={16} className="mr-2" />
                                <span>QR Code telah kadaluarsa</span>
                              </div>
                            )}
                            
                            {paymentStatus === 'completed' && (
                              <div className="flex items-center justify-center mt-3 text-sm text-green-600">
                                <CheckCircle size={16} className="mr-2" />
                                <span>Pembayaran berhasil!</span>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            onClick={() => copyToClipboard(paymentResult.qrString, "QR String")}
                            variant="outline"
                            className="w-full"
                            data-testid="button-copy-qr"
                          >
                            <Copy size={16} className="mr-2" />
                            Copy QR String
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="warning-gradient w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <Building className="text-white" size={24} />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Virtual Account {paymentResult.bank}</h3>
                        <p className="text-muted-foreground">Transfer ke nomor Virtual Account berikut</p>
                      </div>

                      <Card>
                        <CardContent className="p-6 space-y-4">
                          <div className="text-center">
                            <Label className="text-sm text-muted-foreground">Nomor Virtual Account</Label>
                            <div className="flex items-center justify-center space-x-2 mt-2">
                              <span className="text-2xl font-mono font-bold text-foreground" data-testid="text-va-number">
                                {paymentResult.vaNumber}
                              </span>
                              <Button
                                onClick={() => copyToClipboard(paymentResult.vaNumber, "Nomor VA")}
                                variant="outline"
                                size="sm"
                                data-testid="button-copy-va"
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="text-muted-foreground">Bank</Label>
                              <p className="font-medium">{paymentResult.bank}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Jumlah</Label>
                              <p className="font-medium">Rp {parseInt(selectedPlanData?.price || '0').toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="text-green-500 mt-0.5" size={16} />
                      <span>Membership akan aktif otomatis setelah pembayaran berhasil</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="text-green-500 mt-0.5" size={16} />
                      <span>Anda akan menerima notifikasi konfirmasi pembayaran</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleClose}
                    className="w-full gym-gradient text-white"
                    data-testid="button-finish-payment"
                  >
                    Selesai
                  </Button>
                </>
              )}
            </>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
