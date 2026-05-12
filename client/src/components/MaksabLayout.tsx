import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { hasPermission, isSuperAdmin, MaksabRole, Permission } from "@shared/permissions";
import {
  Bell,
  BookOpen,
  Building2,
  CheckSquare,
  ClipboardList,
  DollarSign,
  Globe,
  Headphones,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Percent,
  PieChart,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Undo2,
  Users,
  Wallet,
  Upload,
  UserCircle,
  X,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

interface NavItem {
  icon: any;
  labelKey: string;
  path: string;
  requiredPermissions?: Permission[];
  hideForRoles?: MaksabRole[];
  showForRoles?: MaksabRole[];
  section?: string;
}

const navItems: NavItem[] = [
  // Core
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/", requiredPermissions: ["ViewDashboard"], section: "core" },
  { icon: Users, labelKey: "nav.employees", path: "/employees", requiredPermissions: ["ManageEmployees"], section: "core" },
  { icon: Truck, labelKey: "nav.mandoubs", path: "/mandoubs", requiredPermissions: ["ManageMandoubs"], section: "core" },
  { icon: Building2, labelKey: "nav.stores", path: "/stores", requiredPermissions: ["ViewStores"], section: "core" },
  { icon: MapPin, labelKey: "nav.wilayats", path: "/wilayats", requiredPermissions: ["ManageWilayats"], section: "core" },
  // Operations
  { icon: ShoppingCart, labelKey: "nav.orders", path: "/orders", requiredPermissions: ["ManageOrders"], section: "operations" },
  { icon: Users, labelKey: "nav.customers", path: "/customers", requiredPermissions: ["ManageCustomers"], section: "operations" },
  { icon: BookOpen, labelKey: "nav.bookings", path: "/bookings", requiredPermissions: ["ManageBookings"], section: "operations" },
  { icon: Undo2, labelKey: "nav.refunds", path: "/refunds", requiredPermissions: ["ManageRefunds"], section: "operations" },
  { icon: Percent, labelKey: "nav.coupons", path: "/coupons", requiredPermissions: ["ManageCoupons"], section: "operations" },
  { icon: Headphones, labelKey: "nav.complaints", path: "/complaints", requiredPermissions: ["ManageComplaints"], section: "operations" },
  // Finance
  { icon: Wallet, labelKey: "nav.finance", path: "/finance", requiredPermissions: ["ManageFinance"], section: "finance" },
  { icon: DollarSign, labelKey: "nav.dues", path: "/dues", requiredPermissions: ["ManageFinance"], section: "finance" },
  // Reports & Admin
  { icon: PieChart, labelKey: "nav.reports", path: "/reports", requiredPermissions: ["ViewReports"], section: "admin" },
  { icon: Upload, labelKey: "nav.dataImport", path: "/data-import", requiredPermissions: ["ImportData"], section: "admin" },
  { icon: CheckSquare, labelKey: "nav.approvals", path: "/approvals", requiredPermissions: ["ManageApprovals"], section: "admin" },
  { icon: Bell, labelKey: "nav.notifications", path: "/notifications", section: "admin" },
  { icon: ClipboardList, labelKey: "nav.auditLog", path: "/audit-log", requiredPermissions: ["ViewAuditLog"], section: "admin" },
  { icon: Settings, labelKey: "nav.settings", path: "/settings", requiredPermissions: ["ManageSettings"], section: "admin" },
];

const sectionLabels: Record<string, { ar: string; en: string }> = {
  core: { ar: "الأساسي", en: "Core" },
  operations: { ar: "العمليات", en: "Operations" },
  finance: { ar: "المالية", en: "Finance" },
  admin: { ar: "الإدارة", en: "Admin" },
};

function canAccessNavItem(item: NavItem, userRole: MaksabRole | null | undefined, userPermissions: Permission[] | null | undefined): boolean {
  if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
  return item.requiredPermissions.some((p) => hasPermission(userRole, userPermissions, p));
}

export default function MaksabLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, error } = useAuth();
  const { t, language, setLanguage, dir } = useI18n();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unreadCount = trpc.notification.unreadCount.useQuery(undefined, { enabled: !!user });

  const userRole: MaksabRole | null = (user as any)?.maksabRole
    ? ((user as any).maksabRole as MaksabRole)
    : (user as any)?.role === "admin" ? "manager" : null;
  useEffect(() => {
    if (user && userRole === "mandoub" && location !== "/mandoub-portal" && location !== "/my-profile") {
      setLocation("/mandoub-portal");
    }
  }, [user, userRole, location, setLocation]);

  // Pending role assignment: user logged in but no role/permissions assigned
  const isPendingRoleAssignment = user && !userRole && !(user as any)?.maksabRole && (user as any)?.role !== "admin";
  if (isPendingRoleAssignment && location !== "/my-profile") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" dir={dir}>
        <div className="flex flex-col items-center gap-6 p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">م</span>
          </div>
          <h1 className="text-2xl font-bold">
            {language === "ar" ? `مرحبًا، ${user.name || "مستخدم"}` : `Welcome, ${user.name || "User"}`}
          </h1>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 mb-3">
              {language === "ar" ? "بانتظار تعيين المنصب" : "Pending Role Assignment"}
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {language === "ar"
                ? "تم إنشاء حسابك بنجاح، لكن لم يتم تعيين منصبك أو صلاحياتك بعد. يرجى الانتظار حتى يقوم المدير أو صاحب الصلاحية بتعيين منصبك وتفعيل صلاحياتك داخل النظام. بعد تعيين المنصب، ستتمكن من الوصول إلى لوحة التحكم والصفحات المسموح بها."
                : "Your account has been created successfully, but your role and permissions have not been assigned yet. Please wait until the Manager or an authorized admin assigns your position and activates your system access. Once your role is assigned, you will be able to access your dashboard and allowed pages."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation("/my-profile")}>
              <UserCircle className="h-4 w-4 me-2" />
              {language === "ar" ? "بياناتي" : "My Profile"}
            </Button>
            <Button variant="destructive" onClick={logout}>
              <LogOut className="h-4 w-4 me-2" />
              {language === "ar" ? "تسجيل الخروج" : "Sign Out"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Safe fallback: if loading fails or takes too long, show Retry + Logout
  if (loading && !error) return <DashboardLayoutSkeleton />;
  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" dir={dir}>
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-xl flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold">
            {language === "ar" ? "حدث خطأ في تحميل الحساب" : "Failed to load account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === "ar"
              ? "لم نتمكن من تحميل بيانات حسابك. يرجى المحاولة مرة أخرى."
              : "We could not load your account data. Please try again."}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()}>
              {language === "ar" ? "إعادة المحاولة" : "Retry"}
            </Button>
            <Button variant="destructive" onClick={logout}>
              <LogOut className="h-4 w-4 me-2" />
              {language === "ar" ? "تسجيل الخروج" : "Sign Out"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    const authError =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("auth_error")
        : null;
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" dir={dir}>
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">م</span>
            </div>
            <h1 className="text-2xl font-bold">مكسب - MAKSAB PRO</h1>
            <p className="text-muted-foreground text-center">{t("common.signIn")}</p>
          </div>
          {authError && (
            <div className="w-full rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {language === "ar"
                ? "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى."
                : "Sign-in failed. Please try again."}
              <span className="block opacity-70 text-xs mt-1">({authError})</span>
            </div>
          )}
          <Button onClick={() => (window.location.href = getLoginUrl())} size="lg" className="w-full">
            {t("common.signIn")}
          </Button>
        </div>
      </div>
    );
  }

  const userPermissions = (user.permissions as Permission[]) ?? [];

  const filteredNavItems = userRole === "mandoub"
    ? [{ icon: Truck, labelKey: "nav.mandoubPortal", path: "/mandoub-portal", section: "core" }]
    : navItems.filter((item) => canAccessNavItem(item, userRole, userPermissions));

  // Group by section
  const sections = ["core", "operations", "finance", "admin"];
  const groupedNav = sections.map(s => ({
    section: s,
    label: sectionLabels[s],
    items: filteredNavItems.filter(i => i.section === s),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex h-screen bg-background" dir={dir}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 ${dir === "rtl" ? "right-0" : "left-0"} z-50 w-64 bg-card border-${dir === "rtl" ? "l" : "r"} border-border transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">م</span>
              </div>
              <span className="font-bold text-lg">MAKSAB</span>
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Items - grouped by section */}
          <nav className="flex-1 overflow-y-auto py-2 px-3">
            {groupedNav.map((group) => (
              <div key={group.section} className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 py-1 font-semibold">
                  {group.label[language]}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
                    return (
                      <li key={item.path}>
                        <button
                          onClick={() => {
                            setLocation(item.path);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t(item.labelKey)}</span>
                          {item.path === "/notifications" && unreadCount.data ? (
                            <span className="ms-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                              {unreadCount.data}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userRole ? t(`role.${userRole}`) : t("role.employee")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold hidden sm:block">
              {t(filteredNavItems.find((i) => i.path === location)?.labelKey || "nav.dashboard")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="gap-1.5"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs">{language === "ar" ? "EN" : "عربي"}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/notifications")}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount.data ? (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount.data > 9 ? "9+" : unreadCount.data}
                </span>
              ) : null}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setLocation("/my-profile")} title={language === "ar" ? "بياناتي" : "My Profile"}>
              <UserCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
