import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Briefcase,
  Building2,
  CheckSquare,
  Clock,
  DollarSign,
  Headphones,
  Package,
  Percent,
  ShoppingCart,
  Store,
  Truck,
  Undo2,
  Users,
} from "lucide-react";
import { isSuperAdmin, MaksabRole } from "@shared/permissions";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const userRole: MaksabRole | null = (user as any)?.maksabRole
    ? ((user as any).maksabRole as MaksabRole)
    : (user as any)?.role === "admin" ? "manager" : null;

  const stats = trpc.dashboard.stats.useQuery(undefined);
  const recentApprovals = trpc.dashboard.recentApprovals.useQuery(undefined, {
    enabled: !!userRole && (isSuperAdmin(userRole) || userRole === "state_employee_minister"),
  });
  const recentLogs = trpc.dashboard.recentAuditLogs.useQuery(undefined, {
    enabled: !!userRole && isSuperAdmin(userRole),
  });
  const myStores = trpc.dashboard.myStores.useQuery(undefined, {
    enabled: userRole === "employee",
  });
  const myMandoubs = trpc.dashboard.myMandoubs.useQuery(undefined, {
    enabled: userRole === "employee",
  });

  const allRoles: MaksabRole[] = ["manager", "deputy_manager", "top_employee_minister", "state_employee_minister", "employee", "finance_manager"];
  const operationsRoles: MaksabRole[] = ["manager", "deputy_manager", "top_employee_minister", "state_employee_minister", "employee"];
  const financeRoles: MaksabRole[] = ["manager", "deputy_manager", "top_employee_minister", "finance_manager"];

  const allStatCards = [
    // Phase 1 core
    { key: "totalUsers", icon: Users, value: stats.data?.totalUsers ?? 0, labelKey: "dashboard.totalUsers", color: "text-blue-600", roles: ["manager", "deputy_manager", "top_employee_minister"] as MaksabRole[] },
    { key: "totalEmployees", icon: Users, value: stats.data?.totalEmployees ?? 0, labelKey: "dashboard.totalEmployees", color: "text-green-600", roles: ["manager", "deputy_manager", "top_employee_minister", "state_employee_minister"] as MaksabRole[] },
    { key: "totalMandoubs", icon: Truck, value: stats.data?.totalMandoubs ?? 0, labelKey: "dashboard.totalMandoubs", color: "text-purple-600", roles: operationsRoles },
    { key: "totalStores", icon: Building2, value: stats.data?.totalStores ?? 0, labelKey: "dashboard.totalStores", color: "text-orange-600", roles: allRoles },
    { key: "activeStores", icon: Store, value: stats.data?.activeStores ?? 0, labelKey: "dashboard.activeStores", color: "text-emerald-600", roles: allRoles },
    { key: "pendingMandoubs", icon: Clock, value: stats.data?.pendingMandoubs ?? 0, labelKey: "dashboard.pendingMandoubs", color: "text-amber-600", roles: operationsRoles },
    { key: "pendingStoreActivations", icon: CheckSquare, value: stats.data?.pendingStoreActivations ?? 0, labelKey: "dashboard.pendingStoreActivations", color: "text-red-600", roles: operationsRoles },
    { key: "contractedStores", icon: Building2, value: stats.data?.contractedStores ?? 0, labelKey: "dashboard.contractedStores", color: "text-indigo-600", roles: financeRoles },
    { key: "ezhalhaStores", icon: Building2, value: stats.data?.ezhalhaStores ?? 0, labelKey: "dashboard.ezhalhaStores", color: "text-pink-600", roles: operationsRoles },
    { key: "pendingApprovals", icon: CheckSquare, value: stats.data?.pendingApprovals ?? 0, labelKey: "dashboard.pendingApprovals", color: "text-yellow-600", roles: operationsRoles },
    // Phase 2
    { key: "totalOrders", icon: ShoppingCart, value: stats.data?.totalOrders ?? 0, labelKey: "dashboard.totalOrders", color: "text-cyan-600", roles: allRoles },
    { key: "totalCustomers", icon: Users, value: stats.data?.totalCustomers ?? 0, labelKey: "dashboard.totalCustomers", color: "text-teal-600", roles: allRoles },
    { key: "totalBookings", icon: BookOpen, value: stats.data?.totalBookings ?? 0, labelKey: "dashboard.totalBookings", color: "text-violet-600", roles: operationsRoles },
    { key: "pendingComplaints", icon: Headphones, value: stats.data?.pendingComplaints ?? 0, labelKey: "dashboard.pendingComplaints", color: "text-rose-600", roles: operationsRoles },
    { key: "pendingRefunds", icon: Undo2, value: stats.data?.pendingRefunds ?? 0, labelKey: "dashboard.pendingRefunds", color: "text-orange-500", roles: financeRoles },
    { key: "activeCoupons", icon: Percent, value: stats.data?.activeCoupons ?? 0, labelKey: "dashboard.activeCoupons", color: "text-lime-600", roles: operationsRoles },
  ];

  const visibleStatCards = allStatCards.filter((card) => {
    if (!userRole) return false;
    return card.roles.includes(userRole);
  });

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.welcome")}, {user?.name || "User"}</h1>
        <p className="text-muted-foreground mt-1">
          {userRole ? t(`role.${userRole}`) : ""}
          {user?.wilayatId ? ` • ${t("common.wilayat")} #${user.wilayatId}` : ""}
        </p>
      </div>

      {/* Stat Cards */}
      {visibleStatCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visibleStatCards.map((card) => (
            <Card key={card.key} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{t(card.labelKey)}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <card.icon className={`h-7 w-7 ${card.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions Row */}
      {userRole && isSuperAdmin(userRole) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("nav.orders"), path: "/orders", icon: ShoppingCart, color: "bg-cyan-50 text-cyan-700" },
            { label: t("nav.complaints"), path: "/complaints", icon: Headphones, color: "bg-rose-50 text-rose-700" },
            { label: t("nav.finance"), path: "/finance", icon: DollarSign, color: "bg-emerald-50 text-emerald-700" },
            { label: t("nav.reports"), path: "/reports", icon: Package, color: "bg-violet-50 text-violet-700" },
          ].map((action) => (
            <Card key={action.path} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(action.path)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Employee-specific: My assigned stores */}
      {userRole === "employee" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("dashboard.myStores")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myStores.data && myStores.data.length > 0 ? (
                <div className="space-y-2">
                  {myStores.data.slice(0, 10).map((store: any) => (
                    <div key={store.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => setLocation(`/stores/${store.id}`)}>
                      <div>
                        <p className="text-sm font-medium">{store.nameAr}</p>
                        <p className="text-xs text-muted-foreground">{store.merchantName || "-"}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{store.activationStatus || "draft"}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {t("dashboard.myMandoubs")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myMandoubs.data && myMandoubs.data.length > 0 ? (
                <div className="space-y-2">
                  {myMandoubs.data.slice(0, 10).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 px-2">
                      <div>
                        <p className="text-sm font-medium">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.mandoubType === "fast" ? t("mandoub.fast") : t("mandoub.longDistance")}</p>
                      </div>
                      <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-xs">{m.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Finance Manager: overview with quick links */}
      {userRole === "finance_manager" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: t("nav.finance"), path: "/finance", icon: DollarSign, desc: t("dashboard.financeNote") },
            { label: t("nav.dues"), path: "/dues", icon: Briefcase, desc: t("nav.dues") },
            { label: t("nav.reports"), path: "/reports", icon: Package, desc: t("nav.reports") },
          ].map((item) => (
            <Card key={item.path} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(item.path)}>
              <CardContent className="p-6 text-center">
                <item.icon className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Approvals */}
      {recentApprovals.data && recentApprovals.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {t("dashboard.pendingApprovals")} ({recentApprovals.data.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentApprovals.data.slice(0, 5).map((approval: any) => (
                <div key={approval.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => setLocation("/approvals")}>
                  <div>
                    <p className="text-sm font-medium">{approval.requestType}</p>
                    <p className="text-xs text-muted-foreground">
                      {approval.targetEntityType} {approval.targetEntityId ? `#${approval.targetEntityId}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{approval.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {userRole && isSuperAdmin(userRole) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.data && recentLogs.data.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.data.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.actionType}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.userName} • {log.entityType}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
