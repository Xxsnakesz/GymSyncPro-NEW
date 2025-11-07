import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminLayout from "@/components/ui/admin-layout";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dumbbell, CheckCircle, Clock, Search, AlertCircle, User } from "lucide-react";
import { format } from "date-fns";

export default function AdminPTSessions() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("packages");

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "Admin access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: packages, isLoading: packagesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/pt-session-packages"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: allSessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/pt-session-attendance"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const confirmSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest("PUT", `/api/admin/pt-session-attendance/${sessionId}/confirm`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pt-session-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pt-session-packages"] });
      toast({
        title: "Berhasil",
        description: "Sesi PT berhasil dikonfirmasi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengkonfirmasi sesi",
        variant: "destructive",
      });
    }
  });

  if (isLoading || packagesLoading || sessionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredPackages = packages?.filter((pkg) => {
    const matchesSearch = !searchTerm || 
      pkg.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.trainer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const filteredSessions = allSessions?.filter((session) => {
    const matchesSearch = !searchTerm || 
      session.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.trainer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const pendingSessions = filteredSessions.filter(s => !s.adminConfirmed && s.status === 'completed');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Sesi PT</h1>
          <p className="text-muted-foreground mt-2">
            Kelola paket sesi dan konfirmasi kehadiran member
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari member atau trainer..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="packages" data-testid="tab-packages">
              <Dumbbell className="h-4 w-4 mr-2" />
              Paket Sesi ({filteredPackages.length})
            </TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">
              <Clock className="h-4 w-4 mr-2" />
              Konfirmasi ({pendingSessions.length})
            </TabsTrigger>
          </TabsList>

          {/* Packages Tab */}
          <TabsContent value="packages" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Paket Sesi PT Member</CardTitle>
                <CardDescription>
                  Lihat semua paket sesi PT yang dimiliki member
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPackages.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Trainer</TableHead>
                          <TableHead className="text-center">Total Sesi</TableHead>
                          <TableHead className="text-center">Terpakai</TableHead>
                          <TableHead className="text-center">Sisa</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal Beli</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPackages.map((pkg) => (
                          <TableRow key={pkg.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{pkg.user?.firstName} {pkg.user?.lastName}</p>
                                <p className="text-sm text-muted-foreground">{pkg.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{pkg.trainer?.name}</p>
                                <p className="text-sm text-muted-foreground">{pkg.trainer?.specialization}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{pkg.totalSessions}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{pkg.usedSessions || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={pkg.remainingSessions > 0 ? "default" : "destructive"}>
                                {pkg.remainingSessions}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'}>
                                {pkg.status === 'active' ? 'Aktif' : pkg.status === 'completed' ? 'Selesai' : pkg.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {pkg.purchaseDate ? format(new Date(pkg.purchaseDate), "dd MMM yyyy") : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada paket sesi PT</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Konfirmasi Kehadiran</CardTitle>
                <CardDescription>
                  Konfirmasi kehadiran member pada sesi PT
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredSessions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Trainer</TableHead>
                          <TableHead>Sesi</TableHead>
                          <TableHead>Tanggal Sesi</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{session.user?.firstName} {session.user?.lastName}</p>
                                <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{session.trainer?.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">#{session.sessionNumber}</Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(session.sessionDate), "dd MMM yyyy, HH:mm")}
                            </TableCell>
                            <TableCell>
                              {session.checkInTime ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">
                                    {format(new Date(session.checkInTime), "HH:mm")}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Belum check-in</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={
                                  session.status === 'completed' ? 'default' :
                                  session.status === 'scheduled' ? 'secondary' :
                                  'destructive'
                                }>
                                  {session.status === 'completed' ? 'Selesai' : 
                                   session.status === 'scheduled' ? 'Dijadwalkan' : 
                                   session.status}
                                </Badge>
                                {session.adminConfirmed && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Terkonfirmasi
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {!session.adminConfirmed && session.status === 'completed' ? (
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => confirmSessionMutation.mutate(session.id)}
                                  disabled={confirmSessionMutation.isPending}
                                  data-testid={`button-confirm-${session.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Konfirmasi
                                </Button>
                              ) : session.adminConfirmed ? (
                                <Badge variant="default">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Dikonfirmasi
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Menunggu Check-in</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada sesi yang perlu dikonfirmasi</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
