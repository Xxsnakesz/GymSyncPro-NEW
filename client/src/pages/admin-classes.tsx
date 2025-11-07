import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/ui/admin-layout";
import AdminClassDialog from "@/components/admin-class-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Calendar } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { GymClass } from "@shared/schema.ts";

export default function AdminClasses() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<GymClass | null>(null);

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

  const { data: gymClasses } = useQuery<GymClass[]>({
    queryKey: ["/api/admin/classes"],
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

  const handleAddClass = () => {
    setSelectedClass(null);
    setShowClassDialog(true);
  };

  const handleEditClass = (gymClass: GymClass) => {
    setSelectedClass(gymClass);
    setShowClassDialog(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/classes/${classId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Success!",
        description: "Class has been deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
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
            <h1 className="text-3xl font-bold text-foreground">Gym Classes</h1>
            <p className="text-muted-foreground mt-1">Manage gym classes and schedules</p>
          </div>
          <Button 
            className="gym-gradient text-white" 
            onClick={handleAddClass}
            data-testid="button-add-class"
          >
            <Plus className="mr-2" size={16} />
            Add New Class
          </Button>
        </div>

        {/* Classes Grid */}
        {!gymClasses || gymClasses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">No classes available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gymClasses.map((gymClass) => (
              <Card key={gymClass.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                {(gymClass as any).imageUrl && (
                  <AspectRatio ratio={16/9}>
                    <img src={(gymClass as any).imageUrl} alt={gymClass.name} className="w-full h-full object-cover" />
                  </AspectRatio>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{gymClass.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {gymClass.instructorName}
                      </p>
                    </div>
                    <Badge variant={gymClass.active ? "default" : "secondary"}>
                      {gymClass.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {gymClass.description || "No description"}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-muted-foreground" />
                    <span className="text-foreground">{gymClass.schedule}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-muted-foreground" />
                    <span className="text-foreground">
                      {gymClass.currentEnrollment || 0} / {gymClass.maxCapacity} enrolled
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClass(gymClass)}
                      data-testid={`button-edit-class-${gymClass.id}`}
                    >
                      <Edit size={16} className="mr-2" />
                      Edit
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Class Dialog */}
      <AdminClassDialog
        open={showClassDialog}
        onOpenChange={setShowClassDialog}
        gymClass={selectedClass}
      />
    </AdminLayout>
  );
}
