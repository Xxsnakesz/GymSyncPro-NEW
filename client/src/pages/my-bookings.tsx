import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/ui/bottom-navigation";
import BrandTopbar from "@/components/brand-topbar";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, Dumbbell, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ClassBookingWithClass {
  id: string;
  userId: string;
  classId: string;
  bookingDate: string;
  status: string;
  createdAt: string;
  gymClass: {
    id: string;
    name: string;
    description?: string;
    instructorName: string;
    schedule: string;
    maxCapacity: number;
    currentEnrollment: number;
  };
}

interface PtBookingWithTrainer {
  id: string;
  userId: string;
  trainerId: string;
  bookingDate: string;
  duration: number;
  sessionCount: number;
  status: string;
  notes?: string;
  createdAt: string;
  trainer: {
    id: string;
    name: string;
    specialization: string;
    bio?: string;
    experience?: number;
    certification?: string;
    imageUrl?: string;
    pricePerSession: string;
  };
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    booked: { label: "Booked", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  };
  const v = map[status] || { label: status, className: "bg-muted text-foreground" };
  return <span className={`text-[10px] px-2 py-0.5 rounded ${v.className}`}>{v.label}</span>;
}

export default function MyBookings() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [openClassDetail, setOpenClassDetail] = useState(false);
  const [openPTDetail, setOpenPTDetail] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null);
  const [ptSessionsByTrainer, setPtSessionsByTrainer] = useState<Record<string, number>>({});
  const [ptDatetimeByTrainer, setPtDatetimeByTrainer] = useState<Record<string, string>>({});
  const [ptNotesByTrainer, setPtNotesByTrainer] = useState<Record<string, string>>({});

  // Existing bookings
  const { data: classBookings, isLoading: loadingClasses } = useQuery<ClassBookingWithClass[]>({
    queryKey: ["/api/class-bookings"],
    enabled: isAuthenticated,
  });

  const { data: ptBookings, isLoading: loadingPT } = useQuery<PtBookingWithTrainer[]>({
    queryKey: ["/api/pt-bookings"],
    enabled: isAuthenticated,
  });

  // Explore data
  const { data: classes } = useQuery<any[]>({
    queryKey: ["/api/classes"],
    enabled: isAuthenticated,
  });
  const { data: trainers } = useQuery<any[]>({
    queryKey: ["/api/trainers"],
    enabled: isAuthenticated,
  });
  const { data: notifications } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
  });
  const notificationCount = notifications?.filter(n => !n.isRead).length || 0;

  // Cancel mutations
  const cancelClassMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiRequest("PUT", `/api/class-bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Success", description: "Class booking cancelled" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel booking", variant: "destructive" });
    },
  });

  const cancelPTMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiRequest("PUT", `/api/pt-bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-bookings"] });
      toast({ title: "Success", description: "PT session cancelled" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel PT session", variant: "destructive" });
    },
  });

  // Booking mutations
  const bookClassMutation = useMutation({
    mutationFn: async (vars: { classId: string; bookingDate: string }) => {
      await apiRequest("POST", `/api/classes/${vars.classId}/book`, { bookingDate: vars.bookingDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setOpenClassDetail(false);
      toast({ title: "Booked!", description: "Your class has been booked" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to book class", variant: "destructive" });
    },
  });

  const bookPTMutation = useMutation({
    mutationFn: async (vars: { trainerId: string; bookingDate: string; sessionCount: number; notes?: string }) => {
      await apiRequest("POST", "/api/pt-bookings", vars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-bookings"] });
      setOpenPTDetail(false);
      toast({ title: "Requested!", description: "Your PT session request was sent" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to request PT session", variant: "destructive" });
    },
  });

  const handleCancelClass = (bookingId: string) => {
    if (confirm("Cancel this class booking?")) {
      cancelClassMutation.mutate(bookingId);
    }
  };
  const handleCancelPT = (bookingId: string) => {
    if (confirm("Cancel this PT session?")) {
      cancelPTMutation.mutate(bookingId);
    }
  };

  if (loadingClasses || loadingPT) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading bookings...</p>
        </div>
      </div>
    );
  }

  const activeClasses = classBookings?.filter(b => b.status === 'booked' || b.status === 'confirmed') || [];
  const activePT = ptBookings?.filter(b => b.status === 'booked' || b.status === 'confirmed') || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary/15 via-neon-purple/10 to-background border-b border-border sticky top-0 z-10 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <BrandTopbar className="mb-3" />
          <h1 className="text-2xl font-bold text-foreground mb-1">Bookings</h1>
          <p className="text-sm text-muted-foreground font-medium">Pilih PT atau Class untuk melakukan booking</p>
          {user?.active === false && (
            <div className="mt-3 p-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200">
              <p className="text-xs">Akun Anda sedang <span className="font-semibold">Cuti</span>. Booking PT dan Class dinonaktifkan sementara.</p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Explore & Book - PT */}
        <section>
          <h2 className="text-lg font-bold mb-3">Personal Trainers</h2>
          {(!trainers || trainers.length === 0) ? (
            <Card className="p-6 text-sm text-muted-foreground">Belum ada trainer tersedia.</Card>
          ) : (
            <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
              <div className="flex gap-3">
                {trainers.map((t: any) => {
                  const price = parseFloat(t.pricePerSession || '0');
                  return (
                    <div key={t.id} className="w-[68%] max-w-[260px] shrink-0">
                      <Card className="overflow-hidden border-border">
                        <button
                          type="button"
                          className="block w-full text-left"
                          onClick={() => {
                            if (user?.active === false) {
                              toast({ title: "Akun sedang Cuti", description: "Booking PT dinonaktifkan sementara.", variant: "destructive" });
                              return;
                            }
                            setSelectedTrainer(t); setOpenPTDetail(true);
                          }}
                          disabled={user?.active === false}
                        >
                          <AspectRatio ratio={3/4}>
                            {t.imageUrl ? (
                              <img src={t.imageUrl} alt={t.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-muted flex items-center justify-center text-muted-foreground">PT</div>
                            )}
                          </AspectRatio>
                        </button>
                        <div className="p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold leading-tight line-clamp-1 text-sm">{t.name}</div>
                              <div className="text-[11px] text-muted-foreground line-clamp-1">{t.specialization || 'Personal Trainer'}{t.experience ? ` • ${t.experience} yrs` : ''}</div>
                            </div>
                            <div className="text-xs font-semibold text-primary whitespace-nowrap">Rp{price.toLocaleString('id-ID')}/sesi</div>
                          </div>
                          {t.bio && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{t.bio}</p>}
                          <div className="mt-2 flex justify-end">
                            <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => { if (user?.active === false) { toast({ title: "Akun sedang Cuti", description: "Booking PT dinonaktifkan sementara.", variant: "destructive" }); return; } setSelectedTrainer(t); setOpenPTDetail(true); }} disabled={user?.active === false}>
                              Detail
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Explore & Book - Classes */}
        <section>
          <h2 className="text-lg font-bold mb-3">Classes</h2>
          {(!classes || classes.length === 0) ? (
            <Card className="p-6 text-sm text-muted-foreground">Belum ada class tersedia.</Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {classes.map((c: any) => {
                const remaining = Math.max(0, (c.maxCapacity || 0) - (c.currentEnrollment || 0));
                return (
                  <button key={c.id} className="text-left" onClick={() => { if (user?.active === false) { toast({ title: "Akun sedang Cuti", description: "Booking class dinonaktifkan sementara.", variant: "destructive" }); return; } setSelectedClass(c); setOpenClassDetail(true); }} disabled={user?.active === false}>
                    <Card className="overflow-hidden border-border">
                      {c.imageUrl && (
                        <AspectRatio ratio={3/4}>
                          <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                        </AspectRatio>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold leading-tight line-clamp-1">{c.name}</div>
                          <Badge variant="secondary" className="text-[10px]">{remaining} slots</Badge>
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /><span>{c.instructorName}</span></div>
                          <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /><span>{c.schedule}</span></div>
                        </div>
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Active bookings summary */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Aktif Booking</h2>
          {activeClasses.length === 0 && activePT.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">Belum ada booking aktif.</Card>
          ) : (
            <div className="space-y-3">
              {activeClasses.map((booking) => (
                <Card key={booking.id} className="p-4 border-border bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">{booking.gymClass.name}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{booking.gymClass.instructorName}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(booking.bookingDate), "MMM dd, yyyy")}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{booking.gymClass.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(booking.status)}
                        {(booking.status === 'booked' || booking.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancelClass(booking.id)}
                            disabled={cancelClassMutation.isPending}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {activePT.map((booking) => (
                <Card key={booking.id} className="p-4 border-border bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">{booking.trainer.name}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" />{booking.trainer.specialization}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(booking.bookingDate), "MMM dd, yyyy")}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Rp{parseFloat(booking.trainer.pricePerSession).toLocaleString('id-ID')} / sesi</span>
                        <span className="flex items-center gap-1">{booking.sessionCount} sesi</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(booking.status)}
                        {(booking.status === 'booked' || booking.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancelPT(booking.id)}
                            disabled={cancelPTMutation.isPending}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Detail Sheet: PT */}
      <Sheet open={openPTDetail} onOpenChange={setOpenPTDetail}>
        <SheetContent side="bottom" className="rounded-t-[16px] border-t bg-background p-0 h-[80vh] sm:h-[75vh] overflow-hidden">
          {selectedTrainer && (
            <div className="relative h-full flex flex-col">
              {/* Drag handle */}
              <div className="absolute left-1/2 top-2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-muted" />
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-6 pb-[136px]">
                <div className="space-y-4 max-w-sm mx-auto">
                  {/* Compact header with small image/avatar to avoid oversized visuals */}
                  <div className="mt-1 rounded-xl border border-border bg-card/50 p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16 rounded-lg">
                        {selectedTrainer.imageUrl ? (
                          <AvatarImage src={selectedTrainer.imageUrl} alt={selectedTrainer.name} className="object-cover" />
                        ) : (
                          <AvatarFallback>PT</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base leading-tight">{selectedTrainer.name}</h3>
                            <p className="text-xs text-muted-foreground">{selectedTrainer.specialization}{selectedTrainer.experience ? ` • ${selectedTrainer.experience} yrs` : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-muted-foreground">Harga / sesi</p>
                            <p className="text-sm font-semibold text-primary">Rp{parseFloat(selectedTrainer.pricePerSession || '0').toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        {selectedTrainer.bio && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{selectedTrainer.bio}</p>
                        )}
                        {selectedTrainer.certification && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
                            <span>Sertifikasi:</span>
                            <span className="font-medium text-foreground">{selectedTrainer.certification}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {(() => {
                    const defaultDateTime = new Date().toISOString().slice(0, 16);
                    const sessions = ptSessionsByTrainer[selectedTrainer.id] ?? 1;
                    const dt = ptDatetimeByTrainer[selectedTrainer.id] ?? defaultDateTime;
                    const notes = ptNotesByTrainer[selectedTrainer.id] ?? "";
                    return (
                      <div className="space-y-3">
                        <div className="grid gap-1">
                          <label className="text-xs text-muted-foreground">Pilih tanggal & waktu</label>
                          <input
                            type="datetime-local"
                            value={dt}
                            onChange={(e) => setPtDatetimeByTrainer((prev) => ({ ...prev, [selectedTrainer.id]: e.target.value }))}
                            className="h-10 rounded-lg bg-card border border-border px-3 text-sm"
                          />
                        </div>
                        <div className="grid gap-1">
                          <span className="text-xs text-muted-foreground">Jumlah sesi</span>
                          <div className="flex items-center gap-2">
                            {[1,4,8].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setPtSessionsByTrainer((prev) => ({ ...prev, [selectedTrainer.id]: n }))}
                                className={`px-3 py-2 rounded-lg text-xs border transition ${sessions === n ? 'bg-primary text-white border-primary' : 'bg-card border-border text-foreground hover:bg-muted'}`}
                              >
                                {n} sesi
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <label className="text-xs text-muted-foreground">Catatan (opsional)</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setPtNotesByTrainer((prev) => ({ ...prev, [selectedTrainer.id]: e.target.value }))}
                            placeholder="Tujuan latihan, preferensi waktu, dll."
                            className="min-h-20 rounded-lg bg-card border border-border px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sticky footer */}
              {(() => {
                const defaultDateTime = new Date().toISOString().slice(0, 16);
                const sessions = ptSessionsByTrainer[selectedTrainer.id] ?? 1;
                const price = parseFloat(selectedTrainer.pricePerSession || '0');
                const total = sessions * price;
                const dt = ptDatetimeByTrainer[selectedTrainer.id] ?? defaultDateTime;
                const notes = ptNotesByTrainer[selectedTrainer.id] ?? "";
                return (
                  <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4" style={{paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)'}}>
                    <div className="max-w-sm mx-auto flex items-center justify-between gap-3">
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-lg font-semibold text-primary">Rp{total.toLocaleString('id-ID')}</div>
                      </div>
                      <Button
                        className="h-10 px-5"
                        disabled={bookPTMutation.isPending || user?.active === false}
                        onClick={() => {
                          const chosen = dt || defaultDateTime;
                          if (user?.active === false) {
                            toast({ title: "Akun sedang Cuti", description: "Booking PT dinonaktifkan sementara.", variant: "destructive" });
                            return;
                          }
                          bookPTMutation.mutate({
                            trainerId: selectedTrainer.id,
                            bookingDate: new Date(chosen).toISOString(),
                            sessionCount: sessions,
                            notes: notes || undefined,
                          });
                        }}
                      >
                        {user?.active === false ? "Sedang Cuti" : "Request Session"}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Detail Sheet: Class */}
      <Sheet open={openClassDetail} onOpenChange={setOpenClassDetail}>
        <SheetContent side="bottom" className="rounded-t-[12px] border-t bg-background">
          {selectedClass && (
            <div className="space-y-4">
              {selectedClass.imageUrl && (
                <AspectRatio ratio={3/4}>
                  <img src={selectedClass.imageUrl} alt={selectedClass.name} className="h-full w-full rounded-md object-cover border border-border" />
                </AspectRatio>
              )}
              <div>
                <h3 className="font-semibold text-lg">{selectedClass.name}</h3>
                {selectedClass.description && <p className="text-sm text-muted-foreground mt-1">{selectedClass.description}</p>}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /><span>{selectedClass.instructorName}</span></div>
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /><span>{selectedClass.schedule}</span></div>
                </div>
              </div>
              {(() => {
                const full = selectedClass.currentEnrollment >= selectedClass.maxCapacity;
                const defaultDate = new Date().toISOString().slice(0, 10);
                return (
                  <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const d = new Date();
                        d.setDate(d.getDate() + idx);
                        const dateStr = d.toISOString().slice(0, 10);
                        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
                        const day = d.getDate();
                        return (
                          <button
                            key={`${selectedClass.id}-${dateStr}`}
                            onClick={() => {
                              const el = document.getElementById(`date-${selectedClass.id}`) as HTMLInputElement | null;
                              if (el) el.value = dateStr;
                            }}
                            className="px-2.5 py-1 rounded-md border border-border text-xs hover:bg-muted/70"
                            type="button"
                          >
                            <span className="font-semibold mr-1">{label}</span>
                            <span className="text-muted-foreground">{day}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="date" defaultValue={defaultDate} id={`date-${selectedClass.id}`} className="h-9 rounded-md bg-card border border-border px-2 text-sm" />
                      <Button
                        size="sm"
                        disabled={full || bookClassMutation.isPending || user?.active === false}
                        onClick={() => {
                          const el = document.getElementById(`date-${selectedClass.id}`) as HTMLInputElement | null;
                          const chosen = el?.value || defaultDate;
                          if (user?.active === false) {
                            toast({ title: "Akun sedang Cuti", description: "Booking class dinonaktifkan sementara.", variant: "destructive" });
                            return;
                          }
                          bookClassMutation.mutate({ classId: selectedClass.id, bookingDate: new Date(chosen).toISOString() });
                        }}
                      >
                        {user?.active === false ? "Sedang Cuti" : (full ? "Full" : "Book")}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation */}
      <BottomNavigation notificationCount={notificationCount} />
    </div>
  );
}
