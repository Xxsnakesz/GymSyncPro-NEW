import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "@/components/ui/admin-layout";
import AdminMemberDialog from "@/components/admin-member-dialog";
import AdminEditMemberDialog from "@/components/admin-edit-member-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserPlus, Edit, Trash2, UserX, UserCheck, Search, Activity } from "lucide-react";
import { format } from "date-fns";

interface MemberWithMembership {
  id: string;
  email?: string;
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  active?: boolean;
  lastCheckIn?: string | null;
  daysInactive?: number | null;
  membership?: {
    status?: string;
    endDate?: string;
    plan?: {
      name?: string;
    };
  };
}

export default function AdminMembers() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [memberFilter, setMemberFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithMembership | null>(null);

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

  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/admin/dashboard"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const { data: members } = useQuery<MemberWithMembership[]>({
    queryKey: ["/api/admin/members"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
  });

  const suspendMutation = useMutation({
    mutationFn: (memberId: string) => apiRequest("PUT", `/api/admin/members/${memberId}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Success!",
        description: "Member has been suspended",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend member",
        variant: "destructive",
      });
    }
  });

  const activateMutation = useMutation({
    mutationFn: (memberId: string) => apiRequest("PUT", `/api/admin/members/${memberId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Success!",
        description: "Member has been activated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate member",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
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
      (memberFilter === "expired" && member.membership?.status === "expired") ||
      (memberFilter === "inactive" && member.daysInactive !== null && member.daysInactive !== undefined && member.daysInactive >= 7);

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

  const handleEditMember = (member: MemberWithMembership) => {
    setSelectedMember(member);
    setShowEditMemberDialog(true);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to delete this member? This action cannot be undone.")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/members/${memberId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Success!",
        description: "Member has been deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete member",
        variant: "destructive",
      });
    }
  };

  const handleSuspendMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to suspend this member temporarily?")) {
      return;
    }
    suspendMutation.mutate(memberId);
  };

  const handleActivateMember = async (memberId: string) => {
    activateMutation.mutate(memberId);
  };

  return (
    <AdminLayout user={user} notificationCount={stats.expiringSoon || 0}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Members</h1>
            <p className="text-muted-foreground mt-1">Manage gym member accounts</p>
          </div>
          <Button 
            className="gym-gradient text-white" 
            onClick={() => setShowMemberDialog(true)}
            data-testid="button-add-member"
          >
            <UserPlus className="mr-2" size={16} />
            Add New Member
          </Button>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Search members by name, email, username, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
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
                  <SelectItem value="inactive">Inactive (7+ days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Members ({filteredMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No members found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Membership
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Last Check-in
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Inactive Days
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.map((member) => (
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
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'No Name'}
                                </p>
                                {member.active === false && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                                    Suspended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {member.username || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {member.phone || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {member.membership?.plan?.name || 'No Plan'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusVariant(getMembershipStatus(member))}>
                            {getMembershipStatus(member)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {member.lastCheckIn ? (
                            <div className="flex items-center gap-2">
                              <Activity size={14} className="text-green-600" />
                              {format(new Date(member.lastCheckIn), 'dd MMM yyyy')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {member.daysInactive !== null && member.daysInactive !== undefined ? (
                            <Badge 
                              variant={member.daysInactive >= 7 ? "destructive" : member.daysInactive >= 3 ? "secondary" : "default"}
                            >
                              {member.daysInactive} {member.daysInactive === 1 ? 'day' : 'days'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMember(member)}
                              data-testid={`button-edit-${member.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            {member.active !== false ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuspendMember(member.id)}
                                data-testid={`button-suspend-${member.id}`}
                              >
                                <UserX size={16} className="text-orange-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivateMember(member.id)}
                                data-testid={`button-activate-${member.id}`}
                              >
                                <UserCheck size={16} className="text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
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
    </AdminLayout>
  );
}
