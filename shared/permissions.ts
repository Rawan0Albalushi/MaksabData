// Maksab Role definitions
export type MaksabRole =
  | "manager"
  | "deputy_manager"
  | "top_employee_minister"
  | "finance_manager"
  | "state_employee_minister"
  | "employee"
  | "mandoub";

// Permission flags
export const PERMISSIONS = [
  // Phase 1
  "ViewAllAreas",
  "ViewOwnWilayat",
  "ManageUsers",
  "ManageEmployees",
  "ManageMandoubs",
  "ApproveMandoub",
  "ManageStores",
  "ActivateStore",
  "ArchiveStore",
  "ViewStores",
  "CreateStore",
  "EditStore",
  "ManageStoreDetails",
  "ManageMenu",
  "ViewDashboard",
  "ViewOwnMandoubData",
  "ManageApprovals",
  "ViewAuditLog",
  "ManageSettings",
  "ManageWilayats",
  // Phase 2
  "ImportStores",
  "ManageOrders",
  "ViewOrders",
  "ManageCustomers",
  "ViewCustomers",
  "ManageBookings",
  "ViewBookings",
  "ManageRefunds",
  "ManageCoupons",
  "ManageFinance",
  "ViewFinance",
  "ManageBudgets",
  "ManageExpenses",
  "ApproveExpenses",
  "ManageRevenues",
  "ManageMandoubDues",
  "ManageStoreDues",
  "ManageSettlements",
  "ManageComplaints",
  "ViewComplaints",
  "ViewReports",
  "ViewFinancialReports",
  // Phase 2 additional
  "CreateOrder",
  "ViewRefunds",
  "ApproveRefunds",
  "ViewCoupons",
  "ManageOffers",
  "ApproveSettlements",
  "BulkImportStores",
  // Data Import
  "ImportData",
  "ImportProducts",
  "ImportCustomers",
  "ImportOrders",
  "ImportPayments",
  "ViewImportHistory",
  // Data Import P2
  "ImportMandoubs",
  "ImportMandoubPerformance",
  "ImportMandoubDues",
  "ImportRefunds",
  "ImportRevenues",
  // Data Import P3
  "ImportBookings",
  "ImportCoupons",
  "ImportExpenses",
  "ImportStoreDues",
  "ImportSettlements",
  "ImportComplaints",
  "ImportCouponUsage",
  // Approval-specific permissions
  "ApproveProfileEdit",
  "ApproveStoreActivation",
  "ApproveMandoubActivation",
  "DirectEditUserProfile",
  // Role/Permission management
  "ManageRoles",
  "ManagePermissions",
  "ManageJobTitles",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Super admin roles that have full access
export const SUPER_ADMIN_ROLES: MaksabRole[] = [
  "manager",
  "deputy_manager",
  "top_employee_minister",
];

// Check if a role is a super admin role
export function isSuperAdmin(role: MaksabRole | null | undefined): boolean {
  if (!role) return false;
  return SUPER_ADMIN_ROLES.includes(role);
}

// Default permissions by role
export const DEFAULT_ROLE_PERMISSIONS: Record<MaksabRole, Permission[]> = {
  manager: [...PERMISSIONS] as Permission[],
  deputy_manager: [...PERMISSIONS] as Permission[],
  top_employee_minister: [...PERMISSIONS] as Permission[],
  finance_manager: [
    "ViewDashboard",
    "ViewAllAreas",
    "ViewStores",
    "ViewOrders",
    "ViewFinance",
    "ManageFinance",
    "ManageBudgets",
    "ManageExpenses",
    "ApproveExpenses",
    "ManageRevenues",
    "ManageMandoubDues",
    "ManageStoreDues",
    "ManageSettlements",
    "ManageRefunds",
    "ViewFinancialReports",
    "ViewReports",
  ],
  state_employee_minister: [
    "ViewOwnWilayat",
    "ManageEmployees",
    "ManageMandoubs",
    "ApproveMandoub",
    "ApproveProfileEdit",
    "ApproveStoreActivation",
    "ApproveMandoubActivation",
    "ManageStores",
    "ViewStores",
    "CreateStore",
    "EditStore",
    "ManageStoreDetails",
    "ManageMenu",
    "ViewDashboard",
    "ManageApprovals",
    "ManageOrders",
    "ViewOrders",
    "CreateOrder",
    "ManageCustomers",
    "ViewCustomers",
    "ManageBookings",
    "ViewBookings",
    "ManageComplaints",
    "ViewComplaints",
    "ViewReports",
    "BulkImportStores",
    "ImportStores",
    "ImportData",
    "ImportProducts",
    "ImportCustomers",
    "ImportOrders",
    "ImportMandoubs",
    "ImportMandoubPerformance",
    "ImportMandoubDues",
    "ImportRefunds",
    "ImportRevenues",
    "ImportBookings",
    "ImportCoupons",
    "ImportExpenses",
    "ImportStoreDues",
    "ImportSettlements",
    "ImportComplaints",
    "ImportCouponUsage",
    "ViewImportHistory",
  ],
  employee: [
    "ViewOwnWilayat",
    "ManageMandoubs",
    "ViewStores",
    "CreateStore",
    "EditStore",
    "ManageStoreDetails",
    "ManageMenu",
    "ViewDashboard",
    "ManageOrders",
    "ViewOrders",
    "CreateOrder",
    "ManageCustomers",
    "ViewCustomers",
    "ManageBookings",
    "ViewBookings",
    "ManageComplaints",
    "ViewComplaints",
    "BulkImportStores",
    "ImportStores",
    "ImportData",
    "ImportCustomers",
    "ImportMandoubs",
    "ImportMandoubDues",
    "ImportBookings",
    "ImportComplaints",
    "ViewImportHistory",
  ],
  mandoub: ["ViewOwnMandoubData", "ViewDashboard"],
};

// Role display names
export const ROLE_NAMES: Record<MaksabRole, { ar: string; en: string }> = {
  manager: { ar: "المدير", en: "Manager" },
  deputy_manager: { ar: "نائب المدير", en: "Deputy Manager" },
  top_employee_minister: { ar: "الوزير الأعلى للموظفين", en: "Top Employee Minister" },
  finance_manager: { ar: "مدير المالية", en: "Finance Manager" },
  state_employee_minister: { ar: "وزير الموظفين", en: "State Employee Minister" },
  employee: { ar: "الموظف", en: "Employee" },
  mandoub: { ar: "المندوب", en: "Mandoub" },
};

// Role hierarchy levels (higher number = higher authority)
export const ROLE_HIERARCHY: Record<MaksabRole, number> = {
  manager: 100,
  deputy_manager: 90,
  top_employee_minister: 80,
  finance_manager: 60,
  state_employee_minister: 50,
  employee: 30,
  mandoub: 10,
};

/** Check if approverRole is higher than or equal to requesterRole */
export function isHigherOrEqualRole(approverRole: MaksabRole, requesterRole: MaksabRole): boolean {
  return ROLE_HIERARCHY[approverRole] >= ROLE_HIERARCHY[requesterRole];
}

/** Get the required permission for a given approval request type */
export function getRequiredApprovalPermission(requestType: string): Permission | null {
  switch (requestType) {
    case "profile_edit": return "ApproveProfileEdit";
    case "store_activation": return "ApproveStoreActivation";
    case "mandoub_activation": return "ApproveMandoubActivation";
    case "role_change": return "ManageUsers";
    default: return "ManageApprovals";
  }
}

// Check if user has a specific permission
export function hasPermission(
  userRole: MaksabRole | null | undefined,
  userPermissions: Permission[] | null | undefined,
  requiredPermission: Permission
): boolean {
  if (!userRole) return false;
  // Super admins always have all permissions
  if (isSuperAdmin(userRole)) return true;
  // Check explicit permissions
  if (userPermissions && userPermissions.includes(requiredPermission)) return true;
  // Check default role permissions
  const defaults = DEFAULT_ROLE_PERMISSIONS[userRole];
  return defaults?.includes(requiredPermission) ?? false;
}

// Check if user has any of the specified permissions
export function hasAnyPermission(
  userRole: MaksabRole | null | undefined,
  userPermissions: Permission[] | null | undefined,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((p) => hasPermission(userRole, userPermissions, p));
}
