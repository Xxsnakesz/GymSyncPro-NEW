import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/ui/admin-layout";
import AdminMembershipPlanDialog from "@/components/admin-membership-plan-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Check, DollarSign, Calendar } from "lucide-react";
import type { MembershipPlan } from "@shared/schema.ts";

export default function AdminPlans() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

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

  const { data: membershipPlans } = useQuery<MembershipPlan[]>({
    queryKey: ["/api/admin/membership-plans"],
    enabled: isAuthenticated && user?.role === 'admin',
    retry: false,
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

  const handleAddPlan = () => {
    setSelectedPlan(null);
    setShowPlanDialog(true);
  };

  const handleEditPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setShowPlanDialog(true);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this membership plan?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/membership-plans/${planId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/membership-plans"] });
      toast({
        title: "Success!",
        description: "Membership plan has been deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete membership plan",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout user={user} notificationCount={stats.expiringSoon || 0}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Membership Plans</h1>
            <p className="text-muted-foreground mt-1">Manage membership plans and pricing</p>
          </div>
          <Button 
            className="gym-gradient text-white" 
            onClick={handleAddPlan}
            data-testid="button-add-plan"
          >
            <Plus className="mr-2" size={16} />
            Add New Plan
          </Button>
        </div>

        {/* Plans Grid */}
        {!membershipPlans || membershipPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">No membership plans available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {membershipPlans.map((plan: MembershipPlan) => (
              <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    </div>
                    <Badge variant={plan.active ? "default" : "secondary"}>
                      {plan.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="flex items-baseline justify-center gap-2">
                      <DollarSign size={24} className="text-primary" />
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.durationMonths}mo</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {plan.description || "No description"}
                  </p>

                  {Array.isArray(plan.features) && (plan.features as string[]).length > 0 && (
                    <div className="space-y-2 py-2">
                      {(plan.features as string[]).slice(0, 4).map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 4 && (
                        <p className="text-xs text-muted-foreground pl-6">
                          +{plan.features.length - 4} more features
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditPlan(plan)}
                      data-testid={`button-edit-plan-${plan.id}`}
                    >
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                      data-testid={`button-delete-plan-${plan.id}`}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Plan Dialog */}
      <AdminMembershipPlanDialog
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
        plan={selectedPlan}
      />
    </AdminLayout>
  );
}
