import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider, useI18n } from "./contexts/I18nContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

// Student pages (reusing components)
import Home from "./pages/Home";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Courses from "./pages/Courses";
import Timetable from "./pages/Timetable";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import More from "./pages/More";
import Files from "./pages/Files";
import Announcements from "./pages/Announcements";
import Assignments from "./pages/Assignments";
import Exams from "./pages/Exams";
import Events from "./pages/Events";
import Clubs from "./pages/Clubs";
import Opportunities from "./pages/Opportunities";
import AI from "./pages/AI";
import Subscription from "./pages/Subscription";
import Notifications from "./pages/Notifications";

function Router() {
  const { isRTL } = useI18n();
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <Switch>
        {/* Auth */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        {/* Main App */}
        <Route path="/" component={Home} />
        <Route path="/courses" component={Courses} />
        <Route path="/timetable" component={Timetable} />
        <Route path="/community" component={Community} />
        <Route path="/profile" component={Profile} />
        <Route path="/more" component={More} />
        <Route path="/files" component={Files} />
        <Route path="/announcements" component={Announcements} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/exams" component={Exams} />
        <Route path="/events" component={Events} />
        <Route path="/clubs" component={Clubs} />
        <Route path="/opportunities" component={Opportunities} />
        <Route path="/ai" component={AI} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/notifications" component={Notifications} />

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <I18nProvider>
            <ThemeProvider defaultTheme="light">
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </ThemeProvider>
          </I18nProvider>
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
