import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/ui/navigation";
import BottomNavigation from "@/components/ui/bottom-navigation";
import {
  Dumbbell,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

export default function MyPtSessions() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  // Fetch PT session packages
  const { data: packages, isLoading: packagesLoading } = useQuery<any[]>({
    queryKey: ["/api/pt-session-packages"],
    enabled: isAuthenticated,
  });

  // Fetch PT session attendance
  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/pt-session-attendance"],
    enabled: isAuthenticated,
  });

  // Schedule session mutation
  const scheduleSessionMutation = useMutation({
    mutationFn: async (data: { packageId: string; sessionDate: string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/pt-session-attendance", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-session-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pt-session-packages"] });
      setShowScheduleModal(false);
      setSessionDate("");
      setSessionNotes("");
      setSelectedPackage(null);
      toast({
        title: "Berhasil",
        description: "Sesi PT berhasil dijadwalkan!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menjadwalkan sesi",
        variant: "destructive",
      });
    },
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("PUT", `/api/pt-session-attendance/${sessionId}/check-in`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pt-session-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pt-session-packages"] });
      toast({
        title: "Berhasil",
        description: "Check-in berhasil!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal check-in",
        variant: "destructive",
      });
    },
  });

  const handleScheduleSession = () => {
    if (!selectedPackage || !sessionDate) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field",
        variant: "destructive",
      });
      return;
    }

    scheduleSessionMutation.mutate({
      packageId: selectedPackage.id,
      sessionDate,
      notes: sessionNotes,
    });
  };

  const handleCheckIn = (sessionId: string) => {
    checkInMutation.mutate(sessionId);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      scheduled: { variant: "default", label: "Dijadwalkan" },
      completed: { variant: "default", label: "Selesai" },
      cancelled: { variant: "destructive", label: "Dibatalkan" },
      no_show: { variant: "destructive", label: "Tidak Hadir" },
    };
    const config = statusMap[status] || { variant: "default", label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  if (packagesLoading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} />
        <div className="pt-16 pb-20 px-4">
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation user={user} />
      <div className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sesi Personal Trainer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola paket dan jadwal sesi PT Anda
          </p>
        </div>

        {/* Active Packages */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-yellow-500" />
            Paket Aktif
          </h2>
          
          {packages && packages.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {packages.filter(pkg => pkg.status === 'active').map((pkg) => (
                <Card key={pkg.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{pkg.trainer.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {pkg.trainer.specialization}
                        </CardDescription>
                      </div>
                      <Badge variant={pkg.remainingSessions > 0 ? "default" : "secondary"}>
                        {pkg.status === 'active' ? 'Aktif' : 'Selesai'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-yellow-500">{pkg.totalSessions}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-green-500">{pkg.usedSessions || 0}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Terpakai</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-blue-500">{pkg.remainingSessions}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sisa</p>
                      </div>
                    </div>
                    
                    {pkg.remainingSessions > 0 && (
                      <Button 
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setShowScheduleModal(true);
                        }}
                        data-testid={`button-schedule-${pkg.id}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Jadwalkan Sesi
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
                <Dumbbell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada paket PT aktif</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming & Past Sessions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-yellow-500" />
            Jadwal Sesi
          </h2>

          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isUpcoming = new Date(session.sessionDate) > new Date();
                const canCheckIn = isUpcoming && session.status === 'scheduled';
                
                return (
                  <Card key={session.id} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            Sesi #{session.sessionNumber}
                          </Badge>
                          {getStatusBadge(session.status)}
                          {session.adminConfirmed && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Terkonfirmasi
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {session.trainer.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            {format(new Date(session.sessionDate), "dd MMM yyyy, HH:mm")}
                          </div>
                        </div>

                        {session.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {session.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        {canCheckIn && !session.adminConfirmed && (
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white flex-1 sm:flex-none"
                            onClick={() => handleCheckIn(session.id)}
                            disabled={checkInMutation.isPending}
                            data-testid={`button-checkin-${session.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Check-in</span>
                          </Button>
                        )}
                        
                        {session.adminConfirmed && (
                          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Dikonfirmasi Admin</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada jadwal sesi</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Schedule Session Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Jadwalkan Sesi PT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedPackage && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedPackage.trainer.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sisa sesi: {selectedPackage.remainingSessions}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="session-date">Tanggal & Waktu</Label>
              <Input
                id="session-date"
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                data-testid="input-session-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-notes">Catatan (Opsional)</Label>
              <Textarea
                id="session-notes"
                placeholder="Tambahkan catatan untuk sesi ini..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
                data-testid="input-session-notes"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowScheduleModal(false);
                  setSessionDate("");
                  setSessionNotes("");
                  setSelectedPackage(null);
                }}
                data-testid="button-cancel-schedule"
              >
                Batal
              </Button>
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={handleScheduleSession}
                disabled={scheduleSessionMutation.isPending || !sessionDate}
                data-testid="button-confirm-schedule"
              >
                {scheduleSessionMutation.isPending ? "Menjadwalkan..." : "Jadwalkan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
