import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminI18nProvider, useAdminI18n } from "./contexts/AdminI18nContext";
import { useAdminAuth } from "./hooks/useAdminApi";

// Admin pages
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUniversities from "./pages/AdminUniversities";
import AdminUsers from "./pages/AdminUsers";
import { AdminPlaceholder } from "./pages/AdminPlaceholder";

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = '/admin/login';
    return null;
  }

  return <Component />;
}

function Router() {
  const { isRTL } = useAdminI18n();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <Switch>
        {/* Auth */}
        <Route path="/admin/login" component={AdminLogin} />

        {/* Dashboard */}
        <Route path="/admin/dashboard" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />

        {/* Modules */}
        <Route path="/admin/universities" component={() => <ProtectedAdminRoute component={AdminUniversities} />} />
        <Route path="/admin/academic-structure" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Academic Structure" icon="📚" />} />} />
        <Route path="/admin/users" component={() => <ProtectedAdminRoute component={AdminUsers} />} />
        <Route path="/admin/courses" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Courses" icon="📖" />} />} />
        <Route path="/admin/files" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Files" icon="📄" />} />} />
        <Route path="/admin/announcements" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Announcements" icon="📢" />} />} />
        <Route path="/admin/timetable" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Timetable" icon="📅" />} />} />
        <Route path="/admin/assignments" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Assignments" icon="✏️" />} />} />
        <Route path="/admin/exams" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Exams" icon="📝" />} />} />
        <Route path="/admin/community" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Community" icon="💬" />} />} />
        <Route path="/admin/opportunities" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Opportunities" icon="🚀" />} />} />
        <Route path="/admin/events" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Events" icon="🎉" />} />} />
        <Route path="/admin/clubs" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Clubs" icon="🎯" />} />} />
        <Route path="/admin/subscriptions" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Subscriptions" icon="⭐" />} />} />
        <Route path="/admin/payments" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Payments" icon="💳" />} />} />
        <Route path="/admin/agents" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Agents" icon="🤝" />} />} />
        <Route path="/admin/settings" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Settings" icon="⚙️" />} />} />

        {/* 404 */}
        <Route path="/admin/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AdminI18nProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AdminI18nProvider>
    </ErrorBoundary>
  );
}

export default App;
