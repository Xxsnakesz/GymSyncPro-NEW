import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRModal from "@/components/qr-modal";
import FeedbackModal from "@/components/feedback-modal";
import BottomNavigation from "@/components/ui/bottom-navigation";
import BrandTopbar from "@/components/brand-topbar";
import BrandWatermark from "@/components/brand-watermark";
import { Users, Crown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
 

export default function MemberDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [qrPayload, setQrPayload] = useState<any>(null);

  // Debug: render counter to help track unexpected hook-order / HMR issues
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug("[MemberDashboard] render", renderCountRef.current, {
      isAuthenticated,
      isLoading,
      user: user?.id,
    });
  }, [isAuthenticated, isLoading, user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Session Expired",
        description: "Please log in again",
        variant: "destructive",
      });
      setTimeout(() => (window.location.href = "/login"), 400);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<any>({
    queryKey: ["/api/member/dashboard"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Manual QR generation (avoid useMutation to keep hook ordering stable)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const generateQR = useCallback(async () => {
    if (user && user.active === false) {
      toast({
        title: "Akun sedang Cuti",
        description: "Silakan hubungi admin untuk mengaktifkan kembali akun Anda.",
        variant: "destructive",
      });
      return;
    }
    if (isGeneratingQR) return;
    setIsGeneratingQR(true);
    try {
      const response = await apiRequest("POST", "/api/checkin/generate");
      const body = await response.json();
      // show modal only after successful response
      setQrPayload(body);
      setShowQRModal(true);
      // Optionally you could store the qr payload in state if needed
      // setQrPayload(body);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  }, [isGeneratingQR, toast]);

  const isBusy = isLoading || dashboardLoading;
  const noUser = !user;

  const membership = dashboardData?.membership;
  const checkIns = dashboardData?.checkIns || [];
  const stats = dashboardData?.stats || {};

  const getDaysUntilExpiry = () => {
    if (!membership?.endDate) return 0;
    const now = new Date();
    const expiry = new Date(membership.endDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysUntilExpiry();

  // Mobile Promotions mini-carousel (lightweight, client-side)
  // Try to load live promotions for mobile snippet
  const { data: livePromos } = useQuery<any>({ queryKey: ["/api/member/promotions"], enabled: isAuthenticated });
  const mobilePromos = Array.isArray(livePromos) ? livePromos : [];
  const [promoIndex, setPromoIndex] = useState(0);
  const promoTimer = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    // auto-advance only when we have slides
    stopPromoAuto();
    if (mobilePromos.length > 0) {
      promoTimer.current = window.setTimeout(() => {
        setPromoIndex((i) => (i + 1) % mobilePromos.length);
      }, 4500);
    }
    return stopPromoAuto;
  }, [promoIndex, mobilePromos.length]);

  const stopPromoAuto = () => {
    if (promoTimer.current) {
      window.clearTimeout(promoTimer.current);
      promoTimer.current = null;
    }
  };
  const goPromo = (i: number) => {
    if (mobilePromos.length === 0) return;
    stopPromoAuto();
    setPromoIndex((i + mobilePromos.length) % mobilePromos.length);
  };
  const promoPrev = () => goPromo(promoIndex - 1);
  const promoNext = () => goPromo(promoIndex + 1);

  const onPromoTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    stopPromoAuto();
  };
  const onPromoTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onPromoTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (touchStartX.current == null) return;
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) {
      if (dx > 0) promoPrev(); else promoNext();
    }
  };

 

  return (
    <div className="relative min-h-screen bg-background pb-20 overflow-hidden">
      {/* Centered background watermark */}
  <BrandWatermark opacity={0.2} />

      {/* Fixed top brand bar (full width, text-only) */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <BrandTopbar className="rounded-none px-4 py-3" />
      </div>
      {/* Spacer to offset fixed bar height */}
      <div aria-hidden className="h-14" />

      {/* Header (scrolls with content) */}
      <header className="bg-gradient-to-br from-primary/15 via-neon-purple/10 to-background border-b border-border relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* brand bar moved to fixed top */}
 
          {/* Loading / Redirect states */}
          {isBusy || noUser ? (
            <div className="p-10 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground mt-3">{noUser ? 'Redirecting to login…' : 'Loading…'}</p>
            </div>
          ) : null}

          {/* Membership Status Banner (with fallback) */}
          {membership ? (
            <div className={cn("p-4 rounded-2xl text-white",
              user?.active === false ? "bg-gradient-to-r from-yellow-600 to-amber-600" : "bg-gradient-to-r from-primary to-neon-purple"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium opacity-90">
                      {user?.active === false ? "Membership Dijeda (Cuti)" : "Active Membership"}
                    </p>
                    <p className="text-sm font-bold">{membership.plan?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {user?.active === false ? (
                    <p className="text-xs opacity-90">Tidak berjalan selama Cuti</p>
                  ) : (
                    <>
                      <p className="text-xs opacity-90">{daysLeft} days left</p>
                      <p className="text-xs font-semibold">Exp: {format(new Date(membership.endDate), "MMM dd")}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-border bg-card/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl">
                    <Crown className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">No Active Membership</p>
                    <p className="text-xs text-muted-foreground">Ask admin to activate your plan</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => (window.location.href = '/my-profile')}>
                  View Profile
                </Button>
              </div>
            </div>
          )}
          {!isBusy && !noUser && user?.active === false && (
            <div className="mt-3 p-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200">
              <p className="text-xs">
                Akun Anda sedang <span className="font-semibold">Cuti</span>. Check-in dan booking sementara dinonaktifkan. Hubungi admin untuk mengaktifkan kembali.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {isBusy || noUser ? null : (
        <>

        {/* Gym Crowd Status (always visible with safe fallback) */}
        {(() => {
          const hasCrowd = typeof stats.currentCrowd === 'number';
          const value = hasCrowd ? stats.currentCrowd : 0;
          return (
            <Card className="p-6 border-border/50 bg-gradient-to-br from-card to-muted/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Gym Crowd</p>
                    <p className="text-xs text-muted-foreground">Current occupancy</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground">people{!hasCrowd ? ' (N/A)' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      value < 10 ? "bg-neon-green" : value < 25 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min((value / 40) * 100, 100)}%` }}
                  />
                </div>
                <Badge variant="outline" className="text-xs">
                  {value < 10 ? 'Quiet' : value < 25 ? 'Moderate' : 'Busy'}
                </Badge>
              </div>
            </Card>
          );
        })()}
  {/* Promotions (fills empty space) - visible on all screens */}
        <section className="mt-4" role="region" aria-label="Promotions">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h2 className="text-sm font-semibold text-foreground">Promotions & Offers</h2>
            <a href="/promotions" className="text-xs font-semibold" style={{ color: "#38F593" }}>See all</a>
          </div>
          {mobilePromos.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3">Belum ada promo aktif</div>
          ) : (
          <div
            className="relative w-full overflow-visible"
            onTouchStart={onPromoTouchStart}
            onTouchMove={onPromoTouchMove}
            onTouchEnd={onPromoTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${promoIndex * 100}%)` }}
            >
              {mobilePromos.map((p) => (
                <div key={p.id} className="shrink-0 grow-0 basis-full">
                  <a
                    href={(p as any).href || (p as any).ctaHref || "#"}
                    className="block mx-auto w-[88%] md:w-[72%] h-[58vw] min-h-[200px] max-h-[320px] relative select-none"
                    draggable={false}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white shadow-[0_6px_24px_rgba(0,0,0,0.15)] p-2">
                      <div className="relative w-full h-full rounded-xl overflow-hidden">
                        <img src={p.imageUrl} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-3 left-0 right-0 flex items-center justify-center gap-2">
              {mobilePromos.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goPromo(i)}
                  className="w-2.5 h-2.5 rounded-full transition-all"
                  style={{ backgroundColor: i === promoIndex ? "#38F593" : "rgba(255,255,255,0.45)", boxShadow: i === promoIndex ? "0 0 10px #38F593" : undefined }}
                />
              ))}
            </div>
          </div>
          )}
        </section>
        </>
        )}
      </main>

      {/* Modals */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrData={qrPayload}
      />
      <FeedbackModal
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
      />

      {/* Bottom Navigation */}
      <BottomNavigation
        notificationCount={0}
        onCheckIn={generateQR}
        checkInDisabled={isGeneratingQR || (user ? user.active === false : true)}
      />
    </div>
  );
}
