import Navigation from "./navigation";
import AdminSidebar from "./admin-sidebar";

interface AdminLayoutProps {
  user: any;
  notificationCount?: number;
  children: React.ReactNode;
}

export default function AdminLayout({ user, notificationCount = 0, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navigation 
        user={user} 
        isAdmin={true}
        notificationCount={notificationCount}
      />
      
      <div className="flex h-[calc(100vh-64px)]">
        <AdminSidebar />
        
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
