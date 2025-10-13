import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/ui/admin-layout";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

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

export default function AdminFeedback() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();

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

  const { data: feedbacks } = useQuery<FeedbackRecord[]>({
    queryKey: ["/api/admin/feedbacks"],
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

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'facilities': return 'bg-blue-500/10 text-blue-600';
      case 'service': return 'bg-green-500/10 text-green-600';
      case 'equipment': return 'bg-orange-500/10 text-orange-600';
      case 'staff': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <AdminLayout user={user} notificationCount={stats.expiringSoon || 0}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Member Feedback</h1>
          <p className="text-muted-foreground mt-1">Review member feedback and ratings</p>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {!feedbacks || feedbacks.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No feedback yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            feedbacks.map((feedback) => (
              <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={feedback.member?.profileImageUrl} />
                        <AvatarFallback>
                          {`${feedback.member?.firstName?.[0] || ''}${feedback.member?.lastName?.[0] || ''}` || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">
                            {feedback.member?.firstName} {feedback.member?.lastName}
                          </CardTitle>
                          {feedback.rating && (
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={i < feedback.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {feedback.member?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {feedback.category && (
                        <Badge className={getCategoryColor(feedback.category)}>
                          {feedback.category}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(feedback.createdAt), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {feedback.subject && (
                    <p className="font-medium text-foreground mb-2">{feedback.subject}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{feedback.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
