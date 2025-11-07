import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { useEffect, lazy, Suspense } from "react";
const Login = lazy(() => import("@/pages/login"));
const LoginAdmin = lazy(() => import("@/pages/login-admin"));
const Register = lazy(() => import("@/pages/register"));
const RegisterAdmin = lazy(() => import("@/pages/register-admin"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const MemberDashboard = lazy(() => import("@/pages/member-dashboard"));
const AdminOverview = lazy(() => import("@/pages/admin-overview"));
const AdminMembers = lazy(() => import("@/pages/admin-members"));
const AdminClasses = lazy(() => import("@/pages/admin-classes"));
const AdminTrainers = lazy(() => import("@/pages/admin-trainers"));
const AdminPlans = lazy(() => import("@/pages/admin-plans"));
const AdminCheckIns = lazy(() => import("@/pages/admin-checkins"));
const AdminFeedback = lazy(() => import("@/pages/admin-feedback"));
const AdminPTBookings = lazy(() => import("@/pages/admin-pt-bookings"));
const AdminPTSessions = lazy(() => import("@/pages/admin-pt-sessions"));
const AdminPromotions = lazy(() => import("@/pages/admin-promotions"));
const AdminClassBookings = lazy(() => import("@/pages/admin-class-bookings"));
const Checkout = lazy(() => import("@/pages/checkout"));
const MyBookings = lazy(() => import("@/pages/my-bookings"));
const MyPtSessions = lazy(() => import("@/pages/my-pt-sessions"));
const ClassesPage = lazy(() => import("@/pages/classes"));
const BookPTPage = lazy(() => import("@/pages/book-pt"));
const CheckInVerify = lazy(() => import("@/pages/checkin-verify"));
const CookieSettings = lazy(() => import("@/pages/cookie-settings"));
const MyProfile = lazy(() => import("@/pages/my-profile"));
const PromotionsPage = lazy(() => import("@/pages/promotions"));
const Settings = lazy(() => import("@/pages/settings"));
const Terms = lazy(() => import("@/pages/terms"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/checkin/verify/:code" component={CheckInVerify} />
      <Route path="/cookie-settings" component={CookieSettings} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      
      {!isAuthenticated ? (
        <>
          <Route path="/login" component={Login} />
          <Route path="/login-admin" component={LoginAdmin} />
          <Route path="/register" component={Register} />
          <Route path="/register-admin" component={RegisterAdmin} />
          {/* Move marketing landing to /welcome so default / goes to Login */}
          <Route path="/welcome" component={Landing} />
          <Route path="/" component={Login} />
        </>
      ) : (
        <>
          <Route path="/" component={user?.role === 'admin' ? AdminOverview : MemberDashboard} />
          <Route path="/admin" component={AdminOverview} />
          <Route path="/admin/members" component={AdminMembers} />
          <Route path="/admin/classes" component={AdminClasses} />
          <Route path="/admin/trainers" component={AdminTrainers} />
          <Route path="/admin/plans" component={AdminPlans} />
          <Route path="/admin/checkins" component={AdminCheckIns} />
          <Route path="/admin/feedback" component={AdminFeedback} />
          <Route path="/admin/pt-bookings" component={AdminPTBookings} />
          <Route path="/admin/pt-sessions" component={AdminPTSessions} />
          <Route path="/admin/promotions" component={AdminPromotions} />
          <Route path="/admin/class-bookings" component={AdminClassBookings} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/classes" component={ClassesPage} />
          <Route path="/book-pt" component={BookPTPage} />
          <Route path="/my-bookings" component={MyBookings} />
          <Route path="/my-pt-sessions" component={MyPtSessions} />
          <Route path="/my-profile" component={MyProfile} />
          <Route path="/promotions" component={PromotionsPage} />
          <Route path="/settings" component={Settings} />
          <Route path="/terms" component={Terms} />
          <Route path="/login">
            <Redirect to="/" />
          </Route>
          <Route path="/login-admin">
            <Redirect to="/" />
          </Route>
          <Route path="/register">
            <Redirect to="/" />
          </Route>
          <Route path="/register-admin">
            <Redirect to="/" />
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        }>
          <Router />
        </Suspense>
        <CookieConsentBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
