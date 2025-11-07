import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/ui/bottom-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Trainer {
  id: string;
  name: string;
  specialization?: string;
  pricePerSession?: string;
  imageUrl?: string;
  bio?: string;
  experience?: number;
  certification?: string;
}

export default function BookPTPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: trainers, isLoading } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
    enabled: isAuthenticated,
  });

  const [form, setForm] = useState<Record<string, { datetime: string; sessions: number; notes?: string }>>({});

  const bookPT = useMutation({
    mutationFn: async (vars: { trainerId: string; bookingDate: string; sessionCount: number; notes?: string }) => {
      const res = await apiRequest("POST", "/api/pt-bookings", vars);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-bookings"] });
      toast({ title: "Requested!", description: "Your PT session request was sent" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err?.message || "PT booking failed", variant: "destructive" });
    },
  });

  const update = (id: string, patch: Partial<{ datetime: string; sessions: number; notes?: string }>) => {
    setForm((prev) => ({
      ...prev,
      [id]: {
        datetime: prev[id]?.datetime || new Date().toISOString().slice(0, 16),
        sessions: prev[id]?.sessions ?? 1,
        notes: prev[id]?.notes,
        ...patch,
      },
    }));
  };

  // Carousel state
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    skipSnaps: false,
    inViewThreshold: 0.7,
    dragFree: false,
    loop: false,
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary/15 via-neon-purple/10 to-background border-b border-border sticky top-0 z-10 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Book PT Session</h1>
            <Link href="/my-bookings" className="text-sm text-primary font-semibold">My Bookings</Link>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Choose a trainer and schedule your session</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !trainers || trainers.length === 0 ? (
          <Card className="p-8 text-center border-border bg-card shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <User className="h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">No trainers available</p>
              <p className="text-sm text-muted-foreground">Please check again later</p>
            </div>
          </Card>
        ) : (
          <div className="relative">
            {/* Prev/Next controls */}
            <button
              aria-label="Previous"
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur rounded-full p-2 border border-border shadow hover:bg-card"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next"
              onClick={scrollNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur rounded-full p-2 border border-border shadow hover:bg-card"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Embla viewport */}
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex touch-pan-y">
                {trainers.map((t) => {
                  const f = form[t.id] || { datetime: new Date().toISOString().slice(0, 16), sessions: 1 };
                  const price = parseFloat(t.pricePerSession || '0');
                  const total = (f.sessions || 1) * price;
                  return (
                    <div key={t.id} className="flex-[0_0_100%] px-6">
                      <Card className="p-4 border-border bg-card shadow-sm max-w-sm mx-auto">
                        <div className="space-y-3">
                          <div className="rounded-xl overflow-hidden border border-border">
                            <AspectRatio ratio={3/4}>
                              {t.imageUrl ? (
                                <img src={t.imageUrl} alt={t.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground">PT</div>
                              )}
                            </AspectRatio>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-base leading-tight text-foreground">{t.name}</h3>
                              <p className="text-[11px] text-muted-foreground">{t.specialization || "Personal Trainer"}{t.experience ? ` • ${t.experience} yrs` : ''}</p>
                            </div>
                            <div className="text-sm font-semibold text-primary whitespace-nowrap">Rp{price.toLocaleString('id-ID')}/sesi</div>
                          </div>
                          {t.bio && <p className="text-xs text-muted-foreground line-clamp-2">{t.bio}</p>}
                          {t.certification && <p className="text-[11px] text-muted-foreground">Sertifikasi: {t.certification}</p>}

                          {/* Compact booking controls */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <label className="col-span-2 flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <input
                                type="datetime-local"
                                value={f.datetime}
                                onChange={(e) => update(t.id, { datetime: e.target.value })}
                                className="h-9 w-full rounded-lg bg-card border border-border px-3 text-xs"
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Sessions</span>
                              <select
                                value={f.sessions}
                                onChange={(e) => update(t.id, { sessions: Number(e.target.value) })}
                                className="h-9 w-full rounded-lg bg-card border border-border px-3 text-xs"
                              >
                                <option value={1}>1</option>
                                <option value={4}>4</option>
                                <option value={8}>8</option>
                              </select>
                            </label>
                            <div className="text-right text-xs font-semibold self-center">Total: Rp{total.toLocaleString('id-ID')}</div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <Button
                              variant="outline"
                              className="h-9 px-3 text-xs"
                              onClick={() => window.location.href = `/my-pt-sessions`}
                            >
                              Lihat Sesi Saya
                            </Button>
                            <Button
                              className="h-9 px-4 text-xs"
                              disabled={bookPT.isPending}
                              onClick={() =>
                                bookPT.mutate({
                                  trainerId: t.id,
                                  bookingDate: new Date(f.datetime).toISOString(),
                                  sessionCount: f.sessions,
                                  notes: f.notes,
                                })
                              }
                            >
                              Request Session
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dots */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {scrollSnaps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => emblaApi && emblaApi.scrollTo(idx)}
                  className={`h-2.5 rounded-full transition-all ${selectedIndex === idx ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />)
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
