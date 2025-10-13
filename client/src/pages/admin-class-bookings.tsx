import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminLayout from "@/components/ui/admin-layout";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, User, Search, CheckCircle, XCircle, Users, Ban } from "lucide-react";
import { format } from "date-fns";

interface ClassBooking {
  id: string;
  userId: string;
  classId: string;
  bookingDate: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  gymClass: {
    id: string;
    name: string;
    description?: string;
    instructor: string;
    schedule: string;
    capacity: number;
    currentEnrollment: number;
  };
}

export default function AdminClassBookings() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  const { data: bookings, isLoading: bookingsLoading } = useQuery<ClassBooking[]>({
    queryKey: ["/api/admin/class-bookings"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/admin/class-bookings/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/class-bookings"] });
      toast({
        title: "Success",
        description: "Class booking status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update class booking status",
        variant: "destructive",
      });
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/class-bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/class-bookings"] });
      toast({
        title: "Success",
        description: "Class booking cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel class booking",
        variant: "destructive",
      });
    }
  });

  if (isLoading || bookingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredBookings = bookings?.filter((booking) => {
    const matchesSearch = !searchTerm || 
      booking.user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.gymClass.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = statusFilter === "all" || booking.status === statusFilter;

    return matchesSearch && matchesFilter;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "booked": return <CheckCircle className="w-4 h-4" />;
      case "attended": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "booked": return "default";
      case "attended": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: bookingId, status: newStatus });
  };

  const handleCancelBooking = (bookingId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan booking ini?")) {
      return;
    }
    cancelBookingMutation.mutate(bookingId);
  };

  const stats = {
    total: bookings?.length || 0,
    booked: bookings?.filter(b => b.status === 'booked').length || 0,
    attended: bookings?.filter(b => b.status === 'attended').length || 0,
    cancelled: bookings?.filter(b => b.status === 'cancelled').length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Class Bookings Management</h1>
            <p className="text-muted-foreground">Kelola semua booking kelas gym</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-total-bookings">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-count">{stats.total}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-booked">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Booked</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-booked-count">{stats.booked}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-attended">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attended</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-attended-count">{stats.attended}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-cancelled">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-cancelled-count">{stats.cancelled}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>All Class Bookings</CardTitle>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari member atau kelas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    data-testid="input-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="attended">Attended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Tanggal Booking</TableHead>
                    <TableHead>Kapasitas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tidak ada booking ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking) => (
                      <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium" data-testid={`text-member-name-${booking.id}`}>
                                {booking.user.firstName} {booking.user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{booking.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium" data-testid={`text-class-name-${booking.id}`}>{booking.gymClass.name}</div>
                            <div className="text-sm text-muted-foreground">{booking.gymClass.schedule}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium" data-testid={`text-instructor-${booking.id}`}>
                            {booking.gymClass.instructor}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-booking-date-${booking.id}`}>
                              {format(new Date(booking.bookingDate), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-capacity-${booking.id}`}>
                              {booking.gymClass.currentEnrollment}/{booking.gymClass.capacity}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(booking.status)} className="flex items-center gap-1 w-fit" data-testid={`badge-status-${booking.id}`}>
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Select
                              value={booking.status}
                              onValueChange={(value) => handleStatusChange(booking.id, value)}
                              disabled={updateStatusMutation.isPending || booking.status === 'cancelled'}
                            >
                              <SelectTrigger className="w-[130px]" data-testid={`select-status-${booking.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="booked">Booked</SelectItem>
                                <SelectItem value="attended">Attended</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            {booking.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={cancelBookingMutation.isPending}
                                data-testid={`button-cancel-${booking.id}`}
                              >
                                <Ban className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
