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
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
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
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [memberFilter, setMemberFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckInModal, setShowCheckInModal] = useState(false);

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

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: members } = useQuery({
    queryKey: ["/api/admin/members"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: recentCheckIns } = useQuery({
    queryKey: ["/api/admin/checkins"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
    refetchInterval: 10000,
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

  const filteredMembers = members?.filter((member: any) => {
    const matchesSearch = !searchTerm || 
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = memberFilter === "all" ||
      (memberFilter === "active" && member.membership?.status === "active") ||
      (memberFilter === "expiring" && member.membership && isExpiringSoon(member.membership.endDate)) ||
      (memberFilter === "expired" && member.membership?.status === "expired");

    return matchesSearch && matchesFilter;
  }) || [];

  const isExpiringSoon = (endDate: string) => {
    const now = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 20 && diffDays > 0;
  };

  const getMembershipStatus = (member: any) => {
    if (!member.membership) return "No Membership";
    if (member.membership.status === "expired") return "Expired";
    if (isExpiringSoon(member.membership.endDate)) return "Expiring Soon";
    if (member.membership.status === "active") return "Active";
    return member.membership.status;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Active": return "default";
      case "Expiring Soon": return "secondary";
      case "Expired": return "destructive";
      default: return "outline";
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
                  <Button className="gym-gradient text-white" data-testid="button-add-member">
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
                                  data-testid={`button-edit-${member.id}`}
                                >
                                  <Edit size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
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
      </div>

      {/* Check-in Modal */}
      <AdminCheckInModal 
        open={showCheckInModal} 
        onClose={() => setShowCheckInModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/checkins"] });
        }}
      />
    </div>
  );
}
