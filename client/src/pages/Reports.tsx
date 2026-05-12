import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, BarChart3, Users, Store, Package, FileText, DollarSign, Printer, FileSpreadsheet, ShieldCheck, ClipboardList, Truck, Calendar, AlertTriangle, Receipt, Wallet, HandCoins, Scale, Tag, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ============================================================
// SAFE CELL CONVERSION - handles null, undefined, numbers, booleans, dates, objects, arrays
// ============================================================
function safeCell(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "object") {
    try { return JSON.stringify(value); } catch { return "[object]"; }
  }
  return String(value);
}

// ============================================================
// EXPORT UTILITIES
// ============================================================
function exportCSV(headers: string[], rows: string[][], filename: string): boolean {
  try {
    const csvContent = [
      headers.map(h => `"${safeCell(h).replace(/"/g, '""')}"`).join(","),
      ...rows.map(row => row.map(cell => `"${safeCell(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error("CSV export failed:", e);
    return false;
  }
}

function exportExcel(headers: string[], rows: string[][], filename: string, sheetName: string): boolean {
  try {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    XLSX.writeFile(wb, filename);
    return true;
  } catch (e) {
    console.error("Excel export failed:", e);
    return false;
  }
}

function getDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Reports() {
  const { t, language } = useI18n();
  const { user } = useAuth();

  const [opType, setOpType] = useState("stores");
  const [finType, setFinType] = useState("revenues");
  const [wilayatFilter, setWilayatFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Computed filter values
  const wilayatId = wilayatFilter && wilayatFilter !== "all" ? parseInt(wilayatFilter) : undefined;
  const startDate = dateFrom || undefined;
  const endDate = dateTo || undefined;

  // ============================================================
  // DATA QUERIES - All respect wilayat and date filters where supported
  // ============================================================
  const wilayats = trpc.wilayat.list.useQuery();

  // Operational
  const storeData = trpc.store.list.useQuery({ wilayatId });
  const orderData = trpc.order.list.useQuery({ wilayatId, startDate, endDate });
  const employeeData = trpc.employee.list.useQuery({ wilayatId });
  const mandoubData = trpc.mandoub.list.useQuery({ wilayatId });
  const bookingData = trpc.booking.list.useQuery({ wilayatId });
  const complaintData = trpc.complaint.list.useQuery();
  const approvalData = trpc.approval.list.useQuery();

  // Financial
  const revenueData = trpc.revenue.list.useQuery({ wilayatId, startDate, endDate });
  const expenseData = trpc.expense.list.useQuery({ wilayatId });
  const budgetData = trpc.budget.list.useQuery({ wilayatId });
  const mandoubDueData = trpc.mandoubDue.list.useQuery();
  const storeDueData = trpc.storeDue.list.useQuery();
  const settlementData = trpc.settlement.list.useQuery();
  const refundData = trpc.refund.list.useQuery();
  const couponData = trpc.coupon.list.useQuery({ wilayatId });

  // ============================================================
  // DATE FILTERING (client-side for queries that don't support date params)
  // ============================================================
  function filterByDate(items: any[], dateField: string): any[] {
    if (!items) return [];
    return items.filter((item: any) => {
      if (!startDate && !endDate) return true;
      const itemDate = item[dateField] ? new Date(item[dateField]).toISOString().split("T")[0] : null;
      if (!itemDate) return true;
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  }

  // ============================================================
  // REPORT TYPE DEFINITIONS
  // ============================================================
  const opReportTypes = [
    { value: "stores", label: language === "ar" ? "المحلات" : "Stores", icon: Store },
    { value: "orders", label: language === "ar" ? "الطلبات" : "Orders", icon: ShoppingBag },
    { value: "employees", label: language === "ar" ? "الموظفين" : "Employees", icon: Users },
    { value: "mandoubs", label: language === "ar" ? "المناديب" : "Mandoubs", icon: Truck },
    { value: "bookings", label: language === "ar" ? "الحجوزات" : "Bookings", icon: Calendar },
    { value: "complaints", label: language === "ar" ? "الشكاوى" : "Complaints", icon: AlertTriangle },
    { value: "approvals", label: language === "ar" ? "الموافقات" : "Approvals", icon: ShieldCheck },
  ];

  const finReportTypes = [
    { value: "revenues", label: language === "ar" ? "الإيرادات" : "Revenues", icon: DollarSign },
    { value: "expenses", label: language === "ar" ? "المصروفات" : "Expenses", icon: Wallet },
    { value: "budgets", label: language === "ar" ? "الميزانيات" : "Budgets", icon: ClipboardList },
    { value: "mandoubDues", label: language === "ar" ? "مستحقات المناديب" : "Mandoub Dues", icon: HandCoins },
    { value: "storeDues", label: language === "ar" ? "مستحقات المحلات" : "Store Dues", icon: Receipt },
    { value: "settlements", label: language === "ar" ? "التسويات" : "Settlements", icon: Scale },
    { value: "refunds", label: language === "ar" ? "الاستردادات" : "Refunds", icon: FileText },
    { value: "coupons", label: language === "ar" ? "الكوبونات" : "Coupons", icon: Tag },
  ];

  // ============================================================
  // EXPORT DATA BUILDERS
  // ============================================================
  function getOpExportData(): { headers: string[]; rows: string[][]; filename: string; title: string } | null {
    switch (opType) {
      case "stores": {
        const data = filterByDate(storeData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "اسم المحل" : "Store Name", language === "ar" ? "التاجر" : "Merchant", language === "ar" ? "هاتف التاجر" : "Merchant Phone", language === "ar" ? "التصنيف" : "Category", language === "ar" ? "النوع" : "Classification", language === "ar" ? "حالة التفعيل" : "Activation", language === "ar" ? "التواصل" : "Communication", language === "ar" ? "موافقة التاجر" : "Merchant Approval", language === "ar" ? "مضاف بالنظام" : "Added In System", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((s: any) => [safeCell(s.id), safeCell(s.nameAr), safeCell(s.merchantName), safeCell(s.merchantPhone), safeCell(s.category), safeCell(s.classification), safeCell(s.activationStatus), safeCell(s.communicationStatus), safeCell(s.merchantApproval), safeCell(s.addedInSystem), safeCell(s.wilayatId), safeCell(s.notes)]);
        return { headers, rows, filename: `maksab-stores-report-${getDateStr()}`, title: language === "ar" ? "تقرير المحلات" : "Stores Report" };
      }
      case "orders": {
        const data = orderData.data || [];
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "رقم الطلب" : "Order #", language === "ar" ? "التاريخ" : "Date", language === "ar" ? "النوع" : "Type", language === "ar" ? "العميل" : "Customer", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "التوصيل" : "Delivery Fee", language === "ar" ? "الخصم" : "Discount", language === "ar" ? "المدفوع" : "Total Paid", language === "ar" ? "طريقة الدفع" : "Payment Method", language === "ar" ? "حالة الدفع" : "Payment Status", language === "ar" ? "حالة الطلب" : "Order Status", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "ملاحظات داخلية" : "Internal Notes"];
        const rows = data.map((o: any) => [safeCell(o.id), safeCell(o.orderNumber), safeCell(o.orderDate), safeCell(o.orderType), safeCell(o.customerName), safeCell(o.customerPhone), safeCell(o.orderAmount), safeCell(o.deliveryFee), safeCell(o.discountAmount), safeCell(o.totalPaidByCustomer), safeCell(o.paymentMethod), safeCell(o.paymentStatus), safeCell(o.orderStatus), safeCell(o.wilayatId), safeCell(o.internalNotes)]);
        return { headers, rows, filename: `maksab-orders-report-${getDateStr()}`, title: language === "ar" ? "تقرير الطلبات" : "Orders Report" };
      }
      case "employees": {
        const data = filterByDate(employeeData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "البريد" : "Email", language === "ar" ? "الدور" : "Role", language === "ar" ? "المسمى الوظيفي" : "Job Title", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((e: any) => [safeCell(e.id), safeCell(e.fullName), safeCell(e.phone), safeCell(e.email), safeCell(e.maksabRole), safeCell(e.jobTitle), safeCell(e.wilayatId), safeCell(e.status), safeCell(e.notes)]);
        return { headers, rows, filename: `maksab-employees-report-${getDateStr()}`, title: language === "ar" ? "تقرير الموظفين" : "Employees Report" };
      }
      case "mandoubs": {
        const data = filterByDate(mandoubData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "النوع" : "Type", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((m: any) => [safeCell(m.id), safeCell(m.fullName), safeCell(m.phone), safeCell(m.mandoubType), safeCell(m.wilayatId), safeCell(m.status), safeCell(m.notes)]);
        return { headers, rows, filename: `maksab-mandoubs-report-${getDateStr()}`, title: language === "ar" ? "تقرير المناديب" : "Mandoubs Report" };
      }
      case "bookings": {
        const data = filterByDate(bookingData.data || [], "bookingDate");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "رقم الحجز" : "Booking #", language === "ar" ? "العميل" : "Customer", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "نوع الخدمة" : "Service Type", language === "ar" ? "مقدم الخدمة" : "Provider", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "تاريخ الحجز" : "Booking Date", language === "ar" ? "المبلغ" : "Total", language === "ar" ? "العربون" : "Deposit", language === "ar" ? "المتبقي" : "Remaining", language === "ar" ? "حالة الدفع" : "Payment Status", language === "ar" ? "حالة الحجز" : "Booking Status", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((b: any) => [safeCell(b.id), safeCell(b.bookingNumber), safeCell(b.customerName), safeCell(b.customerPhone), safeCell(b.serviceType), safeCell(b.serviceProviderName), safeCell(b.wilayatId), safeCell(b.bookingDate), safeCell(b.totalAmount), safeCell(b.depositAmount), safeCell(b.remainingAmount), safeCell(b.paymentStatus), safeCell(b.bookingStatus), safeCell(b.notes)]);
        return { headers, rows, filename: `maksab-bookings-report-${getDateStr()}`, title: language === "ar" ? "تقرير الحجوزات" : "Bookings Report" };
      }
      case "complaints": {
        const data = filterByDate(complaintData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "العميل" : "Customer", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "النوع" : "Type", language === "ar" ? "الوصف" : "Description", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات الحل" : "Resolution Notes", language === "ar" ? "التاريخ" : "Date"];
        const rows = data.map((c: any) => [safeCell(c.id), safeCell(c.customerName), safeCell(c.customerPhone), safeCell(c.complaintType), safeCell(c.description), safeCell(c.status), safeCell(c.resolutionNotes), safeCell(c.createdAt)]);
        return { headers, rows, filename: `maksab-complaints-report-${getDateStr()}`, title: language === "ar" ? "تقرير الشكاوى" : "Complaints Report" };
      }
      case "approvals": {
        const data = filterByDate(approvalData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "نوع الطلب" : "Request Type", language === "ar" ? "الكيان" : "Entity Type", language === "ar" ? "معرف الكيان" : "Entity ID", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات المراجعة" : "Review Notes", language === "ar" ? "التاريخ" : "Date"];
        const rows = data.map((a: any) => [safeCell(a.id), safeCell(a.requestType), safeCell(a.targetEntityType), safeCell(a.targetEntityId), safeCell(a.status), safeCell(a.reviewNotes), safeCell(a.createdAt)]);
        return { headers, rows, filename: `maksab-approvals-report-${getDateStr()}`, title: language === "ar" ? "تقرير الموافقات" : "Approvals Report" };
      }
      default: return null;
    }
  }

  function getFinExportData(): { headers: string[]; rows: string[][]; filename: string; title: string } | null {
    switch (finType) {
      case "revenues": {
        const data = revenueData.data || [];
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "التاريخ" : "Date", language === "ar" ? "المصدر" : "Source", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "طريقة الدفع" : "Payment Method", language === "ar" ? "الحالة" : "Status", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((r: any) => [safeCell(r.id), safeCell(r.revenueDate), safeCell(r.source), safeCell(r.amount), safeCell(r.paymentMethod), safeCell(r.status), safeCell(r.wilayatId), safeCell(r.notes)]);
        return { headers, rows, filename: `maksab-revenues-report-${getDateStr()}`, title: language === "ar" ? "تقرير الإيرادات" : "Revenues Report" };
      }
      case "expenses": {
        const data = filterByDate(expenseData.data || [], "expenseDate");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "التاريخ" : "Date", language === "ar" ? "النوع" : "Type", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "طريقة الدفع" : "Payment Method", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "السبب" : "Reason", language === "ar" ? "المستفيد" : "Beneficiary", language === "ar" ? "حالة الموافقة" : "Approval Status", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((e: any) => [safeCell(e.id), safeCell(e.expenseDate), safeCell(e.expenseType), safeCell(e.amount), safeCell(e.paymentMethod), safeCell(e.wilayatId), safeCell(e.reason), safeCell(e.beneficiaryName), safeCell(e.approvalStatus), safeCell(e.notes)]);
        return { headers, rows, filename: `maksab-expenses-report-${getDateStr()}`, title: language === "ar" ? "تقرير المصروفات" : "Expenses Report" };
      }
      case "budgets": {
        const data = filterByDate(budgetData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الميزة" : "Feature", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "المعتمد" : "Approved", language === "ar" ? "المنصرف" : "Spent", language === "ar" ? "المتبقي" : "Remaining", language === "ar" ? "البداية" : "Start", language === "ar" ? "النهاية" : "End", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((b: any) => [safeCell(b.id), safeCell(b.name), safeCell(b.feature), safeCell(b.wilayatId), safeCell(b.approvedAmount), safeCell(b.spentAmount), safeCell(b.remainingAmount), safeCell(b.startDate), safeCell(b.endDate), safeCell(b.status), safeCell(b.notes)]);
        return { headers, rows, filename: `maksab-budgets-report-${getDateStr()}`, title: language === "ar" ? "تقرير الميزانيات" : "Budgets Report" };
      }
      case "mandoubDues": {
        const data = filterByDate(mandoubDueData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "المندوب" : "Mandoub ID", language === "ar" ? "نوع الاستحقاق" : "Earning Type", language === "ar" ? "الطلب" : "Order ID", language === "ar" ? "بداية الفترة" : "Period Start", language === "ar" ? "نهاية الفترة" : "Period End", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "المدفوع" : "Paid", language === "ar" ? "المتبقي" : "Remaining", language === "ar" ? "حالة الدفع" : "Payment Status", language === "ar" ? "تاريخ الدفع" : "Payment Date", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((d: any) => [safeCell(d.id), safeCell(d.mandoubId), safeCell(d.earningType), safeCell(d.orderId), safeCell(d.periodStart), safeCell(d.periodEnd), safeCell(d.amount), safeCell(d.paidAmount), safeCell(d.remainingAmount), safeCell(d.paymentStatus), safeCell(d.paymentDate), safeCell(d.notes)]);
        return { headers, rows, filename: `maksab-mandoub-dues-report-${getDateStr()}`, title: language === "ar" ? "تقرير مستحقات المناديب" : "Mandoub Dues Report" };
      }
      case "storeDues": {
        const data = filterByDate(storeDueData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "المحل" : "Store ID", language === "ar" ? "الطلب" : "Order ID", language === "ar" ? "إجمالي المبيعات" : "Total Sales", language === "ar" ? "نسبة العمولة" : "Commission %", language === "ar" ? "مبلغ العمولة" : "Commission Amount", language === "ar" ? "مستحق المحل" : "Store Due", language === "ar" ? "المدفوع" : "Paid", language === "ar" ? "المتبقي" : "Remaining", language === "ar" ? "حالة التسوية" : "Settlement Status", language === "ar" ? "تاريخ التسوية" : "Settlement Date", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((d: any) => [safeCell(d.id), safeCell(d.storeId), safeCell(d.orderId), safeCell(d.totalSalesAmount), safeCell(d.commissionPercentage), safeCell(d.commissionAmount), safeCell(d.storeDueAmount), safeCell(d.paidAmount), safeCell(d.remainingAmount), safeCell(d.settlementStatus), safeCell(d.settlementDate), safeCell(d.notes)]);
        return { headers, rows, filename: `maksab-store-dues-report-${getDateStr()}`, title: language === "ar" ? "تقرير مستحقات المحلات" : "Store Dues Report" };
      }
      case "settlements": {
        const data = filterByDate(settlementData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "النوع" : "Type", language === "ar" ? "نوع الكيان" : "Entity Type", language === "ar" ? "اسم الكيان" : "Entity Name", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "السبب" : "Reason", language === "ar" ? "الحالة" : "Status", language === "ar" ? "تاريخ التسوية" : "Settlement Date", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((s: any) => [safeCell(s.id), safeCell(s.settlementType), safeCell(s.relatedEntityType), safeCell(s.relatedEntityName), safeCell(s.amount), safeCell(s.reason), safeCell(s.status), safeCell(s.settlementDate), safeCell(s.notes)]);
        return { headers, rows, filename: `maksab-settlements-report-${getDateStr()}`, title: language === "ar" ? "تقرير التسويات" : "Settlements Report" };
      }
      case "refunds": {
        const data = filterByDate(refundData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "الطلب" : "Order ID", language === "ar" ? "الحجز" : "Booking ID", language === "ar" ? "السبب" : "Reason", language === "ar" ? "نوع الاسترداد" : "Refund Type", language === "ar" ? "المبلغ المدفوع" : "Paid Amount", language === "ar" ? "مبلغ الاسترداد" : "Refund Amount", language === "ar" ? "المسبب" : "Caused By", language === "ar" ? "يغطي الفرق" : "Covered By", language === "ar" ? "مبلغ الشركة" : "Company Covered", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((r: any) => [safeCell(r.id), safeCell(r.orderId), safeCell(r.bookingId), safeCell(r.reason), safeCell(r.refundType), safeCell(r.paidAmount), safeCell(r.refundAmount), safeCell(r.whoCausedIssue), safeCell(r.whoCoversDifference), safeCell(r.companyCoveredAmount), safeCell(r.status), safeCell(r.notes)]);
        return { headers, rows, filename: `maksab-refunds-report-${getDateStr()}`, title: language === "ar" ? "تقرير الاستردادات" : "Refunds Report" };
      }
      case "coupons": {
        const data = filterByDate(couponData.data || [], "createdAt");
        if (!data.length) return null;
        const headers = ["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الكود" : "Code", language === "ar" ? "نوع الخصم" : "Discount Type", language === "ar" ? "القيمة" : "Value", language === "ar" ? "البداية" : "Start", language === "ar" ? "النهاية" : "End", language === "ar" ? "الولاية" : "Wilayat", language === "ar" ? "المحل" : "Store ID", language === "ar" ? "يتحمل التكلفة" : "Cost Bearer", language === "ar" ? "الاستخدام" : "Usage", language === "ar" ? "الحد" : "Limit", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات" : "Notes"];
        const rows = data.map((c: any) => [safeCell(c.id), safeCell(c.name), safeCell(c.code), safeCell(c.discountType), safeCell(c.discountValue), safeCell(c.startDate), safeCell(c.endDate), safeCell(c.wilayatId), safeCell(c.linkedStoreId), safeCell(c.whoBearsCost), safeCell(c.usageCount), safeCell(c.usageLimit), safeCell(c.status), safeCell(c.notes)]);
        return { headers, rows, filename: `maksab-coupons-report-${getDateStr()}`, title: language === "ar" ? "تقرير الكوبونات" : "Coupons Report" };
      }
      default: return null;
    }
  }

  // ============================================================
  // EXPORT HANDLERS
  // ============================================================
  function handleOpExport(format: "csv" | "excel") {
    const data = getOpExportData();
    if (!data) {
      toast.error(language === "ar" ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    let success = false;
    if (format === "csv") {
      success = exportCSV(data.headers, data.rows, `${data.filename}.csv`);
    } else {
      success = exportExcel(data.headers, data.rows, `${data.filename}.xlsx`, data.title);
    }
    if (success) {
      toast.success(language === "ar" ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } else {
      toast.error(language === "ar" ? "تعذر تصدير التقرير. يرجى المحاولة مرة أخرى." : "Failed to export report. Please try again.");
    }
  }

  function handleFinExport(format: "csv" | "excel") {
    const data = getFinExportData();
    if (!data) {
      toast.error(language === "ar" ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }
    let success = false;
    if (format === "csv") {
      success = exportCSV(data.headers, data.rows, `${data.filename}.csv`);
    } else {
      success = exportExcel(data.headers, data.rows, `${data.filename}.xlsx`, data.title);
    }
    if (success) {
      toast.success(language === "ar" ? "تم تصدير التقرير بنجاح" : "Report exported successfully");
    } else {
      toast.error(language === "ar" ? "تعذر تصدير التقرير. يرجى المحاولة مرة أخرى." : "Failed to export report. Please try again.");
    }
  }

  function printReport() {
    window.print();
  }

  // ============================================================
  // SUMMARY CARDS
  // ============================================================
  function SummaryCards({ items }: { items: { label: string; value: string | number; color?: string }[] }) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className={`text-lg font-bold ${item.color || ""}`}>{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  // ============================================================
  // OPERATIONAL REPORT TABLES
  // ============================================================
  function renderOpTable() {
    if (opType === "stores") {
      const data = filterByDate(storeData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const active = data.filter((s: any) => s.activationStatus === "active").length;
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "إجمالي المحلات" : "Total Stores", value: data.length },
          { label: language === "ar" ? "نشط" : "Active", value: active, color: "text-green-600" },
          { label: language === "ar" ? "غير نشط" : "Inactive", value: data.length - active, color: "text-amber-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "التاجر" : "Merchant", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "التصنيف" : "Category", language === "ar" ? "التفعيل" : "Activation", language === "ar" ? "التواصل" : "Communication"]}
          rows={data.map((s: any) => [safeCell(s.id), safeCell(s.nameAr), safeCell(s.merchantName), safeCell(s.merchantPhone), safeCell(s.category), safeCell(s.activationStatus), safeCell(s.communicationStatus)])} />
      </>);
    }
    if (opType === "orders") {
      const data = orderData.data || [];
      if (!data.length) return <EmptyState />;
      const total = data.reduce((sum: number, o: any) => sum + parseFloat(o.orderAmount || "0"), 0);
      const completed = data.filter((o: any) => o.orderStatus === "completed" || o.orderStatus === "delivered").length;
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "إجمالي الطلبات" : "Total Orders", value: data.length },
          { label: language === "ar" ? "مكتمل" : "Completed", value: completed, color: "text-green-600" },
          { label: language === "ar" ? "إجمالي المبالغ" : "Total Amount", value: total.toFixed(2), color: "text-blue-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "رقم الطلب" : "Order #", language === "ar" ? "النوع" : "Type", language === "ar" ? "العميل" : "Customer", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "حالة الدفع" : "Payment", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((o: any) => [safeCell(o.id), safeCell(o.orderNumber), safeCell(o.orderType), safeCell(o.customerName), safeCell(o.orderAmount), safeCell(o.paymentStatus), safeCell(o.orderStatus)])} />
      </>);
    }
    if (opType === "employees") {
      const data = filterByDate(employeeData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const active = data.filter((e: any) => e.status === "active").length;
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "إجمالي الموظفين" : "Total Employees", value: data.length },
          { label: language === "ar" ? "نشط" : "Active", value: active, color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "الدور" : "Role", language === "ar" ? "المسمى" : "Job Title", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((e: any) => [safeCell(e.id), safeCell(e.fullName), safeCell(e.phone), safeCell(e.maksabRole), safeCell(e.jobTitle), safeCell(e.status)])} />
      </>);
    }
    if (opType === "mandoubs") {
      const data = filterByDate(mandoubData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const active = data.filter((m: any) => m.status === "active").length;
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "إجمالي المناديب" : "Total Mandoubs", value: data.length },
          { label: language === "ar" ? "نشط" : "Active", value: active, color: "text-green-600" },
          { label: language === "ar" ? "سريع" : "Fast", value: data.filter((m: any) => m.mandoubType === "fast").length },
          { label: language === "ar" ? "مسافات طويلة" : "Long Distance", value: data.filter((m: any) => m.mandoubType === "long_distance").length },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الهاتف" : "Phone", language === "ar" ? "النوع" : "Type", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((m: any) => [safeCell(m.id), safeCell(m.fullName), safeCell(m.phone), safeCell(m.mandoubType), safeCell(m.status)])} />
      </>);
    }
    if (opType === "bookings") {
      const data = filterByDate(bookingData.data || [], "bookingDate");
      if (!data.length) return <EmptyState />;
      const total = data.reduce((sum: number, b: any) => sum + parseFloat(b.totalAmount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "إجمالي الحجوزات" : "Total Bookings", value: data.length },
          { label: language === "ar" ? "إجمالي المبالغ" : "Total Amount", value: total.toFixed(2), color: "text-blue-600" },
          { label: language === "ar" ? "مكتمل" : "Completed", value: data.filter((b: any) => b.bookingStatus === "completed").length, color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "العميل" : "Customer", language === "ar" ? "الخدمة" : "Service", language === "ar" ? "التاريخ" : "Date", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((b: any) => [safeCell(b.id), safeCell(b.customerName), safeCell(b.serviceType), safeCell(b.bookingDate), safeCell(b.totalAmount), safeCell(b.bookingStatus)])} />
      </>);
    }
    if (opType === "complaints") {
      const data = filterByDate(complaintData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "إجمالي الشكاوى" : "Total Complaints", value: data.length },
          { label: language === "ar" ? "جديد" : "New", value: data.filter((c: any) => c.status === "new").length, color: "text-amber-600" },
          { label: language === "ar" ? "تم الحل" : "Resolved", value: data.filter((c: any) => c.status === "resolved").length, color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "العميل" : "Customer", language === "ar" ? "النوع" : "Type", language === "ar" ? "الوصف" : "Description", language === "ar" ? "الحالة" : "Status", language === "ar" ? "التاريخ" : "Date"]}
          rows={data.map((c: any) => [safeCell(c.id), safeCell(c.customerName), safeCell(c.complaintType), safeCell(c.description)?.substring(0, 50), safeCell(c.status), safeCell(c.createdAt)])} />
      </>);
    }
    if (opType === "approvals") {
      const data = filterByDate(approvalData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "إجمالي الطلبات" : "Total Requests", value: data.length },
          { label: language === "ar" ? "بانتظار المراجعة" : "Pending", value: data.filter((a: any) => a.status === "pending_review").length, color: "text-amber-600" },
          { label: language === "ar" ? "معتمد" : "Approved", value: data.filter((a: any) => a.status === "approved").length, color: "text-green-600" },
          { label: language === "ar" ? "مرفوض" : "Rejected", value: data.filter((a: any) => a.status === "rejected").length, color: "text-red-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "النوع" : "Type", language === "ar" ? "الكيان" : "Entity", language === "ar" ? "الحالة" : "Status", language === "ar" ? "التاريخ" : "Date"]}
          rows={data.map((a: any) => [safeCell(a.id), safeCell(a.requestType), safeCell(a.targetEntityType), safeCell(a.status), safeCell(a.createdAt)])} />
      </>);
    }
    return <EmptyState />;
  }

  // ============================================================
  // FINANCIAL REPORT TABLES
  // ============================================================
  function renderFinTable() {
    if (finType === "revenues") {
      const data = revenueData.data || [];
      if (!data.length) return <EmptyState />;
      const total = data.reduce((sum: number, r: any) => sum + parseFloat(r.amount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد الإيرادات" : "Revenue Count", value: data.length },
          { label: language === "ar" ? "إجمالي الإيرادات" : "Total Revenue", value: total.toFixed(2), color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "التاريخ" : "Date", language === "ar" ? "المصدر" : "Source", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "طريقة الدفع" : "Payment", language === "ar" ? "الحالة" : "Status", language === "ar" ? "ملاحظات" : "Notes"]}
          rows={data.map((r: any) => [safeCell(r.id), safeCell(r.revenueDate), safeCell(r.source), safeCell(r.amount), safeCell(r.paymentMethod), safeCell(r.status), safeCell(r.notes)])} />
      </>);
    }
    if (finType === "expenses") {
      const data = filterByDate(expenseData.data || [], "expenseDate");
      if (!data.length) return <EmptyState />;
      const total = data.reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد المصروفات" : "Expense Count", value: data.length },
          { label: language === "ar" ? "إجمالي المصروفات" : "Total Expenses", value: total.toFixed(2), color: "text-red-600" },
          { label: language === "ar" ? "معتمد" : "Approved", value: data.filter((e: any) => e.approvalStatus === "approved").length, color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "التاريخ" : "Date", language === "ar" ? "النوع" : "Type", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "السبب" : "Reason", language === "ar" ? "الحالة" : "Approval", language === "ar" ? "ملاحظات" : "Notes"]}
          rows={data.map((e: any) => [safeCell(e.id), safeCell(e.expenseDate), safeCell(e.expenseType), safeCell(e.amount), safeCell(e.reason), safeCell(e.approvalStatus), safeCell(e.notes)])} />
      </>);
    }
    if (finType === "budgets") {
      const data = filterByDate(budgetData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const totalApproved = data.reduce((sum: number, b: any) => sum + parseFloat(b.approvedAmount || "0"), 0);
      const totalSpent = data.reduce((sum: number, b: any) => sum + parseFloat(b.spentAmount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد الميزانيات" : "Budget Count", value: data.length },
          { label: language === "ar" ? "إجمالي المعتمد" : "Total Approved", value: totalApproved.toFixed(2), color: "text-blue-600" },
          { label: language === "ar" ? "إجمالي المنصرف" : "Total Spent", value: totalSpent.toFixed(2), color: "text-amber-600" },
          { label: language === "ar" ? "المتبقي" : "Remaining", value: (totalApproved - totalSpent).toFixed(2), color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الميزة" : "Feature", language === "ar" ? "المعتمد" : "Approved", language === "ar" ? "المنصرف" : "Spent", language === "ar" ? "المتبقي" : "Remaining", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((b: any) => [safeCell(b.id), safeCell(b.name), safeCell(b.feature), safeCell(b.approvedAmount), safeCell(b.spentAmount), safeCell(b.remainingAmount), safeCell(b.status)])} />
      </>);
    }
    if (finType === "mandoubDues") {
      const data = filterByDate(mandoubDueData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const totalAmount = data.reduce((sum: number, d: any) => sum + parseFloat(d.amount || "0"), 0);
      const totalPaid = data.reduce((sum: number, d: any) => sum + parseFloat(d.paidAmount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد المستحقات" : "Dues Count", value: data.length },
          { label: language === "ar" ? "إجمالي المستحقات" : "Total Dues", value: totalAmount.toFixed(2), color: "text-blue-600" },
          { label: language === "ar" ? "المدفوع" : "Paid", value: totalPaid.toFixed(2), color: "text-green-600" },
          { label: language === "ar" ? "المتبقي" : "Remaining", value: (totalAmount - totalPaid).toFixed(2), color: "text-amber-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "المندوب" : "Mandoub", language === "ar" ? "النوع" : "Type", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "المدفوع" : "Paid", language === "ar" ? "المتبقي" : "Remaining", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((d: any) => [safeCell(d.id), safeCell(d.mandoubId), safeCell(d.earningType), safeCell(d.amount), safeCell(d.paidAmount), safeCell(d.remainingAmount), safeCell(d.paymentStatus)])} />
      </>);
    }
    if (finType === "storeDues") {
      const data = filterByDate(storeDueData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const totalDue = data.reduce((sum: number, d: any) => sum + parseFloat(d.storeDueAmount || "0"), 0);
      const totalPaid = data.reduce((sum: number, d: any) => sum + parseFloat(d.paidAmount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد المستحقات" : "Dues Count", value: data.length },
          { label: language === "ar" ? "إجمالي المستحق" : "Total Due", value: totalDue.toFixed(2), color: "text-blue-600" },
          { label: language === "ar" ? "المدفوع" : "Paid", value: totalPaid.toFixed(2), color: "text-green-600" },
          { label: language === "ar" ? "المتبقي" : "Remaining", value: (totalDue - totalPaid).toFixed(2), color: "text-amber-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "المحل" : "Store", language === "ar" ? "المبيعات" : "Sales", language === "ar" ? "العمولة" : "Commission", language === "ar" ? "مستحق المحل" : "Store Due", language === "ar" ? "المدفوع" : "Paid", language === "ar" ? "المتبقي" : "Remaining", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((d: any) => [safeCell(d.id), safeCell(d.storeId), safeCell(d.totalSalesAmount), safeCell(d.commissionAmount), safeCell(d.storeDueAmount), safeCell(d.paidAmount), safeCell(d.remainingAmount), safeCell(d.settlementStatus)])} />
      </>);
    }
    if (finType === "settlements") {
      const data = filterByDate(settlementData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const totalAmount = data.reduce((sum: number, s: any) => sum + parseFloat(s.amount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد التسويات" : "Settlement Count", value: data.length },
          { label: language === "ar" ? "إجمالي المبالغ" : "Total Amount", value: totalAmount.toFixed(2), color: "text-blue-600" },
          { label: language === "ar" ? "مكتمل" : "Completed", value: data.filter((s: any) => s.status === "completed").length, color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "النوع" : "Type", language === "ar" ? "الكيان" : "Entity", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "السبب" : "Reason", language === "ar" ? "الحالة" : "Status", language === "ar" ? "التاريخ" : "Date"]}
          rows={data.map((s: any) => [safeCell(s.id), safeCell(s.settlementType), safeCell(s.relatedEntityName), safeCell(s.amount), safeCell(s.reason), safeCell(s.status), safeCell(s.settlementDate)])} />
      </>);
    }
    if (finType === "refunds") {
      const data = filterByDate(refundData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      const totalRefund = data.reduce((sum: number, r: any) => sum + parseFloat(r.refundAmount || "0"), 0);
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد الاستردادات" : "Refund Count", value: data.length },
          { label: language === "ar" ? "إجمالي المسترد" : "Total Refunded", value: totalRefund.toFixed(2), color: "text-red-600" },
          { label: language === "ar" ? "مكتمل" : "Completed", value: data.filter((r: any) => r.status === "completed").length, color: "text-green-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "الطلب" : "Order", language === "ar" ? "النوع" : "Type", language === "ar" ? "المبلغ" : "Amount", language === "ar" ? "المسبب" : "Caused By", language === "ar" ? "يغطي" : "Covered By", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((r: any) => [safeCell(r.id), safeCell(r.orderId), safeCell(r.refundType), safeCell(r.refundAmount), safeCell(r.whoCausedIssue), safeCell(r.whoCoversDifference), safeCell(r.status)])} />
      </>);
    }
    if (finType === "coupons") {
      const data = filterByDate(couponData.data || [], "createdAt");
      if (!data.length) return <EmptyState />;
      return (<>
        <SummaryCards items={[
          { label: language === "ar" ? "عدد الكوبونات" : "Coupon Count", value: data.length },
          { label: language === "ar" ? "نشط" : "Active", value: data.filter((c: any) => c.status === "active").length, color: "text-green-600" },
          { label: language === "ar" ? "منتهي" : "Expired", value: data.filter((c: any) => c.status === "expired").length, color: "text-red-600" },
        ]} />
        <ReportTable headers={["ID", language === "ar" ? "الاسم" : "Name", language === "ar" ? "الكود" : "Code", language === "ar" ? "النوع" : "Type", language === "ar" ? "القيمة" : "Value", language === "ar" ? "الاستخدام" : "Usage", language === "ar" ? "الحد" : "Limit", language === "ar" ? "الحالة" : "Status"]}
          rows={data.map((c: any) => [safeCell(c.id), safeCell(c.name), safeCell(c.code), safeCell(c.discountType), safeCell(c.discountValue), safeCell(c.usageCount), safeCell(c.usageLimit), safeCell(c.status)])} />
      </>);
    }
    return <EmptyState />;
  }

  // ============================================================
  // REUSABLE COMPONENTS
  // ============================================================
  function EmptyState() {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{language === "ar" ? "لا توجد بيانات متاحة لهذا التقرير" : "No data available for this report"}</p>
      </div>
    );
  }

  function ReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              {headers.map((h, i) => <th key={i} className="text-start p-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/50">
                {row.map((cell, j) => <td key={j} className="p-2">{cell || "-"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 100 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {language === "ar" ? `عرض ${rows.length} صف. يتم تصدير جميع الصفوف.` : `Showing ${rows.length} rows. All rows will be exported.`}
          </p>
        )}
      </div>
    );
  }

  function ExportButtons({ onExport }: { onExport: (format: "csv" | "excel") => void }) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onExport("csv")}><Download className="w-4 h-4 me-1" />{language === "ar" ? "CSV" : "CSV"}</Button>
        <Button variant="outline" size="sm" onClick={() => onExport("excel")}><FileSpreadsheet className="w-4 h-4 me-1" />{language === "ar" ? "Excel" : "Excel"}</Button>
        <Button variant="outline" size="sm" onClick={printReport}><Printer className="w-4 h-4 me-1" />{language === "ar" ? "طباعة" : "Print"}</Button>
      </div>
    );
  }

  // Get current report title for print header
  const currentOpTitle = opReportTypes.find(r => r.value === opType)?.label || "";
  const currentFinTitle = finReportTypes.find(r => r.value === finType)?.label || "";
  const selectedWilayatName = wilayats.data?.find((w: any) => String(w.id) === wilayatFilter)?.nameAr || "";

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6 print:space-y-2">
      {/* Print Header - only visible when printing */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MAKSAB / مكسب</h1>
            <p className="text-sm text-muted-foreground">{language === "ar" ? "نظام إدارة العمليات" : "Operations Management System"}</p>
          </div>
          <div className="text-end text-sm">
            <p className="font-medium">{language === "ar" ? "تاريخ التقرير" : "Report Date"}: {new Date().toLocaleDateString(language === "ar" ? "ar-OM" : "en-US")}</p>
            {user?.name && <p>{language === "ar" ? "أنشئ بواسطة" : "Generated by"}: {user.name}</p>}
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          {selectedWilayatName && <span><strong>{language === "ar" ? "الولاية" : "Wilayat"}:</strong> {selectedWilayatName}</span>}
          {dateFrom && <span><strong>{language === "ar" ? "من" : "From"}:</strong> {dateFrom}</span>}
          {dateTo && <span><strong>{language === "ar" ? "إلى" : "To"}:</strong> {dateTo}</span>}
        </div>
      </div>

      <h1 className="text-2xl font-bold print:hidden">{t("nav.reports")}</h1>

      {/* Filters Card */}
      <Card className="print:hidden">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{language === "ar" ? "الولاية" : "Wilayat"}</label>
              <Select value={wilayatFilter} onValueChange={setWilayatFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder={language === "ar" ? "كل الولايات" : "All Wilayats"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "كل الولايات" : "All Wilayats"}</SelectItem>
                  {(wilayats.data || []).map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{language === "ar" ? "من تاريخ" : "From Date"}</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{language === "ar" ? "إلى تاريخ" : "To Date"}</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
            {(wilayatFilter || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setWilayatFilter(""); setDateFrom(""); setDateTo(""); }}>
                {language === "ar" ? "مسح الفلاتر" : "Clear Filters"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="operational">
        <TabsList className="print:hidden">
          <TabsTrigger value="operational"><BarChart3 className="w-4 h-4 me-1" />{language === "ar" ? "التقارير التشغيلية" : "Operational"}</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="w-4 h-4 me-1" />{language === "ar" ? "التقارير المالية" : "Financial"}</TabsTrigger>
        </TabsList>

        <TabsContent value="operational" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
            <div className="flex gap-2 flex-wrap">
              {opReportTypes.map(rt => (
                <Button key={rt.value} variant={opType === rt.value ? "default" : "outline"} size="sm" onClick={() => setOpType(rt.value)}>
                  <rt.icon className="w-4 h-4 me-1" />{rt.label}
                </Button>
              ))}
            </div>
            <ExportButtons onExport={handleOpExport} />
          </div>
          {/* Print report type title */}
          <div className="hidden print:block text-lg font-bold mb-2">{currentOpTitle}</div>
          <Card><CardContent className="pt-4">{renderOpTable()}</CardContent></Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
            <div className="flex gap-2 flex-wrap">
              {finReportTypes.map(rt => (
                <Button key={rt.value} variant={finType === rt.value ? "default" : "outline"} size="sm" onClick={() => setFinType(rt.value)}>
                  <rt.icon className="w-4 h-4 me-1" />{rt.label}
                </Button>
              ))}
            </div>
            <ExportButtons onExport={handleFinExport} />
          </div>
          {/* Print report type title */}
          <div className="hidden print:block text-lg font-bold mb-2">{currentFinTitle}</div>
          <Card><CardContent className="pt-4">{renderFinTable()}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
