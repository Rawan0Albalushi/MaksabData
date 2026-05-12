/**
 * Shared normalization utilities for data import.
 * Maps Arabic/English values to database enum values.
 */

// ============================================================
// STORE NORMALIZATION
// ============================================================

export const STORE_CATEGORY_MAP: Record<string, string> = {
  "مطعم": "restaurant", "restaurant": "restaurant",
  "كوفي": "cafe", "cafe": "cafe", "coffee": "cafe",
  "سوبرماركت": "supermarket", "supermarket": "supermarket",
  "محل حلويات": "sweets_shop", "sweets shop": "sweets_shop", "sweets_shop": "sweets_shop",
  "مخبز": "bakery", "bakery": "bakery",
  "متجر": "store", "store": "store",
  "غيره": "other", "other": "other",
};

export const CLASSIFICATION_MAP: Record<string, string> = {
  "عقود": "contracted", "عقد": "contracted", "contracted": "contracted",
  "ازهلها": "ezhalha", "ezhalha": "ezhalha",
};

export const COMMUNICATION_STATUS_MAP: Record<string, string> = {
  "نعم": "yes", "yes": "yes",
  "لا": "no", "no": "no",
  "لم يتم الرد": "no_response", "no response": "no_response", "no_response": "no_response",
  "يحتاج متابعة": "needs_follow_up", "needs follow-up": "needs_follow_up", "needs_follow_up": "needs_follow_up",
  "غير محدد": "not_specified", "not specified": "not_specified", "not_specified": "not_specified",
};

export const MERCHANT_APPROVAL_MAP: Record<string, string> = {
  "نعم": "yes", "yes": "yes",
  "لا": "no", "no": "no",
  "بانتظار الرد": "waiting_response", "waiting response": "waiting_response", "waiting_response": "waiting_response",
  "غير محدد": "not_specified", "not specified": "not_specified", "not_specified": "not_specified",
};

export const ADDED_IN_SYSTEM_MAP: Record<string, string> = {
  "نعم": "yes", "yes": "yes",
  "لا": "no", "no": "no",
  "قيد الإضافة": "in_progress", "in progress": "in_progress", "in_progress": "in_progress",
  "بيانات ناقصة": "missing_data", "missing data": "missing_data", "missing_data": "missing_data",
  "غير محدد": "not_specified", "not specified": "not_specified", "not_specified": "not_specified",
};

export const ACTIVATION_STATUS_MAP: Record<string, string> = {
  "نعم": "active", "مفعل": "active", "active": "active",
  "لا": "inactive", "غير مفعل": "inactive", "inactive": "inactive",
  "بانتظار التفعيل": "pending_activation", "pending activation": "pending_activation", "pending_activation": "pending_activation",
  "مخفي": "hidden", "hidden": "hidden",
  "موقوف مؤقتًا": "temporarily_stopped", "temporarily stopped": "temporarily_stopped", "temporarily_stopped": "temporarily_stopped",
  "غير محدد": "not_specified", "not specified": "not_specified", "not_specified": "not_specified",
};

// ============================================================
// PRODUCT NORMALIZATION
// ============================================================

export const PRODUCT_STATUS_MAP: Record<string, string> = {
  "متوفر": "available", "available": "available",
  "غير متوفر": "unavailable", "not available": "unavailable", "unavailable": "unavailable",
};

export const SHOW_IN_APP_MAP: Record<string, boolean> = {
  "نعم": true, "yes": true, "true": true, "1": true,
  "لا": false, "no": false, "false": false, "0": false,
};

// ============================================================
// CUSTOMER NORMALIZATION
// ============================================================

export const CUSTOMER_STATUS_MAP: Record<string, string> = {
  "نشط": "active", "active": "active",
  "محظور": "blocked", "blocked": "blocked",
  "يحتاج مراجعة": "needs_review", "needs review": "needs_review", "needs_review": "needs_review",
  "مؤرشف": "archived", "archived": "archived",
};

// ============================================================
// ORDER NORMALIZATION
// ============================================================

export const ORDER_TYPE_MAP: Record<string, string> = {
  "طلب مطعم": "restaurant", "restaurant": "restaurant",
  "طلب كوفي": "cafe", "cafe": "cafe",
  "طلب محل": "shop", "shop": "shop",
  "ازهلها": "ezhalha", "ezhalha": "ezhalha",
  "عقود": "contracted", "contracted": "contracted",
  "مسافات طويلة": "long_distance", "long distance": "long_distance", "long_distance": "long_distance",
  "زبون إلى زبون": "customer_to_customer", "customer to customer": "customer_to_customer", "customer_to_customer": "customer_to_customer",
  "حجز": "booking", "booking": "booking",
};

export const ORDER_STATUS_MAP: Record<string, string> = {
  "جديد": "new", "new": "new",
  "قيد المراجعة": "under_review", "under_review": "under_review",
  "مقبول": "accepted", "accepted": "accepted",
  "جاري التواصل مع المحل": "contacting_store", "contacting_store": "contacting_store",
  "بانتظار تأكيد المحل": "waiting_store_confirmation", "waiting_store_confirmation": "waiting_store_confirmation",
  "المحل أكد": "store_confirmed", "store_confirmed": "store_confirmed",
  "المحل رفض": "store_rejected", "store_rejected": "store_rejected",
  "قيد التحضير": "preparing", "preparing": "preparing",
  "جاهز للاستلام": "ready_for_pickup", "ready_for_pickup": "ready_for_pickup",
  "بانتظار المندوب": "waiting_for_mandoub", "waiting_for_mandoub": "waiting_for_mandoub",
  "المندوب قبل": "mandoub_accepted", "mandoub_accepted": "mandoub_accepted",
  "المندوب رفض": "mandoub_rejected", "mandoub_rejected": "mandoub_rejected",
  "مع المندوب": "with_mandoub", "with_mandoub": "with_mandoub",
  "في الطريق": "on_the_way", "on_the_way": "on_the_way",
  "تم التوصيل": "delivered", "delivered": "delivered",
  "مكتمل": "completed", "completed": "completed",
  "العميل ألغى": "cancelled_by_customer", "cancelled_by_customer": "cancelled_by_customer",
  "مكسب ألغى": "cancelled_by_maksab", "cancelled_by_maksab": "cancelled_by_maksab",
  "فشل": "failed", "failed": "failed",
  "يحتاج مراجعة مالية": "needs_financial_review", "needs_financial_review": "needs_financial_review",
  "مسترجع": "refunded", "refunded": "refunded",
  "مسترجع جزئيًا": "partially_refunded", "partially_refunded": "partially_refunded",
  "مؤرشف": "archived", "archived": "archived",
};

export const PAYMENT_STATUS_MAP: Record<string, string> = {
  "مدفوع": "paid", "paid": "paid",
  "غير مدفوع": "not_paid", "not paid": "not_paid", "not_paid": "not_paid",
  "مدفوع جزئيًا": "partially_paid", "partially paid": "partially_paid", "partially_paid": "partially_paid",
  "مسترجع": "refunded", "refunded": "refunded",
  "مسترجع جزئيًا": "partially_refunded", "partially refunded": "partially_refunded", "partially_refunded": "partially_refunded",
  "فشل": "failed", "failed": "failed",
  "يحتاج مراجعة": "needs_review", "needs review": "needs_review", "needs_review": "needs_review",
};

// For orders table (uses 'in_app')
export const PAYMENT_METHOD_MAP: Record<string, string> = {
  "داخل التطبيق": "in_app", "in-app payment": "in_app", "in_app_payment": "in_app", "in_app": "in_app", "in app": "in_app",
  "كاش": "cash", "cash": "cash", "نقدي": "cash",
  "تحويل": "bank_transfer", "bank transfer": "bank_transfer", "bank_transfer": "bank_transfer", "تحويل بنكي": "bank_transfer",
  "بطاقة": "card", "card": "card",
  "أخرى": "other", "other": "other",
};

// For payments table (uses 'in_app_payment')
export const PAYMENT_TABLE_METHOD_MAP: Record<string, string> = {
  "داخل التطبيق": "in_app_payment", "in-app payment": "in_app_payment", "in_app_payment": "in_app_payment", "in_app": "in_app_payment", "in app": "in_app_payment",
  "كاش": "cash", "cash": "cash", "نقدي": "cash",
  "تحويل": "bank_transfer", "bank transfer": "bank_transfer", "bank_transfer": "bank_transfer", "تحويل بنكي": "bank_transfer",
  "بطاقة": "card", "card": "card",
  "أخرى": "other", "other": "other",
};

// ============================================================
// COLUMN NAME MAPS (Arabic -> English field name)
// ============================================================

export const STORE_COLUMN_MAP: Record<string, string> = {
  "اسم المحل": "nameAr",
  "store name": "nameAr",
  "اسم المحل بالإنجليزي": "nameEn",
  "store english name": "nameEn",
  "اسم التاجر": "merchantName",
  "merchant name": "merchantName",
  "رقم التاجر": "merchantPhone",
  "merchant phone": "merchantPhone",
  "رقم الواتساب": "whatsappNumber",
  "whatsapp number": "whatsappNumber",
  "فئة المحل": "category",
  "store category": "category",
  "حالة التواصل": "communicationStatus",
  "communication status": "communicationStatus",
  "موافقة التاجر": "merchantApproval",
  "merchant approval": "merchantApproval",
  "إضافة في النظام": "addedInSystem",
  "added in system": "addedInSystem",
  "تفعيل المحل": "activationStatus",
  "store activation": "activationStatus",
  "التصنيف": "classification",
  "classification": "classification",
  "الولاية": "wilayat",
  "wilayat": "wilayat",
  "المنطقة": "region",
  "region": "region",
  "الموظف المسؤول": "responsibleEmployee",
  "responsible employee": "responsibleEmployee",
  "رابط خرائط جوجل": "googleMapsLink",
  "google maps link": "googleMapsLink",
  "العنوان": "address",
  "address": "address",
  "ملاحظات": "notes",
  "notes": "notes",
};

export const PRODUCT_COLUMN_MAP: Record<string, string> = {
  "اسم المحل": "storeName",
  "store name": "storeName",
  "معرف المحل": "storeId",
  "store id": "storeId",
  "قسم المنيو": "menuCategory",
  "menu category": "menuCategory",
  "اسم المنتج": "productName",
  "product name": "productName",
  "السعر": "price",
  "price": "price",
  "وصف المنتج": "description",
  "product description": "description",
  "حالة المنتج": "productStatus",
  "product status": "productStatus",
  "يظهر في التطبيق": "showInApp",
  "show in app": "showInApp",
  "رابط الصورة": "imageUrl",
  "image url": "imageUrl",
  "ملاحظات": "notes",
  "notes": "notes",
  "ترتيب العرض": "sortOrder",
  "sort order": "sortOrder",
};

export const CUSTOMER_COLUMN_MAP: Record<string, string> = {
  "اسم العميل": "fullName",
  "customer name": "fullName",
  "رقم العميل": "phone",
  "customer phone": "phone",
  "البريد الإلكتروني": "email",
  "email": "email",
  "الولاية": "wilayat",
  "wilayat": "wilayat",
  "العنوان": "address",
  "address": "address",
  "المواقع المحفوظة": "savedLocations",
  "saved locations": "savedLocations",
  "حالة العميل": "status",
  "customer status": "status",
  "ملاحظات": "notes",
  "notes": "notes",
};

export const ORDER_COLUMN_MAP: Record<string, string> = {
  "رقم الطلب": "orderNumber",
  "order number": "orderNumber",
  "تاريخ الطلب": "orderDate",
  "order date": "orderDate",
  "اسم العميل": "customerName",
  "customer name": "customerName",
  "رقم العميل": "customerPhone",
  "customer phone": "customerPhone",
  "الولاية": "wilayat",
  "wilayat": "wilayat",
  "العنوان": "customerAddress",
  "customer address": "customerAddress",
  "نوع الطلب": "orderType",
  "order type": "orderType",
  "اسم المحل": "storeName",
  "store name": "storeName",
  "تصنيف المحل": "storeClassification",
  "store classification": "storeClassification",
  "اسم المندوب": "mandoubName",
  "mandoub name": "mandoubName",
  "رقم المندوب": "mandoubPhone",
  "mandoub phone": "mandoubPhone",
  "الموظف المسؤول": "responsibleEmployee",
  "responsible employee": "responsibleEmployee",
  "حالة الطلب": "orderStatus",
  "order status": "orderStatus",
  "مبلغ الطلب": "orderAmount",
  "order amount": "orderAmount",
  "رسوم التوصيل": "deliveryFee",
  "delivery fee": "deliveryFee",
  "مبلغ الخصم": "discountAmount",
  "discount amount": "discountAmount",
  "كود الكوبون": "couponCode",
  "coupon code": "couponCode",
  "إجمالي المدفوع": "totalPaid",
  "total paid": "totalPaid",
  "طريقة الدفع": "paymentMethod",
  "payment method": "paymentMethod",
  "حالة الدفع": "paymentStatus",
  "payment status": "paymentStatus",
  "ملاحظات العميل": "customerNotes",
  "customer notes": "customerNotes",
  "ملاحظات داخلية": "internalNotes",
  "internal notes": "internalNotes",
};

export const PAYMENT_COLUMN_MAP: Record<string, string> = {
  "رقم العملية": "paymentId",
  "payment id": "paymentId",
  "رقم الطلب": "orderNumber",
  "order number": "orderNumber",
  "رقم الحجز": "bookingNumber",
  "booking number": "bookingNumber",
  "اسم العميل": "customerName",
  "customer name": "customerName",
  "رقم العميل": "customerPhone",
  "customer phone": "customerPhone",
  "المبلغ": "amount",
  "amount": "amount",
  "طريقة الدفع": "paymentMethod",
  "payment method": "paymentMethod",
  "حالة الدفع": "paymentStatus",
  "payment status": "paymentStatus",
  "تاريخ الدفع": "paymentDate",
  "payment date": "paymentDate",
  "مرجع الدفع": "paymentReference",
  "payment reference": "paymentReference",
  "هل تم الاسترجاع": "isRefunded",
  "is refunded": "isRefunded",
  "مبلغ الاسترجاع": "refundAmount",
  "refund amount": "refundAmount",
  "ملاحظات": "notes",
  "notes": "notes",
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/** Normalize a value using a map. Returns defaultValue if not found. */
export function normalizeValue(value: string | null | undefined, map: Record<string, string>, defaultValue: string): string {
  if (!value || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  return map[normalized] || defaultValue;
}

/** Normalize a boolean value using a map. Returns defaultValue if not found. */
export function normalizeBooleanValue(value: string | null | undefined, map: Record<string, boolean>, defaultValue: boolean): boolean {
  if (!value || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  return map[normalized] ?? defaultValue;
}

/** Map raw column headers to field names using a column map */
export function mapColumns(headers: string[], columnMap: Record<string, string>): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((header, index) => {
    const trimmed = header.trim().toLowerCase();
    if (columnMap[trimmed]) {
      mapping[index] = columnMap[trimmed];
    }
  });
  return mapping;
}

/** Parse a row using column mapping */
export function parseRow(row: any[], columnMapping: Record<number, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [indexStr, fieldName] of Object.entries(columnMapping)) {
    const index = parseInt(indexStr);
    const value = row[index];
    if (value !== undefined && value !== null) {
      result[fieldName] = String(value).trim();
    }
  }
  return result;
}

/** Sanitize text: trim, remove formulas, limit length */
export function sanitizeText(value: string | null | undefined, maxLength = 1000): string {
  if (!value) return "";
  let sanitized = String(value).trim();
  // Remove potential formula injection
  if (sanitized.startsWith("=") || sanitized.startsWith("+") || sanitized.startsWith("-") || sanitized.startsWith("@")) {
    sanitized = "'" + sanitized;
  }
  return sanitized.slice(0, maxLength);
}

// ============================================================
// PRIORITY 2: MANDOUB NORMALIZATION
// ============================================================

export const MANDOUB_TYPE_MAP: Record<string, string> = {
  "مندوب سريع": "fast", "fast mandoub": "fast", "fast": "fast",
  "مندوب المسافات الطويلة": "long_distance", "long-distance mandoub": "long_distance", "long distance": "long_distance", "long_distance": "long_distance",
};

export const MANDOUB_STATUS_MAP: Record<string, string> = {
  "نشط": "active", "active": "active",
  "بانتظار اعتماد": "pending_approval", "pending approval": "pending_approval", "pending_approval": "pending_approval",
  "غير نشط": "inactive", "inactive": "inactive",
  "موقوف": "suspended", "suspended": "suspended",
  "مؤرشف": "archived", "archived": "archived",
};

// ============================================================
// PRIORITY 2: MANDOUB DUES NORMALIZATION
// ============================================================

export const EARNING_TYPE_MAP: Record<string, string> = {
  "لكل طلب": "per_order", "per order": "per_order", "per_order": "per_order",
  "يومي": "daily", "daily": "daily",
  "أسبوعي": "weekly", "weekly": "weekly",
  "شهري": "monthly", "monthly": "monthly",
  "مكافأة": "bonus", "bonus": "bonus",
  "تعديل": "adjustment", "adjustment": "adjustment",
};

export const MANDOUB_PAYMENT_STATUS_MAP: Record<string, string> = {
  "غير مدفوع": "unpaid", "unpaid": "unpaid",
  "مدفوع": "paid", "paid": "paid",
  "جزئي": "partial", "partial": "partial",
  "قيد المراجعة": "under_review", "under review": "under_review", "under_review": "under_review",
};

// ============================================================
// PRIORITY 2: REFUND NORMALIZATION
// ============================================================

export const REFUND_TYPE_MAP: Record<string, string> = {
  "كامل": "full", "full": "full",
  "جزئي": "partial", "partial": "partial",
  "لا يوجد": "none", "none": "none",
};

export const CAUSED_BY_MAP: Record<string, string> = {
  "العميل": "customer", "customer": "customer",
  "المحل": "store", "store": "store",
  "المندوب": "mandoub", "mandoub": "mandoub",
  "مكسب": "maksab", "maksab": "maksab",
  "أخرى": "other", "other": "other",
};

export const COVERED_BY_MAP: Record<string, string> = {
  "مكسب": "maksab", "maksab": "maksab",
  "العميل": "customer", "customer": "customer",
  "المحل": "store", "store": "store",
  "المندوب": "mandoub", "mandoub": "mandoub",
  "غير محدد": "not_specified", "not specified": "not_specified", "not_specified": "not_specified",
};

export const REFUND_STATUS_MAP: Record<string, string> = {
  "بانتظار مراجعة": "pending_review", "pending review": "pending_review", "pending_review": "pending_review",
  "معتمد": "approved", "approved": "approved",
  "مرفوض": "rejected", "rejected": "rejected",
  "مكتمل": "completed", "completed": "completed",
  "ملغي": "cancelled", "cancelled": "cancelled",
};

// ============================================================
// PRIORITY 2: REVENUE NORMALIZATION
// ============================================================

export const REVENUE_SOURCE_MAP: Record<string, string> = {
  "طلب": "order", "order": "order",
  "حجز": "booking", "booking": "booking",
  "رسوم توصيل": "delivery_fee", "delivery fee": "delivery_fee", "delivery_fee": "delivery_fee",
  "عمولة محل": "store_commission", "store commission": "store_commission", "store_commission": "store_commission",
  "أخرى": "other", "other": "other",
};

export const REVENUE_STATUS_MAP: Record<string, string> = {
  "مسجل": "recorded", "recorded": "recorded",
  "ملغي": "cancelled", "cancelled": "cancelled",
  "معدل": "adjusted", "adjusted": "adjusted",
  "مؤرشف": "archived", "archived": "archived",
};

// Revenue payment method uses 'in_app_payment' (same as payments table)
export const REVENUE_PAYMENT_METHOD_MAP: Record<string, string> = {
  "داخل التطبيق": "in_app", "in-app payment": "in_app", "in_app_payment": "in_app", "in_app": "in_app", "in app": "in_app",
  "كاش": "cash", "cash": "cash", "نقدي": "cash",
  "تحويل": "bank_transfer", "bank transfer": "bank_transfer", "bank_transfer": "bank_transfer", "تحويل بنكي": "bank_transfer",
  "بطاقة": "card", "card": "card",
  "أخرى": "other", "other": "other",
};

// ============================================================
// PRIORITY 2: BOOLEAN NORMALIZATION
// ============================================================

export const YES_NO_BOOLEAN_MAP: Record<string, boolean> = {
  "نعم": true, "yes": true, "true": true, "1": true,
  "لا": false, "no": false, "false": false, "0": false,
};

// ============================================================
// PRIORITY 2: COLUMN MAPS
// ============================================================

export const MANDOUB_COLUMN_MAP: Record<string, string> = {
  "اسم المندوب": "fullName",
  "mandoub name": "fullName",
  "رقم المندوب": "phone",
  "mandoub phone": "phone",
  "البريد الإلكتروني": "email",
  "email": "email",
  "الولاية": "wilayat",
  "wilayat": "wilayat",
  "نوع المندوب": "mandoubType",
  "mandoub type": "mandoubType",
  "الموظف المسؤول": "responsibleEmployee",
  "responsible employee": "responsibleEmployee",
  "الحالة": "status",
  "status": "status",
  "ملاحظات": "notes",
  "notes": "notes",
};

export const MANDOUB_PERFORMANCE_COLUMN_MAP: Record<string, string> = {
  "رقم الطلب": "orderNumber",
  "order number": "orderNumber",
  "اسم المندوب": "mandoubName",
  "mandoub name": "mandoubName",
  "رقم المندوب": "mandoubPhone",
  "mandoub phone": "mandoubPhone",
  "تاريخ الطلب": "orderDate",
  "order date": "orderDate",
  "وقت قبول الطلب": "acceptedTime",
  "accepted time": "acceptedTime",
  "وقت الاستلام": "pickupTime",
  "pickup time": "pickupTime",
  "وقت التسليم": "deliveryTime",
  "delivery time": "deliveryTime",
  "مدة التوصيل": "deliveryDuration",
  "delivery duration": "deliveryDuration",
  "حالة الطلب": "orderStatus",
  "order status": "orderStatus",
  "هل تأخر": "delayed",
  "delayed": "delayed",
  "تقييم الأداء": "performanceRating",
  "performance rating": "performanceRating",
  "ملاحظات": "notes",
  "notes": "notes",
};

export const MANDOUB_DUES_COLUMN_MAP: Record<string, string> = {
  "اسم المندوب": "mandoubName",
  "mandoub name": "mandoubName",
  "رقم المندوب": "mandoubPhone",
  "mandoub phone": "mandoubPhone",
  "رقم الطلب": "orderNumber",
  "order number": "orderNumber",
  "نوع الاستحقاق": "earningType",
  "earning type": "earningType",
  "بداية الفترة": "periodStart",
  "period start": "periodStart",
  "نهاية الفترة": "periodEnd",
  "period end": "periodEnd",
  "المبلغ": "amount",
  "amount": "amount",
  "المدفوع": "paidAmount",
  "paid amount": "paidAmount",
  "المتبقي": "remainingAmount",
  "remaining amount": "remainingAmount",
  "حالة الدفع": "paymentStatus",
  "payment status": "paymentStatus",
  "تاريخ الدفع": "paymentDate",
  "payment date": "paymentDate",
  "ملاحظات": "notes",
  "notes": "notes",
};

export const REFUND_COLUMN_MAP: Record<string, string> = {
  "رقم الطلب": "orderNumber",
  "order number": "orderNumber",
  "رقم الحجز": "bookingNumber",
  "booking number": "bookingNumber",
  "سبب الإلغاء": "reason",
  "cancellation reason": "reason",
  "من تسبب بالمشكلة": "causedBy",
  "caused by": "causedBy",
  "نوع الاسترجاع": "refundType",
  "refund type": "refundType",
  "المبلغ المدفوع": "paidAmount",
  "paid amount": "paidAmount",
  "مبلغ الاسترجاع": "refundAmount",
  "refund amount": "refundAmount",
  "من يتحمل الفرق": "coveredBy",
  "covered by": "coveredBy",
  "هل المندوب يستحق مبلغ": "mandoubOwedMoney",
  "mandoub owed money": "mandoubOwedMoney",
  "هل المحل يستحق مبلغ": "storeOwedMoney",
  "store owed money": "storeOwedMoney",
  "المبلغ الذي تحملته الشركة": "companyCoveredAmount",
  "company covered amount": "companyCoveredAmount",
  "حالة الاسترجاع": "status",
  "refund status": "status",
  "تاريخ المراجعة": "reviewDate",
  "review date": "reviewDate",
  "ملاحظات": "notes",
  "notes": "notes",
};

export const REVENUE_COLUMN_MAP: Record<string, string> = {
  "التاريخ": "revenueDate",
  "revenue date": "revenueDate",
  "مصدر الإيراد": "source",
  "revenue source": "source",
  "رقم الطلب": "orderNumber",
  "order number": "orderNumber",
  "رقم الحجز": "bookingNumber",
  "booking number": "bookingNumber",
  "اسم المحل": "storeName",
  "store name": "storeName",
  "الولاية": "wilayat",
  "wilayat": "wilayat",
  "المبلغ": "amount",
  "amount": "amount",
  "طريقة الدفع": "paymentMethod",
  "payment method": "paymentMethod",
  "الحالة": "status",
  "status": "status",
  "ملاحظات": "notes",
  "notes": "notes",
};

// ============================================================
// PRIORITY 3: BOOKINGS NORMALIZATION
// ============================================================
export const BOOKING_SERVICE_TYPE_MAP: Record<string, string> = {
  "ملعب عشبي": "turf_field", "turf field": "turf_field", "turf": "turf_field",
  "ملعب صناعي": "grass_field", "grass field": "grass_field", "grass": "grass_field",
  "قاعة أفراح": "wedding_hall", "wedding hall": "wedding_hall", "wedding": "wedding_hall",
  "أخرى": "other", "other": "other",
};
export const BOOKING_STATUS_MAP: Record<string, string> = {
  "جديد": "new", "new": "new",
  "بانتظار التأكيد": "waiting_confirmation", "waiting confirmation": "waiting_confirmation",
  "مؤكد": "confirmed", "confirmed": "confirmed",
  "مكتمل": "completed", "completed": "completed",
  "ملغي": "cancelled", "cancelled": "cancelled",
  "مرفوض": "rejected", "rejected": "rejected",
  "يحتاج متابعة": "needs_follow_up", "needs follow up": "needs_follow_up",
  "مسترجع": "refunded", "refunded": "refunded",
  "مسترجع جزئياً": "partially_refunded", "partially refunded": "partially_refunded",
};
export const BOOKING_COLUMN_MAP: Record<string, string> = {
  "نوع الخدمة": "serviceType", "service type": "serviceType",
  "اسم العميل": "customerName", "customer name": "customerName",
  "رقم العميل": "customerPhone", "customer phone": "customerPhone",
  "الولاية": "wilayat", "wilayat": "wilayat",
  "تاريخ الحجز": "bookingDate", "booking date": "bookingDate",
  "وقت البداية": "startTime", "start time": "startTime",
  "وقت النهاية": "endTime", "end time": "endTime",
  "عنوان الاستلام": "pickupAddress", "pickup address": "pickupAddress",
  "عنوان التوصيل": "dropoffAddress", "dropoff address": "dropoffAddress",
  "السعر المقدر": "estimatedPrice", "estimated price": "estimatedPrice",
  "المبلغ الإجمالي": "totalAmount", "total amount": "totalAmount",
  "حالة الحجز": "bookingStatus", "booking status": "bookingStatus",
  "حالة الدفع": "paymentStatus", "payment status": "paymentStatus",
  "ملاحظات": "notes", "notes": "notes",
};
// ============================================================
// PRIORITY 3: COUPONS NORMALIZATION
// ============================================================
export const DISCOUNT_TYPE_MAP: Record<string, string> = {
  "ثابت": "fixed", "fixed": "fixed",
  "نسبة": "percentage", "percentage": "percentage",
  "توصيل مجاني": "free_delivery", "free delivery": "free_delivery", "free_delivery": "free_delivery",
};
export const COUPON_STATUS_MAP: Record<string, string> = {
  "نشط": "active", "active": "active", "فعال": "active",
  "غير نشط": "inactive", "inactive": "inactive",
  "منتهي": "expired", "expired": "expired",
  "مؤرشف": "archived", "archived": "archived",
};
export const WHO_BEARS_COST_MAP: Record<string, string> = {
  "مكسب": "maksab", "maksab": "maksab", "الشركة": "maksab",
  "المحل": "store", "store": "store",
  "مشترك": "shared", "shared": "shared",
};
export const COUPON_COLUMN_MAP: Record<string, string> = {
  "اسم الكوبون": "name", "coupon name": "name",
  "الكود": "code", "code": "code",
  "نوع الخصم": "discountType", "discount type": "discountType",
  "قيمة الخصم": "discountValue", "discount value": "discountValue",
  "تاريخ البداية": "startDate", "start date": "startDate",
  "تاريخ النهاية": "endDate", "end date": "endDate",
  "الولاية": "wilayat", "wilayat": "wilayat",
  "اسم المحل": "storeName", "store name": "storeName",
  "من يتحمل التكلفة": "whoBearsCost", "who bears cost": "whoBearsCost",
  "حد الاستخدام": "usageLimit", "usage limit": "usageLimit",
  "حد الاستخدام لكل عميل": "perCustomerLimit", "per customer limit": "perCustomerLimit",
  "الحد الأدنى للطلب": "minimumOrderAmount", "minimum order amount": "minimumOrderAmount",
  "الحالة": "status", "status": "status",
  "ملاحظات": "notes", "notes": "notes",
};
// ============================================================
// PRIORITY 3: EXPENSES NORMALIZATION
// ============================================================
export const EXPENSE_TYPE_MAP: Record<string, string> = {
  "شراء": "purchase", "purchase": "purchase",
  "تشغيل": "operations", "operations": "operations",
  "مندوب": "mandoub", "mandoub": "mandoub",
  "خدمة": "service", "service": "service",
  "تسويق": "marketing", "marketing": "marketing",
  "تدريب": "training", "training": "training",
  "فرق سعر": "price_difference", "price difference": "price_difference", "price_difference": "price_difference",
  "استرجاع": "refund", "refund": "refund",
  "أخرى": "other", "other": "other",
};
export const EXPENSE_PAYMENT_METHOD_MAP: Record<string, string> = {
  "نقد": "cash", "cash": "cash",
  "تحويل بنكي": "bank_transfer", "bank transfer": "bank_transfer", "bank_transfer": "bank_transfer",
  "بطاقة": "card", "card": "card",
  "أخرى": "other", "other": "other",
};
export const EXPENSE_APPROVAL_STATUS_MAP: Record<string, string> = {
  "بانتظار الموافقة": "pending_approval", "pending approval": "pending_approval", "pending_approval": "pending_approval",
  "موافق عليه": "approved", "approved": "approved",
  "مرفوض": "rejected", "rejected": "rejected",
  "يحتاج مراجعة": "needs_review", "needs review": "needs_review", "needs_review": "needs_review",
  "ملغي": "cancelled", "cancelled": "cancelled",
};
export const BENEFICIARY_TYPE_MAP: Record<string, string> = {
  "محل": "store", "store": "store",
  "مندوب": "mandoub", "mandoub": "mandoub",
  "موظف": "employee", "employee": "employee",
  "عميل": "customer", "customer": "customer",
  "مزود خدمة": "service_provider", "service provider": "service_provider", "service_provider": "service_provider",
  "أخرى": "other", "other": "other",
};
export const EXPENSE_COLUMN_MAP: Record<string, string> = {
  "تاريخ المصروف": "expenseDate", "expense date": "expenseDate",
  "نوع المصروف": "expenseType", "expense type": "expenseType",
  "المبلغ": "amount", "amount": "amount",
  "طريقة الدفع": "paymentMethod", "payment method": "paymentMethod",
  "السبب": "reason", "reason": "reason",
  "نوع المستفيد": "beneficiaryType", "beneficiary type": "beneficiaryType",
  "اسم المستفيد": "beneficiaryName", "beneficiary name": "beneficiaryName",
  "الولاية": "wilayat", "wilayat": "wilayat",
  "الميزانية": "budgetName", "budget": "budgetName",
  "حالة الموافقة": "approvalStatus", "approval status": "approvalStatus",
  "ملاحظات": "notes", "notes": "notes",
};
// ============================================================
// PRIORITY 3: STORE DUES NORMALIZATION
// ============================================================
export const STORE_DUE_SETTLEMENT_STATUS_MAP: Record<string, string> = {
  "غير مسوى": "unsettled", "unsettled": "unsettled",
  "مسوى جزئياً": "partially_settled", "partially settled": "partially_settled", "partially_settled": "partially_settled",
  "مسوى": "settled", "settled": "settled",
  "قيد المراجعة": "under_review", "under review": "under_review", "under_review": "under_review",
};
export const STORE_DUE_COLUMN_MAP: Record<string, string> = {
  "اسم المحل": "storeName", "store name": "storeName",
  "رقم الطلب": "orderNumber", "order number": "orderNumber",
  "إجمالي المبيعات": "totalSalesAmount", "total sales": "totalSalesAmount",
  "نسبة العمولة": "commissionPercentage", "commission percentage": "commissionPercentage",
  "مبلغ العمولة": "commissionAmount", "commission amount": "commissionAmount",
  "مستحقات المحل": "storeDueAmount", "store due amount": "storeDueAmount",
  "المدفوع": "paidAmount", "paid amount": "paidAmount",
  "المتبقي": "remainingAmount", "remaining amount": "remainingAmount",
  "حالة التسوية": "settlementStatus", "settlement status": "settlementStatus",
  "تاريخ التسوية": "settlementDate", "settlement date": "settlementDate",
  "ملاحظات": "notes", "notes": "notes",
};
// ============================================================
// PRIORITY 3: SETTLEMENTS NORMALIZATION
// ============================================================
export const SETTLEMENT_TYPE_MAP: Record<string, string> = {
  "مندوب": "mandoub", "mandoub": "mandoub",
  "محل": "store", "store": "store",
  "داخلي": "internal", "internal": "internal",
  "استرجاع": "refund", "refund": "refund",
  "فرق سعر إزهلها": "ezhalha_price_diff", "ezhalha price diff": "ezhalha_price_diff", "ezhalha_price_diff": "ezhalha_price_diff",
  "أخرى": "other", "other": "other",
};
export const SETTLEMENT_ENTITY_TYPE_MAP: Record<string, string> = {
  "مندوب": "mandoub", "mandoub": "mandoub",
  "محل": "store", "store": "store",
  "عميل": "customer", "customer": "customer",
  "موظف": "employee", "employee": "employee",
  "أخرى": "other", "other": "other",
};
export const SETTLEMENT_STATUS_MAP: Record<string, string> = {
  "معلق": "pending", "pending": "pending",
  "موافق عليه": "approved", "approved": "approved",
  "مكتمل": "completed", "completed": "completed",
  "مرفوض": "rejected", "rejected": "rejected",
  "ملغي": "cancelled", "cancelled": "cancelled",
};
export const SETTLEMENT_COLUMN_MAP: Record<string, string> = {
  "نوع التسوية": "settlementType", "settlement type": "settlementType",
  "نوع الجهة": "relatedEntityType", "entity type": "relatedEntityType",
  "اسم الجهة": "relatedEntityName", "entity name": "relatedEntityName",
  "رقم الطلب": "orderNumber", "order number": "orderNumber",
  "رقم الحجز": "bookingNumber", "booking number": "bookingNumber",
  "المبلغ": "amount", "amount": "amount",
  "السبب": "reason", "reason": "reason",
  "الحالة": "status", "status": "status",
  "تاريخ التسوية": "settlementDate", "settlement date": "settlementDate",
  "ملاحظات": "notes", "notes": "notes",
};
// ============================================================
// PRIORITY 3: COMPLAINTS NORMALIZATION
// ============================================================
export const COMPLAINT_TYPE_MAP: Record<string, string> = {
  "شكوى عميل": "customer_complaint", "customer complaint": "customer_complaint", "customer_complaint": "customer_complaint",
  "شكوى مندوب": "mandoub_complaint", "mandoub complaint": "mandoub_complaint", "mandoub_complaint": "mandoub_complaint",
  "شكوى محل": "store_complaint", "store complaint": "store_complaint", "store_complaint": "store_complaint",
  "مشكلة طلب": "order_issue", "order issue": "order_issue", "order_issue": "order_issue",
  "مشكلة دفع": "payment_issue", "payment issue": "payment_issue", "payment_issue": "payment_issue",
  "تأخير": "delay", "delay": "delay",
  "طلب استرجاع": "refund_request", "refund request": "refund_request", "refund_request": "refund_request",
  "مشكلة حجز": "booking_issue", "booking issue": "booking_issue", "booking_issue": "booking_issue",
  "أخرى": "other", "other": "other",
};
export const COMPLAINT_STATUS_MAP: Record<string, string> = {
  "جديد": "new", "new": "new",
  "قيد المعالجة": "in_progress", "in progress": "in_progress", "in_progress": "in_progress",
  "تم الحل": "resolved", "resolved": "resolved",
  "مرفوض": "rejected", "rejected": "rejected",
  "تم التصعيد": "escalated", "escalated": "escalated",
  "مغلق": "closed", "closed": "closed",
};
export const COMPLAINT_COLUMN_MAP: Record<string, string> = {
  "اسم العميل": "customerName", "customer name": "customerName",
  "رقم العميل": "customerPhone", "customer phone": "customerPhone",
  "رقم الطلب": "orderNumber", "order number": "orderNumber",
  "رقم الحجز": "bookingNumber", "booking number": "bookingNumber",
  "اسم المحل": "storeName", "store name": "storeName",
  "اسم المندوب": "mandoubName", "mandoub name": "mandoubName",
  "نوع الشكوى": "complaintType", "complaint type": "complaintType",
  "الوصف": "description", "description": "description",
  "الحالة": "status", "status": "status",
  "ملاحظات الحل": "resolutionNotes", "resolution notes": "resolutionNotes",
};

// ============================================================
// PRIORITY 3: COUPON USAGE NORMALIZATION
// ============================================================
export const COUPON_USAGE_COLUMN_MAP: Record<string, string> = {
  "كود الكوبون": "couponCode", "coupon code": "couponCode",
  "رقم الطلب": "orderNumber", "order number": "orderNumber",
  "اسم العميل": "customerName", "customer name": "customerName",
  "رقم العميل": "customerPhone", "customer phone": "customerPhone",
  "مبلغ الخصم": "discountAmount", "discount amount": "discountAmount",
  "من يتحمل التكلفة": "discountBearer", "discount bearer": "discountBearer",
  "تاريخ الاستخدام": "usageDate", "usage date": "usageDate",
  "ملاحظات": "notes", "notes": "notes",
};
