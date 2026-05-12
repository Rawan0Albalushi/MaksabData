import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ============================================================
// USERS TABLE - Extended with Maksab roles, permissions, wilayat
// Relationships: users.wilayatId -> wilayats.id, users.managerId -> users.id
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  fullNameWithTribe: varchar("fullNameWithTribe", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Maksab-specific role
  maksabRole: mysqlEnum("maksabRole", [
    "manager",
    "deputy_manager",
    "top_employee_minister",
    "finance_manager",
    "state_employee_minister",
    "employee",
    "mandoub",
  ]),
  jobTitle: varchar("jobTitle", { length: 255 }),
  wilayatId: int("wilayatId"), // -> wilayats.id
  profilePhoto: varchar("profilePhoto", { length: 512 }),
  status: mysqlEnum("status", [
    "active",
    "inactive",
    "pending_approval",
    "suspended",
    "archived",
  ]).default("active").notNull(),
  managerId: int("managerId"), // -> users.id (self-ref)
  permissions: json("permissions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// WILAYATS TABLE - Area/region management
// ============================================================
export const wilayats = mysqlTable("wilayats", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  governorate: varchar("governorate", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Wilayat = typeof wilayats.$inferSelect;
export type InsertWilayat = typeof wilayats.$inferInsert;

// ============================================================
// STORE CATEGORIES TABLE - Dynamic store categories
// ============================================================
export const storeCategories = mysqlTable("store_categories", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoreCategory = typeof storeCategories.$inferSelect;
export type InsertStoreCategory = typeof storeCategories.$inferInsert;

// ============================================================
// EMPLOYEES TABLE - Employee management
// Relationships: employees.userId -> users.id, employees.wilayatId -> wilayats.id, employees.managerId -> employees.id
// ============================================================
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // -> users.id
  fullName: varchar("fullName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  wilayatId: int("wilayatId"), // -> wilayats.id
  maksabRole: mysqlEnum("maksabRole", [
    "manager",
    "deputy_manager",
    "top_employee_minister",
    "finance_manager",
    "state_employee_minister",
    "employee",
  ]),
  jobTitle: varchar("jobTitle", { length: 255 }),
  status: mysqlEnum("status", [
    "active",
    "inactive",
    "pending_approval",
    "suspended",
    "archived",
  ]).default("active").notNull(),
  managerId: int("managerId"), // -> employees.id
  profilePhoto: varchar("profilePhoto", { length: 512 }),
  notes: text("notes"),
  permissions: json("permissions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ============================================================
// MANDOUBS TABLE - Delivery representative management
// Relationships: mandoubs.userId -> users.id, mandoubs.responsibleEmployeeId -> employees.id, mandoubs.wilayatId -> wilayats.id
// ============================================================
export const mandoubs = mysqlTable("mandoubs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // -> users.id
  fullName: varchar("fullName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  wilayatId: int("wilayatId"), // -> wilayats.id
  mandoubType: mysqlEnum("mandoubType", [
    "fast",
    "long_distance",
  ]).notNull(),
  responsibleEmployeeId: int("responsibleEmployeeId"), // -> employees.id
  status: mysqlEnum("status", [
    "pending_approval",
    "active",
    "inactive",
    "rejected",
    "suspended",
    "archived",
  ]).default("pending_approval").notNull(),
  approvedBy: int("approvedBy"), // -> users.id
  profilePhoto: varchar("profilePhoto", { length: 512 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Mandoub = typeof mandoubs.$inferSelect;
export type InsertMandoub = typeof mandoubs.$inferInsert;

// ============================================================
// STORES TABLE - Store/restaurant/shop management
// Relationships: stores.wilayatId -> wilayats.id, stores.responsibleEmployeeId -> employees.id
// ============================================================
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  nameEn: varchar("nameEn", { length: 255 }),
  merchantName: varchar("merchantName", { length: 255 }),
  merchantPhone: varchar("merchantPhone", { length: 20 }),
  whatsappNumber: varchar("whatsappNumber", { length: 20 }),
  category: mysqlEnum("storeCategory", [
    "restaurant",
    "cafe",
    "supermarket",
    "sweets_shop",
    "bakery",
    "store",
    "other",
  ]),
  communicationStatus: mysqlEnum("communicationStatus", [
    "yes",
    "no",
    "no_response",
    "needs_follow_up",
    "not_specified",
  ]),
  merchantApproval: mysqlEnum("merchantApproval", [
    "yes",
    "no",
    "waiting_response",
    "not_specified",
  ]),
  addedInSystem: mysqlEnum("addedInSystem", [
    "yes",
    "no",
    "in_progress",
    "missing_data",
    "not_specified",
  ]),
  activationStatus: mysqlEnum("activationStatus", [
    "active",
    "inactive",
    "temporarily_stopped",
    "hidden",
    "pending_activation",
    "not_specified",
  ]).default("inactive"),
  classification: mysqlEnum("classification", [
    "contracted",
    "ezhalha",
    "not_specified",
  ]).default("not_specified"),
  wilayatId: int("wilayatId"), // -> wilayats.id
  region: varchar("region", { length: 255 }),
  responsibleEmployeeId: int("responsibleEmployeeId"), // -> employees.id
  shortDescription: text("shortDescription"),
  showInApp: boolean("showInApp").default(false),
  notes: text("notes"),
  // Location data
  governorate: varchar("governorate", { length: 255 }),
  detailedAddress: text("detailedAddress"),
  googleMapsLink: varchar("googleMapsLink", { length: 512 }),
  locationNotes: text("locationNotes"),
  // Operation data
  workingDays: varchar("workingDays", { length: 255 }),
  openingTime: varchar("openingTime", { length: 10 }),
  closingTime: varchar("closingTime", { length: 10 }),
  avgPreparationTime: varchar("avgPreparationTime", { length: 50 }),
  acceptsOrdersNow: boolean("acceptsOrdersNow"),
  operationStatus: mysqlEnum("operationStatus", [
    "open",
    "closed",
    "busy",
    "temporarily_not_accepting",
    "not_specified",
  ]),
  operationNotes: text("operationNotes"),
  // Merchant/responsible person
  responsiblePersonName: varchar("responsiblePersonName", { length: 255 }),
  responsiblePersonPhone: varchar("responsiblePersonPhone", { length: 20 }),
  preferredCommunication: mysqlEnum("preferredCommunication", [
    "call",
    "whatsapp",
    "message",
    "not_specified",
  ]),
  communicationNotes: text("communicationNotes"),
  // Contracted store details
  contractStartDate: timestamp("contractStartDate"),
  contractEndDate: timestamp("contractEndDate"),
  contractStatus: mysqlEnum("contractStatus", [
    "active",
    "expired",
    "under_review",
    "not_specified",
  ]),
  commissionPercentage: varchar("commissionPercentage", { length: 10 }),
  orderReceivingMethod: mysqlEnum("orderReceivingMethod", [
    "whatsapp",
    "call",
    "manual_maksab",
    "not_specified",
  ]),
  merchantReceivesDirectly: mysqlEnum("merchantReceivesDirectly", [
    "yes",
    "no",
    "not_specified",
  ]),
  agreementNotes: text("agreementNotes"),
  internalManagementNotes: text("internalManagementNotes"),
  // Ezhalha details
  ezhalhaExecutionMethod: mysqlEnum("ezhalhaExecutionMethod", [
    "call_store",
    "whatsapp_store",
    "direct_order",
    "send_mandoub",
    "not_specified",
  ]),
  ezhalhaPricesConfirmed: mysqlEnum("ezhalhaPricesConfirmed", [
    "confirmed",
    "not_confirmed",
    "approximate",
    "not_specified",
  ]),
  ezhalhaMenuConfirmed: mysqlEnum("ezhalhaMenuConfirmed", [
    "confirmed",
    "not_confirmed",
    "needs_update",
    "not_specified",
  ]),
  ezhalhaLastUpdateDate: timestamp("ezhalhaLastUpdateDate"),
  ezhalhaRequiresReview: boolean("ezhalhaRequiresReview"),
  ezhalhaOperationsNotes: text("ezhalhaOperationsNotes"),
  // Images
  storeLogo: varchar("storeLogo", { length: 512 }),
  coverImage: varchar("coverImage", { length: 512 }),
  // Metadata
  status: mysqlEnum("storeStatus", [
    "active",
    "inactive",
    "pending",
    "archived",
  ]).default("inactive"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

// ============================================================
// STORE IMAGES TABLE
// Relationships: storeImages.storeId -> stores.id
// ============================================================
export const storeImages = mysqlTable("store_images", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(), // -> stores.id
  imageUrl: varchar("imageUrl", { length: 512 }).notNull(),
  imageType: mysqlEnum("imageType", [
    "logo",
    "cover",
    "menu",
    "product",
    "additional",
    "file",
  ]).default("additional"),
  caption: varchar("caption", { length: 255 }),
  title: varchar("title", { length: 255 }),
  sortOrder: int("sortOrder").default(0),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StoreImage = typeof storeImages.$inferSelect;
export type InsertStoreImage = typeof storeImages.$inferInsert;

// ============================================================
// STORE FOLLOW-UP HISTORY TABLE
// Relationships: storeFollowUps.storeId -> stores.id, storeFollowUps.employeeId -> employees.id
// ============================================================
export const storeFollowUps = mysqlTable("store_follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(), // -> stores.id
  employeeId: int("employeeId"), // -> employees.id
  actionType: varchar("actionType", { length: 100 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StoreFollowUp = typeof storeFollowUps.$inferSelect;
export type InsertStoreFollowUp = typeof storeFollowUps.$inferInsert;

// ============================================================
// MENU CATEGORIES TABLE
// Relationships: menuCategories.storeId -> stores.id
// ============================================================
export const menuCategories = mysqlTable("menu_categories", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(), // -> stores.id
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = typeof menuCategories.$inferInsert;

// ============================================================
// PRODUCTS TABLE
// Relationships: products.storeId -> stores.id, products.categoryId -> menuCategories.id
// ============================================================
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(), // -> stores.id
  categoryId: int("categoryId"), // -> menuCategories.id
  name: varchar("name", { length: 255 }).notNull(),
  price: varchar("price", { length: 20 }),
  description: text("description"),
  productImage: varchar("productImage", { length: 512 }),
  productStatus: mysqlEnum("productStatus", [
    "available",
    "not_available",
    "not_specified",
  ]).default("not_specified"),
  showInApp: boolean("showInApp").default(true),
  addons: json("addons"),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ============================================================
// APPROVAL REQUESTS TABLE
// Relationships: approvalRequests.requestedById -> users.id, approvalRequests.reviewedById -> users.id
// ============================================================
export const approvalRequests = mysqlTable("approval_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestType: mysqlEnum("requestType", [
    "profile_edit",
    "mandoub_activation",
    "store_activation",
    "role_change",
    "other",
  ]).notNull(),
  requestedById: int("requestedById").notNull(), // -> users.id
  targetEntityType: varchar("targetEntityType", { length: 50 }),
  targetEntityId: int("targetEntityId"),
  oldData: json("oldData"),
  newData: json("newData"),
  status: mysqlEnum("approvalStatus", [
    "pending_review",
    "approved",
    "rejected",
    "needs_changes",
    "cancelled",
  ]).default("pending_review").notNull(),
  reviewedById: int("reviewedById"), // -> users.id
  reviewDate: timestamp("reviewDate"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;

// ============================================================
// NOTIFICATIONS TABLE
// Relationships: notifications.userId -> users.id
// ============================================================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // -> users.id
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  type: mysqlEnum("notificationType", [
    "approval_request",
    "approval_result",
    "activation",
    "deactivation",
    "general",
  ]).default("general"),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================
// AUDIT LOG TABLE
// Relationships: auditLogs.userId -> users.id
// ============================================================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // -> users.id
  userName: varchar("userName", { length: 255 }),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  oldValues: json("oldValues"),
  newValues: json("newValues"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;


// ============================================================
// PHASE 2 TABLES
// ============================================================

// ============================================================
// CUSTOMERS TABLE
// Relationships: customers.wilayatId -> wilayats.id
// ============================================================
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  wilayatId: int("wilayatId"),
  address: text("address"),
  savedLocations: json("savedLocations"),
  notes: text("notes"),
  status: mysqlEnum("customerStatus", [
    "active",
    "blocked",
    "needs_review",
    "archived",
  ]).default("active").notNull(),
  totalOrders: int("totalOrders").default(0),
  totalBookings: int("totalBookings").default(0),
  lastOrderDate: timestamp("lastOrderDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============================================================
// ORDERS TABLE
// Relationships: orders.customerId -> customers.id, orders.storeId -> stores.id,
//   orders.assignedMandoubId -> mandoubs.id, orders.assignedEmployeeId -> employees.id,
//   orders.wilayatId -> wilayats.id, orders.couponId -> coupons.id,
//   orders.createdById -> users.id, orders.updatedById -> users.id
// ============================================================
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  orderDate: timestamp("orderDate").defaultNow().notNull(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerWilayat: varchar("customerWilayat", { length: 255 }),
  customerAddress: text("customerAddress"),
  deliveryAddress: text("deliveryAddress"),
  deliveryNotes: text("deliveryNotes"),
  orderType: mysqlEnum("orderType", [
    "restaurant",
    "cafe",
    "shop",
    "ezhalha",
    "contracted",
    "long_distance",
    "customer_to_customer",
    "booking",
    "other",
  ]).notNull(),
  storeId: int("storeId"),
  storeClassification: mysqlEnum("storeClassification", [
    "contracted",
    "ezhalha",
    "not_specified",
  ]).default("not_specified"),
  assignedEmployeeId: int("assignedEmployeeId"),
  assignedMandoubId: int("assignedMandoubId"),
  mandoubType: mysqlEnum("orderMandoubType", [
    "fast",
    "long_distance",
  ]),
  wilayatId: int("wilayatId"),
  orderItems: text("orderItems"),
  orderDescription: text("orderDescription"),
  orderAmount: varchar("orderAmount", { length: 20 }).default("0"),
  deliveryFee: varchar("deliveryFee", { length: 20 }).default("0"),
  discountAmount: varchar("discountAmount", { length: 20 }).default("0"),
  couponId: int("couponId"),
  totalPaidByCustomer: varchar("totalPaidByCustomer", { length: 20 }).default("0"),
  paymentMethod: mysqlEnum("paymentMethod", [
    "in_app",
    "cash",
    "bank_transfer",
    "card",
    "other",
  ]),
  paymentStatus: mysqlEnum("paymentStatus", [
    "paid",
    "not_paid",
    "partially_paid",
    "refunded",
    "partially_refunded",
    "failed",
    "needs_review",
  ]).default("not_paid"),
  orderStatus: mysqlEnum("orderStatus", [
    "new",
    "under_review",
    "accepted",
    "contacting_store",
    "waiting_store_confirmation",
    "store_confirmed",
    "store_rejected",
    "preparing",
    "ready_for_pickup",
    "waiting_for_mandoub",
    "mandoub_accepted",
    "mandoub_rejected",
    "with_mandoub",
    "on_the_way",
    "delivered",
    "completed",
    "cancelled_by_customer",
    "cancelled_by_maksab",
    "failed",
    "needs_financial_review",
    "refunded",
    "partially_refunded",
    "archived",
  ]).default("new").notNull(),
  internalNotes: text("internalNotes"),
  customerNotes: text("customerNotes"),
  // Ezhalha-specific fields
  ezhalhaStoreContactMethod: mysqlEnum("ezhalhaStoreContactMethod", [
    "call",
    "whatsapp",
    "direct_order",
    "send_mandoub",
    "other",
  ]),
  ezhalhaStoreContacted: boolean("ezhalhaStoreContacted"),
  ezhalhaAvailabilityConfirmed: boolean("ezhalhaAvailabilityConfirmed"),
  ezhalhaPricesConfirmed: boolean("ezhalhaPricesConfirmed"),
  ezhalhaPriceDifference: boolean("ezhalhaPriceDifference"),
  ezhalhaPriceDiffAmount: varchar("ezhalhaPriceDiffAmount", { length: 20 }),
  ezhalhaPriceDiffCoveredBy: mysqlEnum("ezhalhaPriceDiffCoveredBy", [
    "maksab",
    "customer",
    "store",
    "other",
  ]),
  ezhalhaMaksabPaidToStore: varchar("ezhalhaMaksabPaidToStore", { length: 20 }),
  ezhalhaMaksabPurchasedUpfront: boolean("ezhalhaMaksabPurchasedUpfront"),
  ezhalhaMandoubPickupConfirmed: boolean("ezhalhaMandoubPickupConfirmed"),
  ezhalhaOperationsNotes: text("ezhalhaOperationsNotes"),
  ezhalhaNeedsReview: boolean("ezhalhaNeedsReview"),
  // Contracted store fields
  contractedCommissionPct: varchar("contractedCommissionPct", { length: 10 }),
  contractedStoreSalesAmount: varchar("contractedStoreSalesAmount", { length: 20 }),
  contractedMaksabCommission: varchar("contractedMaksabCommission", { length: 20 }),
  contractedStoreDueAmount: varchar("contractedStoreDueAmount", { length: 20 }),
  contractedMandoubDueAmount: varchar("contractedMandoubDueAmount", { length: 20 }),
  contractedSettlementStatus: mysqlEnum("contractedSettlementStatus", [
    "unsettled",
    "partially_settled",
    "settled",
    "under_review",
  ]),
  contractedOrderReceivingMethod: mysqlEnum("contractedOrderReceivingMethod", [
    "whatsapp",
    "call",
    "manual_maksab",
    "other",
  ]),
  // Long-distance fields
  pickupWilayatId: int("pickupWilayatId"),
  deliveryWilayatId: int("deliveryWilayatId"),
  pickupAddress: text("pickupAddress"),
  longDistDeliveryAddress: text("longDistDeliveryAddress"),
  receiverName: varchar("receiverName", { length: 255 }),
  receiverPhone: varchar("receiverPhone", { length: 20 }),
  itemDescription: text("itemDescription"),
  itemValue: varchar("itemValue", { length: 20 }),
  longDistDeliveryPrice: varchar("longDistDeliveryPrice", { length: 20 }),
  longDistMandoubEarning: varchar("longDistMandoubEarning", { length: 20 }),
  longDistCompanyProfit: varchar("longDistCompanyProfit", { length: 20 }),
  // Financial summary
  mandoubEarning: varchar("mandoubEarning", { length: 20 }),
  companyCoveredAmount: varchar("companyCoveredAmount", { length: 20 }),
  netProfitForMaksab: varchar("netProfitForMaksab", { length: 20 }),
  createdById: int("createdById"),
  updatedById: int("updatedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ============================================================
// BOOKINGS TABLE
// Relationships: bookings.customerId -> customers.id, bookings.wilayatId -> wilayats.id,
//   bookings.assignedEmployeeId -> employees.id
// ============================================================
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingNumber: varchar("bookingNumber", { length: 50 }).unique(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  serviceType: mysqlEnum("serviceType", [
    "turf_field",
    "grass_field",
    "wedding_hall",
    "other",
  ]).notNull(),
  serviceProviderName: varchar("serviceProviderName", { length: 255 }),
  wilayatId: int("wilayatId"),
  bookingDate: timestamp("bookingDate").notNull(),
  startTime: varchar("startTime", { length: 10 }),
  endTime: varchar("endTime", { length: 10 }),
  totalAmount: varchar("totalAmount", { length: 20 }).default("0"),
  depositAmount: varchar("depositAmount", { length: 20 }).default("0"),
  remainingAmount: varchar("remainingAmount", { length: 20 }).default("0"),
  paymentMethod: mysqlEnum("bookingPaymentMethod", [
    "in_app",
    "cash",
    "bank_transfer",
    "card",
    "other",
  ]),
  paymentStatus: mysqlEnum("bookingPaymentStatus", [
    "paid",
    "not_paid",
    "partially_paid",
    "refunded",
    "partially_refunded",
  ]).default("not_paid"),
  bookingStatus: mysqlEnum("bookingStatus", [
    "new",
    "waiting_confirmation",
    "confirmed",
    "completed",
    "cancelled",
    "rejected",
    "needs_follow_up",
    "refunded",
    "partially_refunded",
  ]).default("new").notNull(),
  assignedEmployeeId: int("assignedEmployeeId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ============================================================
// REFUNDS TABLE
// Relationships: refunds.orderId -> orders.id, refunds.bookingId -> bookings.id,
//   refunds.reviewedById -> users.id
// ============================================================
export const refunds = mysqlTable("refunds", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"),
  bookingId: int("bookingId"),
  reason: text("reason"),
  paidAmount: varchar("paidAmount", { length: 20 }).default("0"),
  refundAmount: varchar("refundAmount", { length: 20 }).default("0"),
  refundType: mysqlEnum("refundType", [
    "full",
    "partial",
    "none",
  ]).notNull(),
  whoCausedIssue: mysqlEnum("whoCausedIssue", [
    "customer",
    "store",
    "mandoub",
    "maksab",
    "other",
  ]),
  whoCoversDifference: mysqlEnum("whoCoversDifference", [
    "maksab",
    "customer",
    "store",
    "mandoub",
    "not_specified",
  ]),
  mandoubOwedMoney: boolean("mandoubOwedMoney").default(false),
  storeOwedMoney: boolean("storeOwedMoney").default(false),
  companyCoveredAmount: varchar("companyCoveredAmount", { length: 20 }).default("0"),
  status: mysqlEnum("refundStatus", [
    "pending_review",
    "approved",
    "rejected",
    "completed",
    "cancelled",
  ]).default("pending_review").notNull(),
  reviewedById: int("reviewedById"),
  reviewNotes: text("reviewNotes"),
  attachments: json("attachments"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = typeof refunds.$inferInsert;

// ============================================================
// COUPONS TABLE
// Relationships: coupons.wilayatId -> wilayats.id, coupons.linkedStoreId -> stores.id
// ============================================================
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  discountType: mysqlEnum("discountType", [
    "fixed",
    "percentage",
    "free_delivery",
  ]).notNull(),
  discountValue: varchar("discountValue", { length: 20 }).default("0"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  wilayatId: int("wilayatId"),
  linkedStoreId: int("linkedStoreId"),
  linkedFeature: varchar("linkedFeature", { length: 100 }),
  whoBearsCost: mysqlEnum("whoBearsCost", [
    "maksab",
    "store",
    "shared",
  ]).default("maksab"),
  usageCount: int("usageCount").default(0),
  usageLimit: int("usageLimit"),
  perCustomerLimit: int("perCustomerLimit"),
  minimumOrderAmount: varchar("minimumOrderAmount", { length: 20 }),
  status: mysqlEnum("couponStatus", [
    "active",
    "inactive",
    "expired",
    "archived",
  ]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// ============================================================
// OFFERS TABLE
// Relationships: offers.linkedStoreId -> stores.id
// ============================================================
export const offers = mysqlTable("offers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  linkedStoreId: int("linkedStoreId"),
  linkedFeature: varchar("linkedFeature", { length: 100 }),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("offerStatus", [
    "active",
    "inactive",
    "expired",
    "archived",
  ]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

// ============================================================
// BUDGETS TABLE
// Relationships: budgets.wilayatId -> wilayats.id, budgets.responsibleUserId -> users.id
// ============================================================
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  feature: mysqlEnum("budgetFeature", [
    "ezhalha",
    "marketing",
    "delivery",
    "training",
    "special_tasks",
    "operations",
    "other",
  ]).notNull(),
  wilayatId: int("wilayatId"),
  approvedAmount: varchar("approvedAmount", { length: 20 }).default("0").notNull(),
  spentAmount: varchar("spentAmount", { length: 20 }).default("0").notNull(),
  remainingAmount: varchar("remainingAmount", { length: 20 }).default("0").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("budgetStatus", [
    "active",
    "ended",
    "suspended",
    "exceeded",
    "near_limit",
    "not_specified",
  ]).default("active").notNull(),
  responsibleUserId: int("responsibleUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ============================================================
// EXPENSES TABLE
// Relationships: expenses.budgetId -> budgets.id, expenses.wilayatId -> wilayats.id,
//   expenses.registeredById -> users.id, expenses.approvedById -> users.id
// ============================================================
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseDate: timestamp("expenseDate").defaultNow().notNull(),
  feature: varchar("feature", { length: 100 }),
  wilayatId: int("wilayatId"),
  budgetId: int("budgetId"),
  expenseType: mysqlEnum("expenseType", [
    "purchase",
    "operations",
    "mandoub",
    "service",
    "marketing",
    "training",
    "price_difference",
    "refund",
    "other",
  ]).notNull(),
  amount: varchar("amount", { length: 20 }).default("0").notNull(),
  paymentMethod: mysqlEnum("expensePaymentMethod", [
    "cash",
    "bank_transfer",
    "card",
    "other",
  ]),
  reason: text("reason"),
  beneficiaryType: mysqlEnum("beneficiaryType", [
    "store",
    "mandoub",
    "employee",
    "customer",
    "service_provider",
    "other",
  ]),
  beneficiaryId: int("beneficiaryId"),
  beneficiaryName: varchar("beneficiaryName", { length: 255 }),
  registeredById: int("registeredById"),
  approvalStatus: mysqlEnum("expenseApprovalStatus", [
    "pending_approval",
    "approved",
    "rejected",
    "needs_review",
    "cancelled",
  ]).default("pending_approval").notNull(),
  approvedById: int("approvedById"),
  approvalDate: timestamp("approvalDate"),
  attachments: json("attachments"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ============================================================
// REVENUES TABLE
// Relationships: revenues.orderId -> orders.id, revenues.bookingId -> bookings.id,
//   revenues.storeId -> stores.id, revenues.wilayatId -> wilayats.id,
//   revenues.registeredById -> users.id
// ============================================================
export const revenues = mysqlTable("revenues", {
  id: int("id").autoincrement().primaryKey(),
  revenueDate: timestamp("revenueDate").defaultNow().notNull(),
  source: mysqlEnum("revenueSource", [
    "order",
    "booking",
    "delivery_fee",
    "store_commission",
    "other",
  ]).notNull(),
  orderId: int("orderId"),
  bookingId: int("bookingId"),
  storeId: int("storeId"),
  wilayatId: int("wilayatId"),
  amount: varchar("amount", { length: 20 }).default("0").notNull(),
  paymentMethod: mysqlEnum("revenuePaymentMethod", [
    "in_app",
    "cash",
    "bank_transfer",
    "card",
    "other",
  ]),
  registeredById: int("registeredById"),
  notes: text("notes"),
  status: mysqlEnum("revenueStatus", [
    "recorded",
    "cancelled",
    "adjusted",
    "archived",
  ]).default("recorded").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Revenue = typeof revenues.$inferSelect;
export type InsertRevenue = typeof revenues.$inferInsert;

// ============================================================
// MANDOUB DUES TABLE
// Relationships: mandoubDues.mandoubId -> mandoubs.id, mandoubDues.orderId -> orders.id
// ============================================================
export const mandoubDues = mysqlTable("mandoub_dues", {
  id: int("id").autoincrement().primaryKey(),
  mandoubId: int("mandoubId").notNull(),
  earningType: mysqlEnum("earningType", [
    "per_order",
    "daily",
    "weekly",
    "monthly",
    "bonus",
    "adjustment",
  ]).notNull(),
  orderId: int("orderId"),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  amount: varchar("amount", { length: 20 }).default("0").notNull(),
  paidAmount: varchar("paidAmount", { length: 20 }).default("0").notNull(),
  remainingAmount: varchar("remainingAmount", { length: 20 }).default("0").notNull(),
  paymentStatus: mysqlEnum("mandoubPaymentStatus", [
    "unpaid",
    "paid",
    "partial",
    "under_review",
  ]).default("unpaid").notNull(),
  paymentDate: timestamp("paymentDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MandoubDue = typeof mandoubDues.$inferSelect;
export type InsertMandoubDue = typeof mandoubDues.$inferInsert;

// ============================================================
// STORE DUES TABLE
// Relationships: storeDues.storeId -> stores.id, storeDues.orderId -> orders.id
// ============================================================
export const storeDues = mysqlTable("store_dues", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  orderId: int("orderId"),
  totalSalesAmount: varchar("totalSalesAmount", { length: 20 }).default("0"),
  commissionPercentage: varchar("commissionPercentage", { length: 10 }),
  commissionAmount: varchar("commissionAmount", { length: 20 }).default("0"),
  storeDueAmount: varchar("storeDueAmount", { length: 20 }).default("0"),
  paidAmount: varchar("paidAmount", { length: 20 }).default("0"),
  remainingAmount: varchar("remainingAmount", { length: 20 }).default("0"),
  settlementStatus: mysqlEnum("storeDueSettlementStatus", [
    "unsettled",
    "partially_settled",
    "settled",
    "under_review",
  ]).default("unsettled").notNull(),
  settlementDate: timestamp("settlementDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoreDue = typeof storeDues.$inferSelect;
export type InsertStoreDue = typeof storeDues.$inferInsert;

// ============================================================
// SETTLEMENTS TABLE
// Relationships: settlements.relatedEntityId -> (mandoubs|stores|customers|employees).id,
//   settlements.orderId -> orders.id, settlements.bookingId -> bookings.id,
//   settlements.registeredById -> users.id, settlements.approvedById -> users.id
// ============================================================
export const settlements = mysqlTable("settlements", {
  id: int("id").autoincrement().primaryKey(),
  settlementType: mysqlEnum("settlementType", [
    "mandoub",
    "store",
    "internal",
    "refund",
    "ezhalha_price_diff",
    "other",
  ]).notNull(),
  relatedEntityType: mysqlEnum("settlementEntityType", [
    "mandoub",
    "store",
    "customer",
    "employee",
    "other",
  ]),
  relatedEntityId: int("relatedEntityId"),
  relatedEntityName: varchar("relatedEntityName", { length: 255 }),
  orderId: int("orderId"),
  bookingId: int("bookingId"),
  amount: varchar("amount", { length: 20 }).default("0").notNull(),
  reason: text("reason"),
  status: mysqlEnum("settlementStatus", [
    "pending",
    "approved",
    "completed",
    "rejected",
    "cancelled",
  ]).default("pending").notNull(),
  settlementDate: timestamp("settlementDate"),
  registeredById: int("registeredById"),
  approvedById: int("approvedById"),
  notes: text("notes"),
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;

// ============================================================
// COMPLAINTS TABLE
// Relationships: complaints.customerId -> customers.id, complaints.orderId -> orders.id,
//   complaints.bookingId -> bookings.id, complaints.storeId -> stores.id,
//   complaints.mandoubId -> mandoubs.id, complaints.assignedEmployeeId -> employees.id
// ============================================================
export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  orderId: int("orderId"),
  bookingId: int("bookingId"),
  storeId: int("storeId"),
  mandoubId: int("mandoubId"),
  complaintType: mysqlEnum("complaintType", [
    "customer_complaint",
    "mandoub_complaint",
    "store_complaint",
    "order_issue",
    "payment_issue",
    "delay",
    "refund_request",
    "booking_issue",
    "other",
  ]).notNull(),
  description: text("description"),
  assignedEmployeeId: int("assignedEmployeeId"),
  status: mysqlEnum("complaintStatus", [
    "new",
    "in_progress",
    "resolved",
    "rejected",
    "escalated",
    "closed",
  ]).default("new").notNull(),
  resolutionNotes: text("resolutionNotes"),
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  archived: boolean("archived").default(false).notNull(),
});

export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;

// ============================================================
// ROLES TABLE - Dynamic role management
// ============================================================
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 100 }).notNull(),
  nameEn: varchar("nameEn", { length: 100 }).notNull(),
  description: text("description"),
  isSystemRole: boolean("isSystemRole").default(false).notNull(), // protected roles cannot be deleted
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ============================================================
// ROLE PERMISSIONS TABLE
// Relationships: rolePermissions.roleId -> roles.id
// ============================================================
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(), // -> roles.id
  permission: varchar("permission", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// ============================================================
// JOB TITLES TABLE
// ============================================================
export const jobTitles = mysqlTable("job_titles", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: varchar("nameAr", { length: 100 }).notNull(),
  nameEn: varchar("nameEn", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobTitle = typeof jobTitles.$inferSelect;
export type InsertJobTitle = typeof jobTitles.$inferInsert;

// ============================================================
// IMPORT BATCHES TABLE - Tracks all data import operations
// Relationships: importBatches.uploadedById -> users.id
// ============================================================
export const importBatches = mysqlTable("import_batches", {
  id: int("id").autoincrement().primaryKey(),
  importType: mysqlEnum("importType", [
    "stores",
    "menu_products",
    "customers",
    "orders",
    "payments",
    "mandoubs",
    "mandoub_performance",
    "mandoub_dues",
    "refunds",
    "revenues",
    "bookings",
    "coupons",
    "expenses",
    "store_dues",
    "settlements",
    "complaints",
    "coupon_usage",
  ]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  uploadedById: int("uploadedById").notNull(), // -> users.id
  uploadedByName: varchar("uploadedByName", { length: 255 }),
  totalRows: int("totalRows").default(0).notNull(),
  importedRows: int("importedRows").default(0).notNull(),
  skippedRows: int("skippedRows").default(0).notNull(),
  duplicateRows: int("duplicateRows").default(0).notNull(),
  status: mysqlEnum("importBatchStatus", [
    "pending_preview",
    "imported",
    "imported_with_errors",
    "failed",
    "cancelled",
  ]).default("pending_preview").notNull(),
  errorSummary: json("errorSummary"),
  duplicateHandling: mysqlEnum("duplicateHandling", [
    "skip",
    "import_anyway",
    "update_existing",
  ]).default("skip"),
  validRowsData: json("validRowsData"), // Stores ALL valid rows for import (not just preview)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = typeof importBatches.$inferInsert;

// ============================================================
// PAYMENTS TABLE - Tracks payment transactions
// Relationships: payments.orderId -> orders.id, payments.bookingId -> bookings.id,
//   payments.customerId -> customers.id, payments.importBatchId -> importBatches.id
// ============================================================
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  paymentReference: varchar("paymentReference", { length: 100 }),
  orderId: int("orderId"), // -> orders.id
  bookingId: int("bookingId"), // -> bookings.id
  customerId: int("customerId"), // -> customers.id
  amount: varchar("amount", { length: 20 }).default("0").notNull(),
  paymentMethod: mysqlEnum("pmtMethod", [
    "in_app_payment",
    "cash",
    "bank_transfer",
    "card",
    "other",
  ]),
  paymentStatus: mysqlEnum("pmtStatus", [
    "paid",
    "not_paid",
    "partially_paid",
    "refunded",
    "partially_refunded",
    "failed",
    "needs_review",
  ]).default("not_paid").notNull(),
  paymentDate: timestamp("paymentDate"),
  isRefunded: boolean("isRefunded").default(false),
  refundAmount: varchar("refundAmount", { length: 20 }),
  notes: text("notes"),
  importBatchId: int("importBatchId"), // -> importBatches.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================
// MANDOUB PERFORMANCE TABLE - Tracks delivery performance per order
// Relationships: mandoubPerformance.mandoubId -> mandoubs.id, mandoubPerformance.orderId -> orders.id
// ============================================================
export const mandoubPerformance = mysqlTable("mandoub_performance", {
  id: int("id").autoincrement().primaryKey(),
  mandoubId: int("mandoubId").notNull(), // -> mandoubs.id
  orderId: int("orderId"), // -> orders.id
  orderNumber: varchar("orderNumber", { length: 100 }),
  orderDate: timestamp("orderDate"),
  acceptedAt: timestamp("acceptedAt"),
  pickedUpAt: timestamp("pickedUpAt"),
  deliveredAt: timestamp("deliveredAt"),
  deliveryDurationMinutes: int("deliveryDurationMinutes"),
  orderStatus: varchar("orderStatus", { length: 50 }),
  delayed: boolean("delayed").default(false),
  performanceRating: varchar("performanceRating", { length: 20 }),
  notes: text("notes"),
  importBatchId: int("importBatchId"), // -> importBatches.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MandoubPerformance = typeof mandoubPerformance.$inferSelect;
export type InsertMandoubPerformance = typeof mandoubPerformance.$inferInsert;

// ============================================================
// COUPON USAGES TABLE
// Relationships: couponUsages.couponId -> coupons.id, couponUsages.orderId -> orders.id,
//   couponUsages.customerId -> customers.id
// ============================================================
export const couponUsages = mysqlTable("coupon_usages", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(),
  couponCode: varchar("couponCode", { length: 100 }).notNull(),
  orderId: int("orderId"),
  orderNumber: varchar("orderNumber", { length: 100 }),
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  discountAmount: varchar("discountAmount", { length: 20 }).default("0"),
  discountBearer: mysqlEnum("discountBearer", ["maksab", "store", "shared"]).default("maksab"),
  usageDate: timestamp("usageDate"),
  notes: text("notes"),
  importBatchId: int("importBatchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CouponUsage = typeof couponUsages.$inferSelect;
export type InsertCouponUsage = typeof couponUsages.$inferInsert;
