import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./lib/i18n";
import MaksabLayout from "./components/MaksabLayout";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Mandoubs from "./pages/Mandoubs";
import Stores from "./pages/Stores";
import StoreDetails from "./pages/StoreDetails";
import Approvals from "./pages/Approvals";
import AuditLog from "./pages/AuditLog";
import Notifications from "./pages/Notifications";
import Wilayats from "./pages/Wilayats";
import Settings from "./pages/Settings";
import MandoubPortal from "./pages/MandoubPortal";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Bookings from "./pages/Bookings";
import Refunds from "./pages/Refunds";
import Coupons from "./pages/Coupons";
import Finance from "./pages/Finance";
import Dues from "./pages/Dues";
import Complaints from "./pages/Complaints";
import Reports from "./pages/Reports";
// Old BulkImport removed - redirects to /data-import
import DataImport from "./pages/DataImport";
import MyProfile from "./pages/MyProfile";
import NotFound from "@/pages/NotFound";

function Router() {
  return (
    <MaksabLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/employees" component={Employees} />
        <Route path="/mandoubs" component={Mandoubs} />
        <Route path="/stores" component={Stores} />
        <Route path="/stores/:id" component={StoreDetails} />
        <Route path="/orders" component={Orders} />
        <Route path="/customers" component={Customers} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/refunds" component={Refunds} />
        <Route path="/coupons" component={Coupons} />
        <Route path="/finance" component={Finance} />
        <Route path="/dues" component={Dues} />
        <Route path="/complaints" component={Complaints} />
        <Route path="/reports" component={Reports} />
        <Route path="/data-import" component={DataImport} />
        <Route path="/bulk-import">{() => { window.location.href = "/data-import"; return null; }}</Route>
        <Route path="/approvals" component={Approvals} />
        <Route path="/audit-log" component={AuditLog} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/wilayats" component={Wilayats} />
        <Route path="/settings" component={Settings} />
        <Route path="/my-profile" component={MyProfile} />
        <Route path="/mandoub-portal" component={MandoubPortal} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </MaksabLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
