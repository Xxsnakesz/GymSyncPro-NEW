import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Calendar, CreditCard, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface CheckInNotificationProps {
  show: boolean;
  data: any;
  onClose: () => void;
}

export default function CheckInNotificationPopup({ show, data, onClose }: CheckInNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!show && !visible) return null;

  const isSuccess = data?.success;
  const user = data?.user;
  const membership = data?.membership;
  
  const daysUntilExpiry = membership?.endDate 
    ? differenceInDays(new Date(membership.endDate), new Date()) 
    : 0;

  const getExpiryBadge = () => {
    if (!membership?.endDate) return null;
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="destructive" className="text-xs">Expiring Soon</Badge>;
    } else if (daysUntilExpiry <= 20) {
      return <Badge className="text-xs bg-yellow-500">Active</Badge>;
    }
    return <Badge className="text-xs bg-green-500">Active</Badge>;
  };

  return (
    <div 
      className={cn(
        "fixed top-20 right-6 z-50 transition-all duration-300 transform",
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      data-testid="checkin-notification-popup"
    >
      <div className={cn(
        "w-96 rounded-2xl shadow-2xl border-2 overflow-hidden",
        isSuccess 
          ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-500 dark:from-green-950/50 dark:to-emerald-950/50" 
          : "bg-gradient-to-br from-red-50 to-rose-50 border-red-500 dark:from-red-950/50 dark:to-rose-950/50"
      )}>
        {/* Header */}
        <div className={cn(
          "px-6 py-4 flex items-center justify-between",
          isSuccess ? "bg-green-500" : "bg-red-500"
        )}>
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle2 className="w-6 h-6 text-white" data-testid="icon-success" />
            ) : (
              <XCircle className="w-6 h-6 text-white" data-testid="icon-error" />
            )}
            <h3 className="text-lg font-bold text-white" data-testid="text-notification-title">
              {isSuccess ? "Check-in Berhasil!" : "Check-in Gagal"}
            </h3>
          </div>
          <button 
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
            data-testid="button-close-notification"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Member Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16 border-4 border-white dark:border-slate-800 shadow-lg" data-testid="img-member-photo">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback className="text-lg font-semibold">
                  {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800",
                isSuccess ? "bg-green-500" : "bg-red-500"
              )}>
                {isSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="text-xl font-bold text-foreground" data-testid="text-member-name">
                {user?.firstName} {user?.lastName}
              </h4>
              <p className="text-sm text-muted-foreground" data-testid="text-member-email">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Membership Details */}
          {membership ? (
            <div className="space-y-3 p-4 rounded-xl bg-white/60 dark:bg-slate-900/30 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isSuccess ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    <CreditCard className={cn(
                      "w-4 h-4",
                      isSuccess ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )} />
                  </div>
                  <span className="text-sm font-medium text-foreground">Membership</span>
                </div>
                {getExpiryBadge()}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Plan</span>
                  <span className="text-sm font-semibold text-foreground" data-testid="text-plan-name">
                    {membership.plan?.name || 'Unknown'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expired Date
                  </span>
                  <span className={cn(
                    "text-sm font-semibold",
                    daysUntilExpiry <= 7 ? "text-red-600 dark:text-red-400" : "text-foreground"
                  )} data-testid="text-expiry-date">
                    {format(new Date(membership.endDate), "dd MMM yyyy")}
                  </span>
                </div>

                {daysUntilExpiry >= 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">Remaining</span>
                    <span className={cn(
                      "text-sm font-bold",
                      daysUntilExpiry <= 7 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    )} data-testid="text-days-remaining">
                      {daysUntilExpiry} days
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
                {data?.message || "Tidak ada membership aktif"}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-center pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground" data-testid="text-checkin-time">
              {data?.checkInTime ? format(new Date(data.checkInTime), "HH:mm, dd MMMM yyyy") : format(new Date(), "HH:mm, dd MMMM yyyy")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
