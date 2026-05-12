import { and, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  approvalRequests,
  auditLogs,
  employees,
  InsertApprovalRequest,
  InsertAuditLog,
  InsertEmployee,
  InsertMandoub,
  InsertNotification,
  InsertStore,
  InsertStoreCategory,
  InsertStoreFollowUp,
  InsertStoreImage,
  InsertUser,
  InsertWilayat,
  InsertMenuCategory,
  InsertProduct,
  InsertRole,
  InsertRolePermission,
  InsertJobTitle,
  mandoubs,
  menuCategories,
  notifications,
  products,
  roles,
  rolePermissions,
  jobTitles,
  storeCategories,
  storeFollowUps,
  storeImages,
  stores,
  users,
  wilayats,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// USER QUERIES
// ============================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "fullNameWithTribe", "email", "loginMethod", "phone", "jobTitle", "profilePhoto"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = (user as any)[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.maksabRole !== undefined) {
      (values as any).maksabRole = user.maksabRole;
      updateSet.maksabRole = user.maksabRole;
    }
    if (user.wilayatId !== undefined) {
      values.wilayatId = user.wilayatId;
      updateSet.wilayatId = user.wilayatId;
    }
    if (user.managerId !== undefined) {
      values.managerId = user.managerId;
      updateSet.managerId = user.managerId;
    }
    if (user.status !== undefined) {
      (values as any).status = user.status;
      updateSet.status = user.status;
    }
    if (user.permissions !== undefined) {
      values.permissions = user.permissions;
      updateSet.permissions = user.permissions;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.archived, false));
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

// ============================================================
// WILAYAT QUERIES
// ============================================================
export async function getAllWilayats() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wilayats);
}

export async function getWilayatById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wilayats).where(eq(wilayats.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWilayat(data: InsertWilayat) {
  const db = await getDb();
  if (!db) return;
  await db.insert(wilayats).values(data);
}

export async function updateWilayat(id: number, data: Partial<InsertWilayat>) {
  const db = await getDb();
  if (!db) return;
  await db.update(wilayats).set(data).where(eq(wilayats.id, id));
}

// ============================================================
// STORE CATEGORIES QUERIES
// ============================================================
export async function getAllStoreCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeCategories).orderBy(storeCategories.sortOrder);
}

export async function createStoreCategory(data: InsertStoreCategory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(storeCategories).values(data);
}

export async function updateStoreCategory(id: number, data: Partial<InsertStoreCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(storeCategories).set(data).where(eq(storeCategories.id, id));
}

// ============================================================
// EMPLOYEE QUERIES
// ============================================================
export async function getAllEmployees(filters?: { wilayatId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(employees.archived, false)];
  if (filters?.wilayatId) conditions.push(eq(employees.wilayatId, filters.wilayatId));
  if (filters?.status) conditions.push(eq(employees.status, filters.status as any));
  return db.select().from(employees).where(and(...conditions)).orderBy(desc(employees.createdAt));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmployeeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(and(eq(employees.userId, userId), eq(employees.archived, false))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(employees).values(data);
  return result;
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set(data).where(eq(employees.id, id));
}

// ============================================================
// MANDOUB QUERIES
// ============================================================
export async function getAllMandoubs(filters?: { wilayatId?: number; status?: string; responsibleEmployeeId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(mandoubs.archived, false)];
  if (filters?.wilayatId) conditions.push(eq(mandoubs.wilayatId, filters.wilayatId));
  if (filters?.status) conditions.push(eq(mandoubs.status, filters.status as any));
  if (filters?.responsibleEmployeeId) conditions.push(eq(mandoubs.responsibleEmployeeId, filters.responsibleEmployeeId));
  return db.select().from(mandoubs).where(and(...conditions)).orderBy(desc(mandoubs.createdAt));
}

export async function getMandoubById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mandoubs).where(eq(mandoubs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMandoubByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mandoubs).where(and(eq(mandoubs.userId, userId), eq(mandoubs.archived, false))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMandoub(data: InsertMandoub) {
  const db = await getDb();
  if (!db) return;
  return db.insert(mandoubs).values(data);
}

export async function updateMandoub(id: number, data: Partial<InsertMandoub>) {
  const db = await getDb();
  if (!db) return;
  await db.update(mandoubs).set(data).where(eq(mandoubs.id, id));
}

// ============================================================
// STORE QUERIES
// ============================================================
export async function getAllStores(filters?: {
  wilayatId?: number;
  category?: string;
  classification?: string;
  activationStatus?: string;
  communicationStatus?: string;
  merchantApproval?: string;
  addedInSystem?: string;
  responsibleEmployeeId?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(stores.archived, false)];
  if (filters?.wilayatId) conditions.push(eq(stores.wilayatId, filters.wilayatId));
  if (filters?.category) conditions.push(eq(stores.category, filters.category as any));
  if (filters?.classification) conditions.push(eq(stores.classification, filters.classification as any));
  if (filters?.activationStatus) conditions.push(eq(stores.activationStatus, filters.activationStatus as any));
  if (filters?.communicationStatus) conditions.push(eq(stores.communicationStatus, filters.communicationStatus as any));
  if (filters?.merchantApproval) conditions.push(eq(stores.merchantApproval, filters.merchantApproval as any));
  if (filters?.addedInSystem) conditions.push(eq(stores.addedInSystem, filters.addedInSystem as any));
  if (filters?.responsibleEmployeeId) conditions.push(eq(stores.responsibleEmployeeId, filters.responsibleEmployeeId));
  if (filters?.search) {
    conditions.push(
      or(
        like(stores.nameAr, `%${filters.search}%`),
        like(stores.nameEn, `%${filters.search}%`),
        like(stores.merchantName, `%${filters.search}%`),
        like(stores.merchantPhone, `%${filters.search}%`)
      )!
    );
  }
  return db.select().from(stores).where(and(...conditions)).orderBy(desc(stores.createdAt));
}

export async function getStoreById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createStore(data: InsertStore) {
  const db = await getDb();
  if (!db) return;
  return db.insert(stores).values(data);
}

export async function updateStore(id: number, data: Partial<InsertStore>) {
  const db = await getDb();
  if (!db) return;
  await db.update(stores).set(data).where(eq(stores.id, id));
}

// ============================================================
// STORE IMAGES QUERIES
// ============================================================
export async function getStoreImages(storeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeImages).where(and(eq(storeImages.storeId, storeId), eq(storeImages.archived, false))).orderBy(storeImages.sortOrder);
}

export async function createStoreImage(data: InsertStoreImage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(storeImages).values(data);
}

export async function updateStoreImage(id: number, data: Partial<InsertStoreImage>) {
  const db = await getDb();
  if (!db) return;
  await db.update(storeImages).set(data).where(eq(storeImages.id, id));
}

// ============================================================
// STORE FOLLOW-UP QUERIES
// ============================================================
export async function getStoreFollowUps(storeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeFollowUps).where(eq(storeFollowUps.storeId, storeId)).orderBy(desc(storeFollowUps.createdAt));
}

export async function createStoreFollowUp(data: InsertStoreFollowUp) {
  const db = await getDb();
  if (!db) return;
  await db.insert(storeFollowUps).values(data);
}

// ============================================================
// MENU CATEGORY QUERIES
// ============================================================
export async function getMenuCategories(storeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuCategories).where(and(eq(menuCategories.storeId, storeId), eq(menuCategories.isActive, true))).orderBy(menuCategories.sortOrder);
}

export async function createMenuCategory(data: InsertMenuCategory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(menuCategories).values(data);
}

export async function updateMenuCategory(id: number, data: Partial<InsertMenuCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(menuCategories).set(data).where(eq(menuCategories.id, id));
}

// ============================================================
// PRODUCT QUERIES
// ============================================================
export async function getProducts(storeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(and(eq(products.storeId, storeId), eq(products.archived, false))).orderBy(products.sortOrder);
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) return;
  await db.insert(products).values(data);
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set(data).where(eq(products.id, id));
}

// ============================================================
// APPROVAL QUERIES
// ============================================================
export async function getAllApprovals(filters?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(approvalRequests.status, filters.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(approvalRequests).where(where).orderBy(desc(approvalRequests.createdAt));
}

export async function createApproval(data: InsertApprovalRequest) {
  const db = await getDb();
  if (!db) return;
  return db.insert(approvalRequests).values(data);
}

export async function updateApproval(id: number, data: Partial<InsertApprovalRequest>) {
  const db = await getDb();
  if (!db) return;
  await db.update(approvalRequests).set(data).where(eq(approvalRequests.id, id));
}

export async function getApprovalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// NOTIFICATION QUERIES
// ============================================================
export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  return db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

// ============================================================
// AUDIT LOG QUERIES
// ============================================================
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  return db.insert(auditLogs).values(data);
}

export async function getAuditLogs(filters?: { entityType?: string; entityId?: number; userId?: number; limit?: number; startDate?: string; endDate?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters?.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.startDate) conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
  if (filters?.endDate) conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(filters?.limit ?? 100);
}

// ============================================================
// DASHBOARD STATS
// ============================================================
export async function getDashboardStats(wilayatId?: number) {
  const db = await getDb();
  if (!db) return null;

  const userConditions = [eq(users.archived, false)];
  const employeeConditions = [eq(employees.archived, false)];
  const mandoubConditions = [eq(mandoubs.archived, false)];
  const storeConditions = [eq(stores.archived, false)];

  if (wilayatId) {
    employeeConditions.push(eq(employees.wilayatId, wilayatId));
    mandoubConditions.push(eq(mandoubs.wilayatId, wilayatId));
    storeConditions.push(eq(stores.wilayatId, wilayatId));
  }

  const [totalUsers] = await db.select({ count: count() }).from(users).where(and(...userConditions));
  const [totalEmployees] = await db.select({ count: count() }).from(employees).where(and(...employeeConditions));
  const [totalMandoubs] = await db.select({ count: count() }).from(mandoubs).where(and(...mandoubConditions));
  const [totalStores] = await db.select({ count: count() }).from(stores).where(and(...storeConditions));
  const [activeStores] = await db.select({ count: count() }).from(stores).where(and(...storeConditions, eq(stores.activationStatus, "active")));
  const [pendingMandoubs] = await db.select({ count: count() }).from(mandoubs).where(and(...mandoubConditions, eq(mandoubs.status, "pending_approval")));
  const [pendingStoreActivations] = await db.select({ count: count() }).from(stores).where(and(...storeConditions, eq(stores.activationStatus, "pending_activation")));
  const [contractedStores] = await db.select({ count: count() }).from(stores).where(and(...storeConditions, eq(stores.classification, "contracted")));
  const [ezhalhaStores] = await db.select({ count: count() }).from(stores).where(and(...storeConditions, eq(stores.classification, "ezhalha")));
  const [pendingApprovals] = await db.select({ count: count() }).from(approvalRequests).where(eq(approvalRequests.status, "pending_review"));
  const [archivedStores] = await db.select({ count: count() }).from(stores).where(eq(stores.archived, true));
  // Phase 2 stats
  const [totalOrders] = await db.select({ count: count() }).from(orders);
  const [totalCustomers] = await db.select({ count: count() }).from(customers);
  const [totalBookings] = await db.select({ count: count() }).from(bookings);
  const [pendingComplaints] = await db.select({ count: count() }).from(complaints).where(eq(complaints.status, "new"));
  const [pendingRefunds] = await db.select({ count: count() }).from(refunds).where(eq(refunds.status, "pending_review"));
  const [activeCoupons] = await db.select({ count: count() }).from(coupons).where(eq(coupons.status, "active"));
  return {
    totalUsers: totalUsers?.count ?? 0,
    totalEmployees: totalEmployees?.count ?? 0,
    totalMandoubs: totalMandoubs?.count ?? 0,
    totalStores: totalStores?.count ?? 0,
    activeStores: activeStores?.count ?? 0,
    archivedStores: archivedStores?.count ?? 0,
    pendingMandoubs: pendingMandoubs?.count ?? 0,
    pendingStoreActivations: pendingStoreActivations?.count ?? 0,
    contractedStores: contractedStores?.count ?? 0,
    ezhalhaStores: ezhalhaStores?.count ?? 0,
    pendingApprovals: pendingApprovals?.count ?? 0,
    totalOrders: totalOrders?.count ?? 0,
    totalCustomers: totalCustomers?.count ?? 0,
    totalBookings: totalBookings?.count ?? 0,
    pendingComplaints: pendingComplaints?.count ?? 0,
    pendingRefunds: pendingRefunds?.count ?? 0,
    activeCoupons: activeCoupons?.count ?? 0,
  };
}


// ============================================================
// PHASE 2 IMPORTS
// ============================================================
import {
  customers,
  InsertCustomer,
  orders,
  InsertOrder,
  bookings,
  InsertBooking,
  refunds,
  InsertRefund,
  coupons,
  InsertCoupon,
  offers,
  InsertOffer,
  budgets,
  InsertBudget,
  expenses,
  InsertExpense,
  revenues,
  InsertRevenue,
  mandoubDues,
  InsertMandoubDue,
  storeDues,
  InsertStoreDue,
  settlements,
  InsertSettlement,
  complaints,
  InsertComplaint,
} from "../drizzle/schema";

// ============================================================
// CUSTOMER QUERIES
// ============================================================
export async function getAllCustomers(filters?: { wilayatId?: number; status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(customers.archived, false)];
  if (filters?.wilayatId) conditions.push(eq(customers.wilayatId, filters.wilayatId));
  if (filters?.status) conditions.push(eq(customers.status, filters.status as any));
  if (filters?.search) {
    conditions.push(or(
      like(customers.fullName, `%${filters.search}%`),
      like(customers.phone, `%${filters.search}%`),
      like(customers.email, `%${filters.search}%`)
    )!);
  }
  return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) return;
  return db.insert(customers).values(data);
}

export async function updateCustomer(id: number, data: Partial<InsertCustomer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customers).set(data).where(eq(customers.id, id));
}

// ============================================================
// ORDER QUERIES
// ============================================================
export async function getAllOrders(filters?: {
  wilayatId?: number;
  orderType?: string;
  orderStatus?: string;
  paymentStatus?: string;
  storeId?: number;
  customerId?: number;
  assignedMandoubId?: number;
  assignedEmployeeId?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  storeClassification?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(orders.archived, false)];
  if (filters?.wilayatId) conditions.push(eq(orders.wilayatId, filters.wilayatId));
  if (filters?.orderType) conditions.push(eq(orders.orderType, filters.orderType as any));
  if (filters?.orderStatus) conditions.push(eq(orders.orderStatus, filters.orderStatus as any));
  if (filters?.paymentStatus) conditions.push(eq(orders.paymentStatus, filters.paymentStatus as any));
  if (filters?.storeId) conditions.push(eq(orders.storeId, filters.storeId));
  if (filters?.customerId) conditions.push(eq(orders.customerId, filters.customerId));
  if (filters?.assignedMandoubId) conditions.push(eq(orders.assignedMandoubId, filters.assignedMandoubId));
  if (filters?.assignedEmployeeId) conditions.push(eq(orders.assignedEmployeeId, filters.assignedEmployeeId));
  if (filters?.storeClassification) conditions.push(eq(orders.storeClassification, filters.storeClassification as any));
  if (filters?.startDate) conditions.push(gte(orders.orderDate, new Date(filters.startDate)));
  if (filters?.endDate) conditions.push(lte(orders.orderDate, new Date(filters.endDate)));
  if (filters?.search) {
    conditions.push(or(
      like(orders.orderNumber, `%${filters.search}%`),
      like(orders.customerName, `%${filters.search}%`),
      like(orders.customerPhone, `%${filters.search}%`)
    )!);
  }
  return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.orderDate)).limit(500);
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) return;
  return db.insert(orders).values(data);
}

export async function updateOrder(id: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function getOrderCount(filters?: { wilayatId?: number; orderStatus?: string; startDate?: string; endDate?: string }) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [eq(orders.archived, false)];
  if (filters?.wilayatId) conditions.push(eq(orders.wilayatId, filters.wilayatId));
  if (filters?.orderStatus) conditions.push(eq(orders.orderStatus, filters.orderStatus as any));
  if (filters?.startDate) conditions.push(gte(orders.orderDate, new Date(filters.startDate)));
  if (filters?.endDate) conditions.push(lte(orders.orderDate, new Date(filters.endDate)));
  const result = await db.select({ count: count() }).from(orders).where(and(...conditions));
  return result[0]?.count ?? 0;
}

// ============================================================
// BOOKING QUERIES
// ============================================================
export async function getAllBookings(filters?: {
  wilayatId?: number;
  serviceType?: string;
  bookingStatus?: string;
  customerId?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bookings.archived, false)];
  if (filters?.wilayatId) conditions.push(eq(bookings.wilayatId, filters.wilayatId));
  if (filters?.serviceType) conditions.push(eq(bookings.serviceType, filters.serviceType as any));
  if (filters?.bookingStatus) conditions.push(eq(bookings.bookingStatus, filters.bookingStatus as any));
  if (filters?.customerId) conditions.push(eq(bookings.customerId, filters.customerId));
  if (filters?.search) {
    conditions.push(or(
      like(bookings.customerName, `%${filters.search}%`),
      like(bookings.customerPhone, `%${filters.search}%`)
    )!);
  }
  return db.select().from(bookings).where(and(...conditions)).orderBy(desc(bookings.createdAt)).limit(500);
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  if (!db) return;
  return db.insert(bookings).values(data);
}

export async function updateBooking(id: number, data: Partial<InsertBooking>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookings).set(data).where(eq(bookings.id, id));
}

// ============================================================
// REFUND QUERIES
// ============================================================
export async function getAllRefunds(filters?: { status?: string; orderId?: number; bookingId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(refunds.status, filters.status as any));
  if (filters?.orderId) conditions.push(eq(refunds.orderId, filters.orderId));
  if (filters?.bookingId) conditions.push(eq(refunds.bookingId, filters.bookingId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(refunds).where(where).orderBy(desc(refunds.createdAt));
}

export async function getRefundById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(refunds).where(eq(refunds.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRefund(data: InsertRefund) {
  const db = await getDb();
  if (!db) return;
  return db.insert(refunds).values(data);
}

export async function updateRefund(id: number, data: Partial<InsertRefund>) {
  const db = await getDb();
  if (!db) return;
  await db.update(refunds).set(data).where(eq(refunds.id, id));
}

// ============================================================
// COUPON QUERIES
// ============================================================
export async function getAllCoupons(filters?: { status?: string; wilayatId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(coupons.status, filters.status as any));
  if (filters?.wilayatId) conditions.push(eq(coupons.wilayatId, filters.wilayatId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(coupons).where(where).orderBy(desc(coupons.createdAt));
}

export async function getCouponById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) return;
  return db.insert(coupons).values(data);
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) return;
  await db.update(coupons).set(data).where(eq(coupons.id, id));
}

// ============================================================
// OFFER QUERIES
// ============================================================
export async function getAllOffers(filters?: { status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(offers.status, filters.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(offers).where(where).orderBy(desc(offers.createdAt));
}

export async function createOffer(data: InsertOffer) {
  const db = await getDb();
  if (!db) return;
  return db.insert(offers).values(data);
}

export async function updateOffer(id: number, data: Partial<InsertOffer>) {
  const db = await getDb();
  if (!db) return;
  await db.update(offers).set(data).where(eq(offers.id, id));
}

// ============================================================
// BUDGET QUERIES
// ============================================================
export async function getAllBudgets(filters?: { wilayatId?: number; status?: string; feature?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.wilayatId) conditions.push(eq(budgets.wilayatId, filters.wilayatId));
  if (filters?.status) conditions.push(eq(budgets.status, filters.status as any));
  if (filters?.feature) conditions.push(eq(budgets.feature, filters.feature as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(budgets).where(where).orderBy(desc(budgets.createdAt));
}

export async function getBudgetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBudget(data: InsertBudget) {
  const db = await getDb();
  if (!db) return;
  return db.insert(budgets).values(data);
}

export async function updateBudget(id: number, data: Partial<InsertBudget>) {
  const db = await getDb();
  if (!db) return;
  await db.update(budgets).set(data).where(eq(budgets.id, id));
}

// ============================================================
// EXPENSE QUERIES
// ============================================================
export async function getAllExpenses(filters?: { wilayatId?: number; expenseType?: string; approvalStatus?: string; budgetId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.wilayatId) conditions.push(eq(expenses.wilayatId, filters.wilayatId));
  if (filters?.expenseType) conditions.push(eq(expenses.expenseType, filters.expenseType as any));
  if (filters?.approvalStatus) conditions.push(eq(expenses.approvalStatus, filters.approvalStatus as any));
  if (filters?.budgetId) conditions.push(eq(expenses.budgetId, filters.budgetId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(expenses).where(where).orderBy(desc(expenses.createdAt));
}

export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) return;
  return db.insert(expenses).values(data);
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) return;
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

// ============================================================
// REVENUE QUERIES
// ============================================================
export async function getAllRevenues(filters?: { wilayatId?: number; source?: string; storeId?: number; startDate?: string; endDate?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.wilayatId) conditions.push(eq(revenues.wilayatId, filters.wilayatId));
  if (filters?.source) conditions.push(eq(revenues.source, filters.source as any));
  if (filters?.storeId) conditions.push(eq(revenues.storeId, filters.storeId));
  if (filters?.startDate) conditions.push(gte(revenues.revenueDate, new Date(filters.startDate)));
  if (filters?.endDate) conditions.push(lte(revenues.revenueDate, new Date(filters.endDate)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(revenues).where(where).orderBy(desc(revenues.revenueDate));
}

export async function createRevenue(data: InsertRevenue) {
  const db = await getDb();
  if (!db) return;
  return db.insert(revenues).values(data);
}

export async function updateRevenue(id: number, data: Partial<InsertRevenue>) {
  const db = await getDb();
  if (!db) return;
  await db.update(revenues).set(data).where(eq(revenues.id, id));
}

// ============================================================
// MANDOUB DUES QUERIES
// ============================================================
export async function getAllMandoubDues(filters?: { mandoubId?: number; paymentStatus?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.mandoubId) conditions.push(eq(mandoubDues.mandoubId, filters.mandoubId));
  if (filters?.paymentStatus) conditions.push(eq(mandoubDues.paymentStatus, filters.paymentStatus as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(mandoubDues).where(where).orderBy(desc(mandoubDues.createdAt));
}

export async function createMandoubDue(data: InsertMandoubDue) {
  const db = await getDb();
  if (!db) return;
  return db.insert(mandoubDues).values(data);
}

export async function updateMandoubDue(id: number, data: Partial<InsertMandoubDue>) {
  const db = await getDb();
  if (!db) return;
  await db.update(mandoubDues).set(data).where(eq(mandoubDues.id, id));
}

// ============================================================
// STORE DUES QUERIES
// ============================================================
export async function getAllStoreDues(filters?: { storeId?: number; settlementStatus?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.storeId) conditions.push(eq(storeDues.storeId, filters.storeId));
  if (filters?.settlementStatus) conditions.push(eq(storeDues.settlementStatus, filters.settlementStatus as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(storeDues).where(where).orderBy(desc(storeDues.createdAt));
}

export async function createStoreDue(data: InsertStoreDue) {
  const db = await getDb();
  if (!db) return;
  return db.insert(storeDues).values(data);
}

export async function updateStoreDue(id: number, data: Partial<InsertStoreDue>) {
  const db = await getDb();
  if (!db) return;
  await db.update(storeDues).set(data).where(eq(storeDues.id, id));
}

// ============================================================
// SETTLEMENT QUERIES
// ============================================================
export async function getAllSettlements(filters?: { settlementType?: string; status?: string; relatedEntityType?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.settlementType) conditions.push(eq(settlements.settlementType, filters.settlementType as any));
  if (filters?.status) conditions.push(eq(settlements.status, filters.status as any));
  if (filters?.relatedEntityType) conditions.push(eq(settlements.relatedEntityType, filters.relatedEntityType as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(settlements).where(where).orderBy(desc(settlements.createdAt));
}

export async function getSettlementById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(settlements).where(eq(settlements.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSettlement(data: InsertSettlement) {
  const db = await getDb();
  if (!db) return;
  return db.insert(settlements).values(data);
}

export async function updateSettlement(id: number, data: Partial<InsertSettlement>) {
  const db = await getDb();
  if (!db) return;
  await db.update(settlements).set(data).where(eq(settlements.id, id));
}

// ============================================================
// COMPLAINT QUERIES
// ============================================================
export async function getAllComplaints(filters?: { status?: string; complaintType?: string; customerId?: number; storeId?: number; mandoubId?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(complaints.archived, false)];
  if (filters?.status) conditions.push(eq(complaints.status, filters.status as any));
  if (filters?.complaintType) conditions.push(eq(complaints.complaintType, filters.complaintType as any));
  if (filters?.customerId) conditions.push(eq(complaints.customerId, filters.customerId));
  if (filters?.storeId) conditions.push(eq(complaints.storeId, filters.storeId));
  if (filters?.mandoubId) conditions.push(eq(complaints.mandoubId, filters.mandoubId));
  if (filters?.search) {
    conditions.push(or(
      like(complaints.customerName, `%${filters.search}%`),
      like(complaints.customerPhone, `%${filters.search}%`)
    )!);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(complaints).where(where).orderBy(desc(complaints.createdAt));
}

export async function getComplaintById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createComplaint(data: InsertComplaint) {
  const db = await getDb();
  if (!db) return;
  return db.insert(complaints).values(data);
}

export async function updateComplaint(id: number, data: Partial<InsertComplaint>) {
  const db = await getDb();
  if (!db) return;
  await db.update(complaints).set(data).where(eq(complaints.id, id));
}

// ============================================================
// BULK STORE IMPORT
// ============================================================
export async function bulkCreateStores(storesData: InsertStore[]) {
  const db = await getDb();
  if (!db) return;
  if (storesData.length === 0) return;
  // Insert in batches of 50 to avoid query size limits
  for (let i = 0; i < storesData.length; i += 50) {
    const batch = storesData.slice(i, i + 50);
    await db.insert(stores).values(batch);
  }
}

// ============================================================
// PHASE 2 DASHBOARD STATS
// ============================================================
export async function getPhase2DashboardStats(wilayatId?: number) {
  const db = await getDb();
  if (!db) return null;

  const orderConditions = [eq(orders.archived, false)];
  const bookingConditions = [eq(bookings.archived, false)];
  const complaintConditions = [eq(complaints.archived, false)];

  if (wilayatId) {
    orderConditions.push(eq(orders.wilayatId, wilayatId));
    bookingConditions.push(eq(bookings.wilayatId, wilayatId));
  }

  const [totalOrders] = await db.select({ count: count() }).from(orders).where(and(...orderConditions));
  const [newOrders] = await db.select({ count: count() }).from(orders).where(and(...orderConditions, eq(orders.orderStatus, "new")));
  const [completedOrders] = await db.select({ count: count() }).from(orders).where(and(...orderConditions, eq(orders.orderStatus, "completed")));
  const [cancelledOrders] = await db.select({ count: count() }).from(orders).where(and(...orderConditions, or(eq(orders.orderStatus, "cancelled_by_customer"), eq(orders.orderStatus, "cancelled_by_maksab"))!));
  const [totalBookings] = await db.select({ count: count() }).from(bookings).where(and(...bookingConditions));
  const [totalCustomers] = await db.select({ count: count() }).from(customers).where(eq(customers.archived, false));
  const [totalComplaints] = await db.select({ count: count() }).from(complaints).where(and(...complaintConditions));
  const [openComplaints] = await db.select({ count: count() }).from(complaints).where(and(...complaintConditions, or(eq(complaints.status, "new"), eq(complaints.status, "in_progress"))!));
  const [totalCoupons] = await db.select({ count: count() }).from(coupons).where(eq(coupons.status, "active"));
  const [pendingRefunds] = await db.select({ count: count() }).from(refunds).where(eq(refunds.status, "pending_review"));
  const [pendingExpenses] = await db.select({ count: count() }).from(expenses).where(eq(expenses.approvalStatus, "pending_approval"));

  // Sum revenues
  const revenueResult = await db.select({ total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0)` }).from(revenues).where(eq(revenues.status, "recorded"));
  const totalRevenue = revenueResult[0]?.total ?? "0";

  // Sum expenses (approved only)
  const expenseResult = await db.select({ total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0)` }).from(expenses).where(eq(expenses.approvalStatus, "approved"));
  const totalExpenses = expenseResult[0]?.total ?? "0";

  return {
    totalOrders: totalOrders?.count ?? 0,
    newOrders: newOrders?.count ?? 0,
    completedOrders: completedOrders?.count ?? 0,
    cancelledOrders: cancelledOrders?.count ?? 0,
    totalBookings: totalBookings?.count ?? 0,
    totalCustomers: totalCustomers?.count ?? 0,
    totalComplaints: totalComplaints?.count ?? 0,
    openComplaints: openComplaints?.count ?? 0,
    totalCoupons: totalCoupons?.count ?? 0,
    pendingRefunds: pendingRefunds?.count ?? 0,
    pendingExpenses: pendingExpenses?.count ?? 0,
    totalRevenue,
    totalExpenses,
  };
}

// ============================================================
// ROLES QUERIES
// ============================================================
export async function getAllRoles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roles).orderBy(roles.id);
}

export async function getRoleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRoleByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createRole(data: InsertRole) {
  const db = await getDb();
  if (!db) return;
  return db.insert(roles).values(data);
}

export async function updateRole(id: number, data: Partial<InsertRole>) {
  const db = await getDb();
  if (!db) return;
  await db.update(roles).set(data).where(eq(roles.id, id));
}

// ============================================================
// ROLE PERMISSIONS QUERIES
// ============================================================
export async function getRolePermissions(roleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
}

export async function setRolePermissions(roleId: number, permissions: string[]) {
  const db = await getDb();
  if (!db) return;
  // Delete existing permissions for this role
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  // Insert new permissions
  if (permissions.length > 0) {
    const values = permissions.map(p => ({ roleId, permission: p }));
    await db.insert(rolePermissions).values(values);
  }
}

export async function addRolePermission(roleId: number, permission: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(rolePermissions).values({ roleId, permission });
}

export async function removeRolePermission(roleId: number, permission: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(rolePermissions).where(
    and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permission, permission))
  );
}

// ============================================================
// JOB TITLES QUERIES
// ============================================================
export async function getAllJobTitles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobTitles).orderBy(jobTitles.id);
}

export async function getJobTitleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobTitles).where(eq(jobTitles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createJobTitle(data: InsertJobTitle) {
  const db = await getDb();
  if (!db) return;
  return db.insert(jobTitles).values(data);
}

export async function updateJobTitle(id: number, data: Partial<InsertJobTitle>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobTitles).set(data).where(eq(jobTitles.id, id));
}

// ============================================================
// DATA IMPORT HELPERS
// ============================================================
import {
  importBatches,
  InsertImportBatch,
  payments,
  InsertPayment,
} from "../drizzle/schema";

// --- Import Batches ---
export async function createImportBatch(data: Omit<InsertImportBatch, "id">) {
  const db = await getDb();
  if (!db) return { id: 0 };
  const result = await db.insert(importBatches).values(data as any);
  return { id: (result as any)[0]?.insertId ?? 0 };
}

export async function updateImportBatch(id: number, data: Partial<InsertImportBatch>) {
  const db = await getDb();
  if (!db) return;
  await db.update(importBatches).set(data as any).where(eq(importBatches.id, id));
}

export async function getImportBatches(importType?: string, status?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (importType) conditions.push(eq(importBatches.importType, importType as any));
  if (status) conditions.push(eq(importBatches.status, status as any));
  const query = conditions.length > 0
    ? db.select().from(importBatches).where(and(...conditions)).orderBy(desc(importBatches.createdAt)).limit(limit).offset(offset)
    : db.select().from(importBatches).orderBy(desc(importBatches.createdAt)).limit(limit).offset(offset);
  return query;
}

export async function getImportBatchById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(importBatches).where(eq(importBatches.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// --- Payments ---
export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) return;
  return db.insert(payments).values(data);
}

export async function findPaymentByReference(ref: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payments).where(eq(payments.paymentReference, ref)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// --- Lookup helpers for import ---
export async function getAllStoresSimple() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: stores.id, nameAr: stores.nameAr, wilayatId: stores.wilayatId }).from(stores).where(eq(stores.archived, false));
}

export async function findStoreByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(and(eq(stores.archived, false), like(stores.nameAr, name))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findStoreByNameAndWilayat(name: string, wilayatId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(stores.archived, false), like(stores.nameAr, name)];
  if (wilayatId) conditions.push(eq(stores.wilayatId, wilayatId));
  const result = await db.select().from(stores).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findWilayatByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wilayats).where(
    or(like(wilayats.nameAr, name), like(wilayats.nameEn, name))
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findMandoubByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mandoubs).where(eq(mandoubs.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findBookingByNumber(bookingNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  // First try matching by bookingNumber field
  const byNumber = await db.select().from(bookings).where(eq(bookings.bookingNumber, bookingNumber)).limit(1);
  if (byNumber.length > 0) return byNumber[0];
  // Fallback: try matching by id
  const id = parseInt(bookingNumber);
  if (isNaN(id)) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findProductDuplicate(storeId: number, name: string, menuCategory?: string | null) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(products.storeId, storeId), eq(products.name, name), eq(products.archived, false)];
  const result = await db.select().from(products).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findOrCreateMenuCategory(storeId: number, categoryName: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  // Try to find existing
  const existing = await db.select().from(menuCategories)
    .where(and(eq(menuCategories.storeId, storeId), eq(menuCategories.name, categoryName)))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  // Create new
  const result = await db.insert(menuCategories).values({ storeId, name: categoryName } as any);
  return (result as any)[0]?.insertId ?? null;
}

// ============================================================
// PRIORITY 2 IMPORT HELPERS
// ============================================================

import { mandoubPerformance, InsertMandoubPerformance } from "../drizzle/schema";

export async function createMandoubPerformance(data: InsertMandoubPerformance) {
  const db = await getDb();
  if (!db) return { id: 0 };
  const result = await db.insert(mandoubPerformance).values(data as any);
  return { id: (result as any)[0]?.insertId ?? 0 };
}

export async function findMandoubByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mandoubs).where(
    like(mandoubs.fullName, name)
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findMandoubDueDuplicate(mandoubId: number, orderId: number | null, earningType: string) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(mandoubDues.mandoubId, mandoubId), eq(mandoubDues.earningType, earningType as any)];
  if (orderId) conditions.push(eq(mandoubDues.orderId, orderId));
  const result = await db.select().from(mandoubDues).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findMandoubPerformanceDuplicate(mandoubId: number, orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mandoubPerformance).where(
    and(eq(mandoubPerformance.mandoubId, mandoubId), eq(mandoubPerformance.orderNumber, orderNumber))
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findRefundDuplicate(orderId: number | null, bookingId: number | null, refundAmount: string) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [];
  if (orderId) conditions.push(eq(refunds.orderId, orderId));
  if (bookingId) conditions.push(eq(refunds.bookingId, bookingId));
  conditions.push(eq(refunds.refundAmount, refundAmount));
  if (conditions.length < 2) return undefined;
  const result = await db.select().from(refunds).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findRevenueDuplicate(source: string, orderId: number | null, bookingId: number | null, amount: string) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(revenues.source, source as any), eq(revenues.amount, amount)];
  if (orderId) conditions.push(eq(revenues.orderId, orderId));
  if (bookingId) conditions.push(eq(revenues.bookingId, bookingId));
  const result = await db.select().from(revenues).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}



// P3 Helpers
export async function findBudgetByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(budgets).where(like(budgets.name, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// COUPON USAGE QUERIES
// ============================================================
import { couponUsages, InsertCouponUsage } from "../drizzle/schema";

export async function createCouponUsage(data: InsertCouponUsage) {
  const db = await getDb();
  if (!db) return;
  return db.insert(couponUsages).values(data);
}

export async function findCouponUsageDuplicate(couponId: number, orderId: number | null, customerPhone: string | null) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(couponUsages.couponId, couponId)];
  if (orderId) conditions.push(eq(couponUsages.orderId, orderId));
  if (customerPhone) conditions.push(eq(couponUsages.customerPhone, customerPhone));
  if (!orderId && !customerPhone) return undefined; // need at least one identifier
  const result = await db.select().from(couponUsages).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// P3 Duplicate finders
export async function findExpenseDuplicate(expenseType: string, amount: string, expenseDate: Date | null) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(expenses.expenseType, expenseType as any), eq(expenses.amount, amount)];
  if (expenseDate) {
    conditions.push(eq(expenses.expenseDate, expenseDate));
  }
  const result = await db.select().from(expenses).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findStoreDueDuplicate(storeId: number, orderId: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(storeDues.storeId, storeId)];
  if (orderId) conditions.push(eq(storeDues.orderId, orderId));
  else return undefined; // need orderId to identify duplicate
  const result = await db.select().from(storeDues).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findSettlementDuplicate(settlementType: string, relatedEntityName: string | null, amount: string, orderId: number | null) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(settlements.settlementType, settlementType as any), eq(settlements.amount, amount)];
  if (relatedEntityName) conditions.push(eq(settlements.relatedEntityName, relatedEntityName));
  if (orderId) conditions.push(eq(settlements.orderId, orderId));
  const result = await db.select().from(settlements).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findComplaintDuplicate(customerId: number | null, orderId: number | null, complaintType: string) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(complaints.complaintType, complaintType as any)];
  if (customerId) conditions.push(eq(complaints.customerId, customerId));
  if (orderId) conditions.push(eq(complaints.orderId, orderId));
  if (!customerId && !orderId) return undefined;
  const result = await db.select().from(complaints).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findBookingDuplicate(customerPhone: string | null, bookingDate: string | null, serviceType: string) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions: any[] = [eq(bookings.serviceType, serviceType as any), eq(bookings.archived, false)];
  if (customerPhone) conditions.push(eq(bookings.customerPhone, customerPhone));
  if (bookingDate) conditions.push(like(sql`CAST(${bookings.bookingDate} AS CHAR)`, `${bookingDate}%`));
  if (!customerPhone && !bookingDate) return undefined;
  const result = await db.select().from(bookings).where(and(...conditions)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
