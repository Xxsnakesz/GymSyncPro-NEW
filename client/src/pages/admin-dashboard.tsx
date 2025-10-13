import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/ui/navigation";
import AdminCheckInModal from "@/components/admin-checkin-modal";
import AdminPTDialog from "@/components/admin-pt-dialog";
import AdminClassDialog from "@/components/admin-class-dialog";
import AdminMemberDialog from "@/components/admin-member-dialog";
import AdminEditMemberDialog from "@/components/admin-edit-member-dialog";
import AdminMembershipPlanDialog from "@/components/admin-membership-plan-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { PersonalTrainer, GymClass, MembershipPlan } from "@shared/schema";
import {
  Users,
  CalendarCheck,
  TriangleAlert,
  DollarSign,
  ShieldQuestion,
  Edit,
  Trash2,
  UserPlus,
  TrendingUp,
  QrCode,
  Clock,
  LogIn,
  MessageSquare,
  Star,
  Dumbbell,
  UserX,
  UserCheck,
} from "lucide-react";

interface AdminDashboardStats {
  totalMembers?: number;
  activeToday?: number;
  expiringSoon?: number;
  revenue?: {
    thisMonth?: number;
    lastMonth?: number;
    total?: number;
  };
}

interface AdminDashboardResponse {
  stats?: AdminDashboardStats;
  users?: MemberWithMembership[];
}

interface MemberWithMembership {
  id: string;
  email?: string;
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  active?: boolean;
  membership?: {
    status?: string;
    endDate?: string;
    plan?: {
      name?: string;
    };
  };
}

interface CheckInRecord {
  id: string;
  checkInTime: string;
  status?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  membership?: {
    plan?: {
      name?: string;
    };
  };
}

interface FeedbackRecord {
  id: string;
  subject?: string;
  message: string;
  rating?: number;
  category?: string;
  createdAt: string;
  member?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImageUrl?: string;
  };
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [memberFilter, setMemberFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showPTDialog, setShowPTDialog] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<PersonalTrainer | null>(null);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithMembership | null>(null);
  const [showMembershipPlanDialog, setShowMembershipPlanDialog] = useState(false);
  const [selectedMembershipPlan, setSelectedMembershipPlan] = useState<MembershipPlan | null>(null);

  // Redirect if not authenticated or not admin
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

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<AdminDashboardResponse>({
    queryKey: ["/api/admin/dashboard"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: members } = useQuery<MemberWithMembership[]>({
    queryKey: ["/api/admin/members"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: recentCheckIns } = useQuery<CheckInRecord[]>({
    queryKey: ["/api/admin/checkins"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
    refetchInterval: 10000,
  });

  const { data: feedbacks } = useQuery<FeedbackRecord[]>({
    queryKey: ["/api/admin/feedbacks"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: trainers } = useQuery<PersonalTrainer[]>({
    queryKey: ["/api/admin/trainers"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: gymClasses } = useQuery<GymClass[]>({
    queryKey: ["/api/admin/classes"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: classBookings } = useQuery<any[]>({
    queryKey: ["/api/admin/class-bookings"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: ptBookings } = useQuery<any[]>({
    queryKey: ["/api/admin/pt-bookings"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: membershipPlans } = useQuery<MembershipPlan[]>({
    queryKey: ["/api/admin/membership-plans"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  if (isLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const stats = dashboardData?.stats || {};
  const users = dashboardData?.users || [];

  const isExpiringSoon = (endDate: string) => {
    const now = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 20 && diffDays > 0;
  };

  const getMembershipStatus = (member: MemberWithMembership) => {
    if (!member.membership) return "No Membership";
    if (member.membership.status === "expired") return "Expired";
    if (member.membership.endDate && isExpiringSoon(member.membership.endDate)) return "Expiring Soon";
    if (member.membership.status === "active") return "Active";
    return member.membership.status || "Unknown";
  };

  const filteredMembers = members?.filter((member) => {
    const matchesSearch = !searchTerm || 
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = memberFilter === "all" ||
      (memberFilter === "active" && member.membership?.status === "active") ||
      (memberFilter === "expiring" && member.membership && isExpiringSoon(member.membership.endDate || "")) ||
      (memberFilter === "expired" && member.membership?.status === "expired");

    return matchesSearch && matchesFilter;
  }) || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Active": return "default";
      case "Expiring Soon": return "secondary";
      case "Expired": return "destructive";
      default: return "outline";
    }
  };

  const handleAddTrainer = () => {
    setSelectedTrainer(null);
    setShowPTDialog(true);
  };

  const handleEditTrainer = (trainer: PersonalTrainer) => {
    setSelectedTrainer(trainer);
    setShowPTDialog(true);
  };

  const handleDeleteTrainer = async (trainerId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus personal trainer ini?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/trainers/${trainerId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trainers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers"] });
      toast({
        title: "Berhasil!",
        description: "Personal trainer berhasil dihapus",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus personal trainer",
        variant: "destructive",
      });
    }
  };

  const handleAddClass = () => {
    setSelectedClass(null);
    setShowClassDialog(true);
  };

  const handleEditClass = (gymClass: GymClass) => {
    setSelectedClass(gymClass);
    setShowClassDialog(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus class ini?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/classes/${classId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Berhasil!",
        description: "Gym class berhasil dihapus",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus gym class",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = () => {
    setShowMemberDialog(true);
  };

  const handleEditMember = (member: MemberWithMembership) => {
    setSelectedMember(member);
    setShowEditMemberDialog(true);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus member ini? Data member akan dihapus permanen.")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/members/${memberId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Berhasil!",
        description: "Member berhasil dihapus",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus member",
        variant: "destructive",
      });
    }
  };

  const handleSuspendMember = async (memberId: string) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan member ini sementara?")) {
      return;
    }

    try {
      await apiRequest("PUT", `/api/admin/members/${memberId}/suspend`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Berhasil!",
        description: "Member berhasil dinonaktifkan",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menonaktifkan member",
        variant: "destructive",
      });
    }
  };

  const handleActivateMember = async (memberId: string) => {
    try {
      await apiRequest("PUT", `/api/admin/members/${memberId}/activate`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Berhasil!",
        description: "Member berhasil diaktifkan kembali",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengaktifkan member",
        variant: "destructive",
      });
    }
  };

  const handleAddMembershipPlan = () => {
    setSelectedMembershipPlan(null);
    setShowMembershipPlanDialog(true);
  };

  const handleEditMembershipPlan = (plan: MembershipPlan) => {
    setSelectedMembershipPlan(plan);
    setShowMembershipPlanDialog(true);
  };

  const handleDeleteMembershipPlan = async (planId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus paket membership ini?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/membership-plans/${planId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/membership-plans"] });
      toast({
        title: "Berhasil!",
        description: "Paket membership berhasil dihapus",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus paket membership",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation 
        user={user} 
        isAdmin={true}
        notificationCount={stats.expiringSoon || 0}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Admin Dashboard</h2>
            <p className="text-muted-foreground mt-1">Manage gym operations and member accounts</p>
          </div>
          <Button 
            onClick={() => setShowCheckInModal(true)}
            className="gym-gradient text-white"
            data-testid="button-validate-checkin"
          >
            <QrCode className="mr-2" size={16} />
            Validasi Check-in
          </Button>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-members">
                    {stats.totalMembers || 0}
                  </p>
                  <p className="text-xs text-green-600">+12 this month</p>
                </div>
                <div className="gym-gradient w-12 h-12 rounded-lg flex items-center justify-center">
                  <Users className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Today</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-active-today">
                    {stats.activeToday || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Current check-ins</p>
                </div>
                <div className="success-gradient w-12 h-12 rounded-lg flex items-center justify-center">
                  <CalendarCheck className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-expiring-soon">
                    {stats.expiringSoon || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{"< 20 days"}</p>
                </div>
                <div className="bg-gradient-to-r from-red-500 to-red-600 w-12 h-12 rounded-lg flex items-center justify-center">
                  <TriangleAlert className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-revenue">
                    ${stats.revenue?.thisMonth || 0}
                  </p>
                  <p className="text-xs text-green-600">+8% vs last month</p>
                </div>
                <div className="warning-gradient w-12 h-12 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-white" size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Member Management */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Member Management</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage gym member accounts</p>
                  </div>
                  <Button 
                    className="gym-gradient text-white" 
                    onClick={handleAddMember}
                    data-testid="button-add-member"
                  >
                    <UserPlus className="mr-2" size={16} />
                    Add New Member
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {/* Search and Filter */}
                <div className="flex space-x-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-members"
                    />
                  </div>
                  <Select value={memberFilter} onValueChange={setMemberFilter}>
                    <SelectTrigger className="w-48" data-testid="select-filter-members">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expiring">Expiring Soon</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Members Table */}
                {filteredMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No members found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Membership
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Expires
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredMembers.map((member: any) => (
                          <tr key={member.id} data-testid={`row-member-${member.id}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={member.profileImageUrl} />
                                  <AvatarFallback>
                                    {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}` || 'M'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-4">
                                  <p className="text-sm font-medium text-foreground">
                                    {`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'No Name'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-username-${member.id}`}>
                              {member.username || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-phone-${member.id}`}>
                              {member.phone || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                              {member.membership?.plan?.name || 'None'}
                            </td>
                            <td className="px-6 py-4 text-sm text-foreground">
                              {member.membership?.endDate 
                                ? new Date(member.membership.endDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={getStatusVariant(getMembershipStatus(member))}>
                                {getMembershipStatus(member)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditMember(member)}
                                  data-testid={`button-edit-${member.id}`}
                                >
                                  <Edit size={16} />
                                </Button>
                                {member.active !== false ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSuspendMember(member.id)}
                                    data-testid={`button-suspend-${member.id}`}
                                    title="Nonaktifkan sementara"
                                  >
                                    <UserX size={16} className="text-orange-500" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActivateMember(member.id)}
                                    data-testid={`button-activate-${member.id}`}
                                    title="Aktifkan kembali"
                                  >
                                    <UserCheck size={16} className="text-green-500" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteMember(member.id)}
                                  data-testid={`button-delete-${member.id}`}
                                >
                                  <Trash2 size={16} className="text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Financial Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <p className="text-sm text-muted-foreground">Revenue tracking</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="text-sm font-bold text-foreground">
                      ${stats.revenue?.thisMonth || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Month</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      ${stats.revenue?.lastMonth || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="text-sm font-medium text-green-600">
                      ${stats.revenue?.total || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <Button className="w-full gym-gradient text-white" data-testid="button-generate-report">
                    <TrendingUp className="mr-2" size={16} />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Membership Plans */}
            <Card>
              <CardHeader>
                <CardTitle>Membership Plans</CardTitle>
                <p className="text-sm text-muted-foreground">Current pricing tiers</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">Basic</h4>
                      <span className="text-lg font-bold text-foreground">$49/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Gym access only</p>
                    <p className="text-xs text-muted-foreground mt-1">89 active members</p>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">Premium</h4>
                      <span className="text-lg font-bold text-foreground">$99/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Gym + Classes</p>
                    <p className="text-xs text-muted-foreground mt-1">142 active members</p>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">Elite</h4>
                      <span className="text-lg font-bold text-foreground">$149/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">All access + PT</p>
                    <p className="text-xs text-muted-foreground mt-1">16 active members</p>
                  </div>
                </div>

                <Button variant="outline" className="mt-6 w-full" data-testid="button-manage-plans">
                  Manage Plans
                </Button>
              </CardContent>
            </Card>

            {/* Recent Check-ins */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
                <p className="text-sm text-muted-foreground">Live member activity</p>
              </CardHeader>
              <CardContent>
                {!recentCheckIns || recentCheckIns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LogIn className="mx-auto mb-2" size={32} />
                    <p>No recent check-ins</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {recentCheckIns.slice(0, 10).map((checkIn: any) => (
                      <div 
                        key={checkIn.id} 
                        className="flex items-start space-x-3 pb-3 border-b border-border last:border-0"
                        data-testid={`checkin-item-${checkIn.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={checkIn.user?.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {`${checkIn.user?.firstName?.[0] || ''}${checkIn.user?.lastName?.[0] || ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {checkIn.user?.firstName} {checkIn.user?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {checkIn.membership?.plan?.name || 'No membership'}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock size={10} className="text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(checkIn.checkInTime), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={checkIn.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {checkIn.status === 'active' ? 'In' : 'Out'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Membership Plans Management Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="text-primary" size={20} />
                    Paket Membership
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Kelola paket membership dan masa aktif</p>
                </div>
                <Button 
                  onClick={handleAddMembershipPlan}
                  className="gym-gradient text-white"
                  data-testid="button-add-plan"
                >
                  <UserPlus className="mr-2" size={16} />
                  Tambah Paket
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {!membershipPlans || membershipPlans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarCheck className="mx-auto mb-3" size={48} />
                  <p className="text-lg font-medium">Belum Ada Paket Membership</p>
                  <p className="text-sm mt-1">Tambahkan paket membership pertama Anda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {membershipPlans.map((plan: MembershipPlan) => (
                    <div 
                      key={plan.id} 
                      className="border border-border rounded-lg p-5 hover:shadow-md transition-shadow"
                      data-testid={`card-plan-${plan.id}`}
                    >
                      <div className="mb-4">
                        <h4 className="font-bold text-foreground text-xl">{plan.name}</h4>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Harga</span>
                          <span className="text-lg font-bold text-foreground" data-testid={`text-price-${plan.id}`}>
                            Rp {Number(plan.price).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Masa Aktif</span>
                          <span className="font-medium text-foreground">
                            {plan.durationMonths} {plan.durationMonths === 1 ? 'bulan' : 'bulan'}
                          </span>
                        </div>
                      </div>

                      {(() => {
                        const features = plan.features as string[] | null;
                        if (features && Array.isArray(features) && features.length > 0) {
                          return (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-muted-foreground mb-2">Fitur:</p>
                              <ul className="space-y-1">
                                {features.slice(0, 3).map((feature: string, index: number) => (
                                  <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-primary"></span>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                              {features.length > 3 && (
                                <p className="text-xs text-muted-foreground mt-1">+{features.length - 3} lainnya</p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <Badge 
                          variant={plan.active ? "default" : "secondary"}
                        >
                          {plan.active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditMembershipPlan(plan)}
                            data-testid={`button-edit-plan-${plan.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMembershipPlan(plan.id)}
                            data-testid={`button-delete-plan-${plan.id}`}
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Personal Trainers Management Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="text-primary" size={20} />
                    Personal Trainers
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Kelola personal trainer dan harga sesi</p>
                </div>
                <Button 
                  onClick={handleAddTrainer}
                  className="gym-gradient text-white"
                  data-testid="button-add-trainer"
                >
                  <UserPlus className="mr-2" size={16} />
                  Tambah Trainer
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {!trainers || trainers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Dumbbell className="mx-auto mb-3" size={48} />
                  <p className="text-lg font-medium">Belum Ada Personal Trainer</p>
                  <p className="text-sm mt-1">Tambahkan personal trainer pertama Anda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trainers.map((trainer: PersonalTrainer) => (
                    <div 
                      key={trainer.id} 
                      className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      data-testid={`card-trainer-${trainer.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={trainer.imageUrl || undefined} />
                            <AvatarFallback className="gym-gradient text-white">
                              {trainer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{trainer.name}</p>
                            <p className="text-xs text-muted-foreground">{trainer.specialization}</p>
                          </div>
                        </div>
                      </div>
                      
                      {trainer.bio && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {trainer.bio}
                        </p>
                      )}
                      
                      <div className="space-y-2 mb-4">
                        {trainer.experience && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground">{trainer.experience} tahun pengalaman</span>
                          </div>
                        )}
                        {trainer.certification && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {trainer.certification}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div>
                          <p className="text-xs text-muted-foreground">Harga per Sesi</p>
                          <p className="text-lg font-bold text-foreground" data-testid={`text-price-${trainer.id}`}>
                            ${trainer.pricePerSession}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTrainer(trainer)}
                            data-testid={`button-edit-trainer-${trainer.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTrainer(trainer.id)}
                            data-testid={`button-delete-trainer-${trainer.id}`}
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <Badge 
                        variant={trainer.active ? "default" : "secondary"}
                        className="mt-3 w-full justify-center"
                      >
                        {trainer.active ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gym Classes Management Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="text-primary" size={20} />
                    Gym Classes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Kelola kelas gym dan jadwal</p>
                </div>
                <Button 
                  onClick={handleAddClass}
                  className="gym-gradient text-white"
                  data-testid="button-add-class"
                >
                  <UserPlus className="mr-2" size={16} />
                  Tambah Class
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {!gymClasses || gymClasses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="mx-auto mb-3" size={48} />
                  <p className="text-lg font-medium">Belum Ada Gym Class</p>
                  <p className="text-sm mt-1">Tambahkan gym class pertama Anda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gymClasses.map((gymClass: GymClass) => (
                    <div 
                      key={gymClass.id} 
                      className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      data-testid={`card-class-${gymClass.id}`}
                    >
                      <div className="mb-3">
                        <h4 className="font-semibold text-foreground text-lg">{gymClass.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Instruktur: {gymClass.instructorName}
                        </p>
                      </div>
                      
                      {gymClass.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {gymClass.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} className="text-muted-foreground" />
                          <span className="text-muted-foreground">{gymClass.schedule}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users size={14} className="text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {gymClass.currentEnrollment}/{gymClass.maxCapacity} peserta
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <Badge 
                          variant={gymClass.active ? "default" : "secondary"}
                        >
                          {gymClass.active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClass(gymClass)}
                            data-testid={`button-edit-class-${gymClass.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClass(gymClass.id)}
                            data-testid={`button-delete-class-${gymClass.id}`}
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Member Feedback Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="text-primary" size={20} />
                    Member Feedback
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Review member suggestions and feedback</p>
                </div>
                <Badge variant="outline" className="text-sm" data-testid="text-feedback-count">
                  {feedbacks?.length || 0} Total
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {!feedbacks || feedbacks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="mx-auto mb-3" size={48} />
                  <p className="text-lg font-medium">No Feedback Yet</p>
                  <p className="text-sm mt-1">Member feedback will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((feedback: any) => (
                    <div 
                      key={feedback.id} 
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      data-testid={`feedback-item-${feedback.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={feedback.member?.profileImageUrl} />
                            <AvatarFallback>
                              {`${feedback.member?.firstName?.[0] || ''}${feedback.member?.lastName?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {feedback.member?.firstName} {feedback.member?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {feedback.member?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={i < feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                              />
                            ))}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {feedback.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-md p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {feedback.message}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-muted-foreground">
                          {new Date(feedback.createdAt).toLocaleString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Class Bookings Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="text-primary" size={20} />
                    Class Bookings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Lihat semua booking class dari member</p>
                </div>
                <Badge variant="outline" className="text-sm" data-testid="text-class-bookings-count">
                  {classBookings?.length || 0} Total
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {!classBookings || classBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarCheck className="mx-auto mb-3" size={48} />
                  <p className="text-lg font-medium">Belum Ada Booking Class</p>
                  <p className="text-sm mt-1">Booking class dari member akan muncul di sini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {classBookings.map((booking: any) => (
                        <tr key={booking.id} data-testid={`class-booking-row-${booking.id}`}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-foreground">
                              {`${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim()}
                            </p>
                            <p className="text-sm text-muted-foreground">{booking.user?.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-foreground">{booking.gymClass?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.gymClass?.instructorName}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {new Date(booking.bookingDate).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant={
                                booking.status === 'booked' ? 'default' :
                                booking.status === 'cancelled' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {booking.status === 'booked' ? 'Terdaftar' :
                               booking.status === 'cancelled' ? 'Dibatalkan' :
                               booking.status === 'attended' ? 'Hadir' : booking.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PT Bookings Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="text-primary" size={20} />
                    Personal Trainer Bookings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Lihat semua booking sesi PT dari member</p>
                </div>
                <Badge variant="outline" className="text-sm" data-testid="text-pt-bookings-count">
                  {ptBookings?.length || 0} Total
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {!ptBookings || ptBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Dumbbell className="mx-auto mb-3" size={48} />
                  <p className="text-lg font-medium">Belum Ada Booking PT</p>
                  <p className="text-sm mt-1">Booking sesi PT dari member akan muncul di sini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Trainer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Tanggal & Waktu
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Durasi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ptBookings.map((booking: any) => (
                        <tr key={booking.id} data-testid={`pt-booking-row-${booking.id}`}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-foreground">
                              {`${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim()}
                            </p>
                            <p className="text-sm text-muted-foreground">{booking.user?.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-foreground">{booking.trainer?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.trainer?.specialization}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {new Date(booking.bookingDate).toLocaleString('id-ID', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            {booking.duration} menit
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant={
                                booking.status === 'confirmed' ? 'default' :
                                booking.status === 'cancelled' ? 'destructive' :
                                booking.status === 'pending' ? 'outline' :
                                'secondary'
                              }
                            >
                              {booking.status === 'pending' ? 'Menunggu' :
                               booking.status === 'confirmed' ? 'Dikonfirmasi' :
                               booking.status === 'cancelled' ? 'Dibatalkan' :
                               booking.status === 'completed' ? 'Selesai' : booking.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check-in Modal */}
      <AdminCheckInModal 
        open={showCheckInModal} 
        onClose={() => setShowCheckInModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/checkins"] });
        }}
      />

      {/* Personal Trainer Dialog */}
      <AdminPTDialog
        open={showPTDialog}
        onOpenChange={setShowPTDialog}
        trainer={selectedTrainer}
      />

      {/* Gym Class Dialog */}
      <AdminClassDialog
        open={showClassDialog}
        onOpenChange={setShowClassDialog}
        gymClass={selectedClass}
      />

      {/* Add Member Dialog */}
      <AdminMemberDialog
        open={showMemberDialog}
        onOpenChange={setShowMemberDialog}
      />

      {/* Edit Member Dialog */}
      <AdminEditMemberDialog
        open={showEditMemberDialog}
        onOpenChange={setShowEditMemberDialog}
        member={selectedMember}
      />

      {/* Membership Plan Dialog */}
      <AdminMembershipPlanDialog
        open={showMembershipPlanDialog}
        onOpenChange={setShowMembershipPlanDialog}
        plan={selectedMembershipPlan}
      />
    </div>
  );
}
