import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/login";
import LoginAdmin from "@/pages/login-admin";
import Register from "@/pages/register";
import RegisterAdmin from "@/pages/register-admin";
import MemberDashboard from "@/pages/member-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import Checkout from "@/pages/checkout";
import MyBookings from "@/pages/my-bookings";
import NotFound from "@/pages/not-found";

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
      {!isAuthenticated ? (
        <>
          <Route path="/login" component={Login} />
          <Route path="/login-admin" component={LoginAdmin} />
          <Route path="/register" component={Register} />
          <Route path="/register-admin" component={RegisterAdmin} />
          <Route path="/">
            <Redirect to="/login" />
          </Route>
        </>
      ) : (
        <>
          <Route path="/" component={user?.role === 'admin' ? AdminDashboard : MemberDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/my-bookings" component={MyBookings} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
