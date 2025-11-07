import { useEffect, useMemo, useRef, useState } from "react";
import BottomNavigation from "@/components/ui/bottom-navigation";
import BrandTopbar from "@/components/brand-topbar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Promo {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  cta?: string;
  ctaHref?: string;
}

const NAVY_BG = "#0A1A3D";
const NEON = "#38F593";

// Admin-managed only: no local samples here

export default function PromotionsPage() {
  const { toast } = useToast();
  // Fetch from API with fallback to sample data
  const { data: apiPromos, error, isLoading } = useQuery<Promo[]>({ queryKey: ["/api/member/promotions"], queryFn: getQueryFn({ on401: "throw" }) });
  const promos = Array.isArray(apiPromos) ? apiPromos : [];
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const slideCount = promos.length;

  // Show a friendly toast if API failed, but keep rendering with samples
  useEffect(() => {
    if (error) {
      console.warn("/api/member/promotions error:", error);
      toast({ title: "Tidak bisa memuat promos", description: String((error as any)?.message || error), variant: "destructive" });
    }
  }, [error]);

  // Auto-slide every ~4.5s
  useEffect(() => {
    if (slideCount > 0) startAuto();
    return stopAuto;
  }, [index, slideCount]);

  const startAuto = () => {
    stopAuto();
    if (slideCount > 0) {
      timerRef.current = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % slideCount);
      }, 4500);
    }
  };

  const stopAuto = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goTo = (i: number) => {
    stopAuto();
    setIndex(i % slideCount);
  };

  const prev = () => goTo((index - 1 + slideCount) % slideCount);
  const next = () => goTo((index + 1) % slideCount);

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    stopAuto();
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (touchStartX.current == null) return;
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) {
      if (dx > 0) prev(); else next();
    } else {
      startAuto();
    }
  };

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: NAVY_BG, WebkitTapHighlightColor: "transparent" }}>
      {/* Fixed top brand bar */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <BrandTopbar className="rounded-none px-4 py-3" />
      </div>
      <div aria-hidden className="h-14" />

      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#FFFFFF" }}>
            Promotions & Offers
          </h1>
          <p className="text-xs md:text-sm mt-2" style={{ color: "rgba(255,255,255,0.8)" }}>
            Temukan penawaran spesial untuk member aktif IDACHI FITNESS.
          </p>
        </div>
      </header>

      {/* Carousel */}
      <section className="px-4 mt-3" role="region" aria-label="Promotions carousel">
        <div className="max-w-6xl mx-auto">
          <div
            className="relative w-full overflow-visible"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {promos.map((p) => (
                <div key={p.id} className="shrink-0 grow-0 basis-full">
                  <a
                    href={p.ctaHref || "#"}
                    className="block mx-auto w-[88%] md:w-[72%] h-[58vw] min-h-[220px] max-h-[360px] md:h-[460px] relative select-none"
                    draggable={false}
                    aria-live="polite"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] p-2">
                      <div className="relative w-full h-full rounded-xl overflow-hidden">
                        <img src={p.imageUrl} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            <div className="absolute -bottom-4 left-0 right-0 flex items-center justify-center gap-3">
              {Array.from({ length: slideCount }).map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className="w-2.5 h-2.5 rounded-full transition-all"
                  style={{
                    backgroundColor: i === index ? NEON : "rgba(255,255,255,0.5)",
                    boxShadow: i === index ? `0 0 10px ${NEON}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Optional: Promotion Grid */}
      <section className="px-4 mt-6 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-6xl mx-auto">
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-2 h-36 md:h-44 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && promos.length === 0 && (
            <div className="text-center text-white/80 text-sm py-8">Belum ada promotions</div>
          )}
          {!isLoading && promos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {promos.map((p) => (
              <a
                key={p.id}
                href={p.ctaHref || "#"}
                className="group rounded-2xl overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_10px_34px_rgba(0,0,0,0.16)] transition-shadow"
              >
                <div className="relative h-28 md:h-40 p-2">
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <img src={p.imageUrl} alt={p.title} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                  </div>
                </div>
                <div className="p-3 md:p-4">
                  <h4 className="text-gray-900 text-xs md:text-sm font-semibold line-clamp-1">{p.title}</h4>
                  <p className="text-gray-600 text-[11px] md:text-xs mt-1 line-clamp-2">{p.description}</p>
                </div>
              </a>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* Bottom navigation for member */}
      <BottomNavigation />
    </div>
  );
}
