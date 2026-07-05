import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdminI18nProvider, useAdminI18n } from "./contexts/AdminI18nContext";
import { AdminAuthProvider, useAdminAuth } from "./contexts/AdminAuthContext";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUniversities from "./pages/AdminUniversities";
import AdminUsers from "./pages/AdminUsers";
import AdminPayments from "./pages/AdminPayments";
import AdminAcademicStructure from "./pages/AdminAcademicStructure";
import AdminCourses from "./pages/AdminCourses";
import AdminFiles from "./pages/AdminFiles";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminTimetable from "./pages/AdminTimetable";
import AdminAssignments from "./pages/AdminAssignments";
import AdminCommunity from "./pages/AdminCommunity";
import AdminOpportunities from "./pages/AdminOpportunities";
import AdminAgents from "./pages/AdminAgents";
import AdminSettings from "./pages/AdminSettings";
import { AdminPlaceholder } from "./pages/AdminPlaceholder";

const queryClient = new QueryClient();

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isReady } = useAdminAuth();

  if (!isReady) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    window.location.href = "/admin/login";
    return null;
  }

  return <Component />;
}

function Router() {
  const { isRTL } = useAdminI18n();

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />

        <Route path="/admin/dashboard" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />
        <Route path="/admin" component={() => <ProtectedAdminRoute component={AdminDashboard} />} />

        <Route path="/admin/universities" component={() => <ProtectedAdminRoute component={AdminUniversities} />} />
        <Route path="/admin/academic-structure" component={() => <ProtectedAdminRoute component={AdminAcademicStructure} />} />
        <Route path="/admin/users" component={() => <ProtectedAdminRoute component={AdminUsers} />} />
        <Route path="/admin/courses" component={() => <ProtectedAdminRoute component={AdminCourses} />} />
        <Route path="/admin/files" component={() => <ProtectedAdminRoute component={AdminFiles} />} />
        <Route path="/admin/announcements" component={() => <ProtectedAdminRoute component={AdminAnnouncements} />} />
        <Route path="/admin/timetable" component={() => <ProtectedAdminRoute component={AdminTimetable} />} />
        <Route path="/admin/assignments" component={() => <ProtectedAdminRoute component={AdminAssignments} />} />
        <Route path="/admin/exams" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Exams" icon="EX" />} />} />
        <Route path="/admin/community" component={() => <ProtectedAdminRoute component={AdminCommunity} />} />
        <Route path="/admin/opportunities" component={() => <ProtectedAdminRoute component={AdminOpportunities} />} />
        <Route path="/admin/events" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Events" icon="EV" />} />} />
        <Route path="/admin/clubs" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Clubs" icon="CL" />} />} />
        <Route path="/admin/subscriptions" component={() => <ProtectedAdminRoute component={() => <AdminPlaceholder title="Subscriptions" icon="SU" />} />} />
        <Route path="/admin/payments" component={() => <ProtectedAdminRoute component={AdminPayments} />} />
        <Route path="/admin/agents" component={() => <ProtectedAdminRoute component={AdminAgents} />} />
        <Route path="/admin/settings" component={() => <ProtectedAdminRoute component={AdminSettings} />} />

        <Route path="/admin/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
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
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
