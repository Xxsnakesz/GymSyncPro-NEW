import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/ui/bottom-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Dumbbell, ChevronRight } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Link } from "wouter";

interface GymClass {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  instructorName: string;
  schedule: string;
  maxCapacity: number;
  currentEnrollment: number;
}

export default function ClassesPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const { data: classes, isLoading } = useQuery<GymClass[]>({
    queryKey: ["/api/classes"],
    enabled: isAuthenticated,
  });

  const bookClass = useMutation({
    mutationFn: async (vars: { classId: string; bookingDate: string }) => {
      const res = await apiRequest("POST", `/api/classes/${vars.classId}/book`, {
        bookingDate: vars.bookingDate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/class-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({ title: "Booked!", description: "Your class has been booked" });
    },
    onError: async (err: any) => {
      toast({ title: "Failed", description: err?.message || "Booking failed", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary/15 via-neon-purple/10 to-background border-b border-border sticky top-0 z-10 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Classes</h1>
            <Link href="/my-bookings" className="text-sm text-primary font-semibold">My Bookings</Link>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Browse and book available classes</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <label className="text-sm text-muted-foreground">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 rounded-lg bg-card border border-border px-3 text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !classes || classes.length === 0 ? (
          <Card className="p-8 text-center border-border bg-card shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">No classes available</p>
              <p className="text-sm text-muted-foreground">Please check again later</p>
            </div>
          </Card>
        ) : (
          classes.map((c) => {
            const full = c.currentEnrollment >= c.maxCapacity;
            return (
              <Card key={c.id} className="p-0 border-border bg-card shadow-sm overflow-hidden">
                {c.imageUrl && (
                  <AspectRatio ratio={3/4}>
                    <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                  </AspectRatio>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Dumbbell className="h-4 w-4 text-neon-purple" />
                        <h3 className="font-bold text-foreground">{c.name}</h3>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground mb-3">{c.description}</p>}
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /><span>{c.instructorName}</span></div>
                        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /><span>{c.schedule}</span></div>
                        <div className="col-span-2 text-xs">Capacity: {c.currentEnrollment}/{c.maxCapacity}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground mt-2" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Booking for: {format(new Date(selectedDate), "MMM dd, yyyy")}</span>
                  <Button
                    disabled={full || bookClass.isPending}
                    onClick={() => bookClass.mutate({ classId: c.id, bookingDate: new Date(selectedDate).toISOString() })}
                  >
                    {full ? "Full" : "Book"}
                  </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
