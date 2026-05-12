import { useState, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, Store, Package, Users, ShoppingCart,
  CreditCard, History, CheckCircle2, XCircle, AlertTriangle,
  Download, Loader2, ArrowLeft, Eye, Truck, BarChart3, Wallet,
  RotateCcw, DollarSign, CalendarCheck, Tag, Receipt, Building2, Scale, MessageSquareWarning
} from "lucide-react";
import * as XLSX from "xlsx";

type ImportType =
  | "stores" | "menu_products" | "customers" | "orders" | "payments"
  | "mandoubs" | "mandoub_performance" | "mandoub_dues" | "refunds" | "revenues"
  | "bookings" | "coupons" | "expenses" | "store_dues" | "settlements" | "complaints";
type ImportStep = "select" | "upload" | "preview" | "result";
type DuplicateHandling = "skip" | "import_anyway" | "update_existing";

interface ParseResult {
  batchId: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  preview: any[];
  errors: any[];
  duplicates: any[];
}

const IMPORT_TYPES: { type: ImportType; icon: any; labelKey: string; descKey: string; requiredField: string; category: "p1" | "p2" | "p3" }[] = [
  // Priority 1
  { type: "stores", icon: Store, labelKey: "import.stores", descKey: "import.storesDesc", requiredField: "اسم المحل / Store Name", category: "p1" },
  { type: "menu_products", icon: Package, labelKey: "import.products", descKey: "import.productsDesc", requiredField: "اسم المنتج + اسم المحل", category: "p1" },
  { type: "customers", icon: Users, labelKey: "import.customers", descKey: "import.customersDesc", requiredField: "رقم العميل / Customer Phone", category: "p1" },
  { type: "orders", icon: ShoppingCart, labelKey: "import.orders", descKey: "import.ordersDesc", requiredField: "رقم الطلب / Order Number", category: "p1" },
  { type: "payments", icon: CreditCard, labelKey: "import.payments", descKey: "import.paymentsDesc", requiredField: "مرجع الدفع أو (رقم الطلب + المبلغ)", category: "p1" },
  // Priority 2
  { type: "mandoubs", icon: Truck, labelKey: "import.mandoubs", descKey: "import.mandoubsDesc", requiredField: "اسم المندوب + رقم الهاتف", category: "p2" },
  { type: "mandoub_performance", icon: BarChart3, labelKey: "import.mandoubPerformance", descKey: "import.mandoubPerformanceDesc", requiredField: "اسم المندوب + الفترة", category: "p2" },
  { type: "mandoub_dues", icon: Wallet, labelKey: "import.mandoubDues", descKey: "import.mandoubDuesDesc", requiredField: "اسم المندوب + نوع الاستحقاق + المبلغ", category: "p2" },
  { type: "refunds", icon: RotateCcw, labelKey: "import.refunds", descKey: "import.refundsDesc", requiredField: "رقم الطلب + نوع الاسترجاع + المبلغ", category: "p2" },
  { type: "revenues", icon: DollarSign, labelKey: "import.revenues", descKey: "import.revenuesDesc", requiredField: "المصدر + المبلغ", category: "p2" },
  // Priority 3
  { type: "bookings", icon: CalendarCheck, labelKey: "import.bookings", descKey: "import.bookingsDesc", requiredField: "نوع الخدمة + تاريخ الحجز", category: "p3" },
  { type: "coupons", icon: Tag, labelKey: "import.coupons", descKey: "import.couponsDesc", requiredField: "اسم الكوبون + الكود", category: "p3" },
  { type: "expenses", icon: Receipt, labelKey: "import.expenses", descKey: "import.expensesDesc", requiredField: "نوع المصروف + المبلغ", category: "p3" },
  { type: "store_dues", icon: Building2, labelKey: "import.storeDues", descKey: "import.storeDuesDesc", requiredField: "اسم المحل", category: "p3" },
  { type: "settlements", icon: Scale, labelKey: "import.settlements", descKey: "import.settlementsDesc", requiredField: "نوع التسوية + المبلغ", category: "p3" },
  { type: "complaints", icon: MessageSquareWarning, labelKey: "import.complaints", descKey: "import.complaintsDesc", requiredField: "نوع الشكوى", category: "p3" },
];

// Template headers for each import type
const TEMPLATE_HEADERS: Record<ImportType, string[]> = {
  stores: ["اسم المحل", "اسم المحل بالإنجليزي", "اسم التاجر", "رقم التاجر", "رقم الواتساب", "فئة المحل", "حالة التواصل", "موافقة التاجر", "إضافة في النظام", "تفعيل المحل", "التصنيف", "الولاية", "المنطقة", "الموظف المسؤول", "رابط خرائط جوجل", "العنوان", "ملاحظات"],
  menu_products: ["اسم المحل", "قسم المنيو", "اسم المنتج", "السعر", "وصف المنتج", "حالة المنتج", "يظهر في التطبيق", "رابط الصورة", "ملاحظات", "ترتيب العرض"],
  customers: ["اسم العميل", "رقم العميل", "البريد الإلكتروني", "الولاية", "العنوان", "حالة العميل", "ملاحظات"],
  orders: ["رقم الطلب", "تاريخ الطلب", "اسم العميل", "رقم العميل", "الولاية", "العنوان", "نوع الطلب", "اسم المحل", "تصنيف المحل", "اسم المندوب", "رقم المندوب", "الموظف المسؤول", "حالة الطلب", "مبلغ الطلب", "رسوم التوصيل", "مبلغ الخصم", "إجمالي المدفوع", "طريقة الدفع", "حالة الدفع", "ملاحظات العميل", "ملاحظات داخلية"],
  payments: ["مرجع الدفع", "رقم الطلب", "رقم الحجز", "اسم العميل", "رقم العميل", "المبلغ", "طريقة الدفع", "حالة الدفع", "تاريخ الدفع", "هل تم الاسترجاع", "مبلغ الاسترجاع", "ملاحظات"],
  mandoubs: ["اسم المندوب", "رقم الهاتف", "البريد الإلكتروني", "نوع المندوب", "الولاية", "حالة المندوب", "ملاحظات"],
  mandoub_performance: ["اسم المندوب", "رقم المندوب", "الفترة", "تاريخ البداية", "تاريخ النهاية", "عدد الطلبات المكتملة", "عدد الطلبات الملغاة", "عدد الطلبات المتأخرة", "إجمالي الإيرادات", "متوسط وقت التوصيل", "تقييم العملاء", "معدل القبول", "ملاحظات"],
  mandoub_dues: ["اسم المندوب", "رقم المندوب", "نوع الاستحقاق", "المبلغ", "الوصف", "حالة الدفع", "تاريخ الاستحقاق", "تاريخ الدفع", "مرجع الدفع", "ملاحظات"],
  refunds: ["رقم الطلب", "نوع الاسترجاع", "سبب الاسترجاع", "المبلغ الأصلي", "مبلغ الاسترجاع", "المتسبب", "المتحمل", "حالة الاسترجاع", "تاريخ الاسترجاع", "ملاحظات"],
  revenues: ["المصدر", "الوصف", "المبلغ", "طريقة الدفع", "تاريخ الإيراد", "مرجع الدفع", "الولاية", "حالة الإيراد", "ملاحظات"],
  bookings: ["نوع الخدمة", "اسم العميل", "رقم العميل", "تاريخ الحجز", "وقت البداية", "وقت النهاية", "المبلغ الإجمالي", "العربون", "المتبقي", "حالة الحجز", "حالة الدفع", "الولاية", "ملاحظات"],
  coupons: ["اسم الكوبون", "كود الكوبون", "نوع الخصم", "قيمة الخصم", "تاريخ البداية", "تاريخ النهاية", "الولاية", "اسم المحل", "من يتحمل التكلفة", "حد الاستخدام", "حد الاستخدام للعميل", "الحد الأدنى للطلب", "الحالة", "ملاحظات"],
  expenses: ["نوع المصروف", "المبلغ", "تاريخ المصروف", "طريقة الدفع", "السبب", "نوع المستفيد", "اسم المستفيد", "الولاية", "اسم الميزانية", "حالة الموافقة", "ملاحظات"],
  store_dues: ["اسم المحل", "رقم الطلب", "إجمالي المبيعات", "نسبة العمولة", "مبلغ العمولة", "مستحقات المحل", "المبلغ المدفوع", "المبلغ المتبقي", "حالة التسوية", "تاريخ التسوية", "ملاحظات"],
  settlements: ["نوع التسوية", "نوع الطرف", "اسم الطرف", "رقم الطلب", "رقم الحجز", "المبلغ", "السبب", "الحالة", "تاريخ التسوية", "ملاحظات"],
  complaints: ["نوع الشكوى", "اسم العميل", "رقم العميل", "رقم الطلب", "رقم الحجز", "اسم المحل", "اسم المندوب", "الوصف", "الحالة", "ملاحظات الحل"],
};

export default function DataImport() {
  const { t, language } = useI18n();
  const isRtl = language === "ar";

  const [activeTab, setActiveTab] = useState<"import" | "history">("import");
  const [step, setStep] = useState<ImportStep>("select");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>("skip");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // P1 tRPC mutations
  const storesParse = trpc.dataImport.stores.parse.useMutation();
  const storesConfirm = trpc.dataImport.stores.confirm.useMutation();
  const productsParse = trpc.dataImport.products.parse.useMutation();
  const productsConfirm = trpc.dataImport.products.confirm.useMutation();
  const customersParse = trpc.dataImport.customers.parse.useMutation();
  const customersConfirm = trpc.dataImport.customers.confirm.useMutation();
  const ordersParse = trpc.dataImport.orders.parse.useMutation();
  const ordersConfirm = trpc.dataImport.orders.confirm.useMutation();
  const paymentsParse = trpc.dataImport.payments.parse.useMutation();
  const paymentsConfirm = trpc.dataImport.payments.confirm.useMutation();

  // P2 tRPC mutations
  const mandoubsParse = trpc.dataImportP2.mandoubs.parse.useMutation();
  const mandoubsConfirm = trpc.dataImportP2.mandoubs.confirm.useMutation();
  const mandoubPerfParse = trpc.dataImportP2.mandoubPerformance.parse.useMutation();
  const mandoubPerfConfirm = trpc.dataImportP2.mandoubPerformance.confirm.useMutation();
  const mandoubDuesParse = trpc.dataImportP2.mandoubDues.parse.useMutation();
  const mandoubDuesConfirm = trpc.dataImportP2.mandoubDues.confirm.useMutation();
  const refundsParse = trpc.dataImportP2.refunds.parse.useMutation();
  const refundsConfirm = trpc.dataImportP2.refunds.confirm.useMutation();
  const revenuesParse = trpc.dataImportP2.revenues.parse.useMutation();
  const revenuesConfirm = trpc.dataImportP2.revenues.confirm.useMutation();

  // P3 tRPC mutations
  const bookingsParse = trpc.dataImportP3.bookings.parse.useMutation();
  const bookingsConfirm = trpc.dataImportP3.bookings.confirm.useMutation();
  const couponsParse = trpc.dataImportP3.coupons.parse.useMutation();
  const couponsConfirm = trpc.dataImportP3.coupons.confirm.useMutation();
  const expensesParse = trpc.dataImportP3.expenses.parse.useMutation();
  const expensesConfirm = trpc.dataImportP3.expenses.confirm.useMutation();
  const storeDuesParse = trpc.dataImportP3.storeDues.parse.useMutation();
  const storeDuesConfirm = trpc.dataImportP3.storeDues.confirm.useMutation();
  const settlementsParse = trpc.dataImportP3.settlements.parse.useMutation();
  const settlementsConfirm = trpc.dataImportP3.settlements.confirm.useMutation();
  const complaintsParse = trpc.dataImportP3.complaints.parse.useMutation();
  const complaintsConfirm = trpc.dataImportP3.complaints.confirm.useMutation();

  const historyQuery = trpc.dataImport.history.list.useQuery(
    activeTab === "history" ? {} : undefined,
    { enabled: activeTab === "history" }
  );

  const resetImport = useCallback(() => {
    setStep("select");
    setSelectedType(null);
    setParseResult(null);
    setConfirmResult(null);
    setIsUploading(false);
    setIsConfirming(false);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;

    // Validate file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "xls") {
      toast.error(isRtl ? "صيغة .xls غير مدعومة. يرجى تحويل الملف إلى .xlsx أو .csv" : "The .xls format is not supported. Please convert to .xlsx or .csv");
      return;
    }
    if (!["xlsx", "csv"].includes(ext || "")) {
      toast.error(isRtl ? "يرجى رفع ملف بصيغة .xlsx أو .csv" : "Please upload a .xlsx or .csv file");
      return;
    }

    setIsUploading(true);

    try {
      // Parse file using xlsx library
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (jsonData.length < 2) {
        toast.error(isRtl ? "الملف فارغ أو لا يحتوي على بيانات" : "File is empty or has no data");
        setIsUploading(false);
        return;
      }

      const headers = jsonData[0].map((h: any) => String(h).trim());
      const rows = jsonData.slice(1).filter((row: any[]) => row.some((cell: any) => cell !== "" && cell !== null && cell !== undefined));

      if (rows.length === 0) {
        toast.error(isRtl ? "لا توجد صفوف بيانات في الملف" : "No data rows found in the file");
        setIsUploading(false);
        return;
      }

      // Call the appropriate parse mutation
      const input = { rows, headers, fileName: file.name, duplicateHandling };
      let result: ParseResult;

      switch (selectedType) {
        case "stores":
          result = await storesParse.mutateAsync(input);
          break;
        case "menu_products":
          result = await productsParse.mutateAsync(input);
          break;
        case "customers":
          result = await customersParse.mutateAsync(input);
          break;
        case "orders":
          result = await ordersParse.mutateAsync({ ...input, createMissingStores: false });
          break;
        case "payments":
          result = await paymentsParse.mutateAsync(input);
          break;
        case "mandoubs":
          result = await mandoubsParse.mutateAsync(input);
          break;
        case "mandoub_performance":
          result = await mandoubPerfParse.mutateAsync(input);
          break;
        case "mandoub_dues":
          result = await mandoubDuesParse.mutateAsync(input);
          break;
        case "refunds":
          result = await refundsParse.mutateAsync(input);
          break;
        case "revenues":
          result = await revenuesParse.mutateAsync(input);
          break;
        case "bookings":
          result = await bookingsParse.mutateAsync(input);
          break;
        case "coupons":
          result = await couponsParse.mutateAsync(input);
          break;
        case "expenses":
          result = await expensesParse.mutateAsync(input);
          break;
        case "store_dues":
          result = await storeDuesParse.mutateAsync(input);
          break;
        case "settlements":
          result = await settlementsParse.mutateAsync(input);
          break;
        case "complaints":
          result = await complaintsParse.mutateAsync(input);
          break;
        default:
          throw new Error("Unknown import type");
      }

      setParseResult(result);
      setStep("preview");
      toast.success(isRtl ? `تم تحليل ${result.totalRows} صف بنجاح` : `Successfully parsed ${result.totalRows} rows`);
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "حدث خطأ أثناء تحليل الملف" : "Error parsing file"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [selectedType, duplicateHandling, isRtl]);

  const handleConfirmImport = useCallback(async () => {
    if (!parseResult || !selectedType) return;
    setIsConfirming(true);

    try {
      const input = { batchId: parseResult.batchId, duplicateHandling };
      let result: any;

      switch (selectedType) {
        case "stores":
          result = await storesConfirm.mutateAsync(input);
          break;
        case "menu_products":
          result = await productsConfirm.mutateAsync(input);
          break;
        case "customers":
          result = await customersConfirm.mutateAsync(input);
          break;
        case "orders":
          result = await ordersConfirm.mutateAsync(input);
          break;
        case "payments":
          result = await paymentsConfirm.mutateAsync(input);
          break;
        case "mandoubs":
          result = await mandoubsConfirm.mutateAsync(input);
          break;
        case "mandoub_performance":
          result = await mandoubPerfConfirm.mutateAsync(input);
          break;
        case "mandoub_dues":
          result = await mandoubDuesConfirm.mutateAsync(input);
          break;
        case "refunds":
          result = await refundsConfirm.mutateAsync(input);
          break;
        case "revenues":
          result = await revenuesConfirm.mutateAsync(input);
          break;
        case "bookings":
          result = await bookingsConfirm.mutateAsync(input);
          break;
        case "coupons":
          result = await couponsConfirm.mutateAsync(input);
          break;
        case "expenses":
          result = await expensesConfirm.mutateAsync(input);
          break;
        case "store_dues":
          result = await storeDuesConfirm.mutateAsync(input);
          break;
        case "settlements":
          result = await settlementsConfirm.mutateAsync(input);
          break;
        case "complaints":
          result = await complaintsConfirm.mutateAsync(input);
          break;
      }

      setConfirmResult(result);
      setStep("result");
      toast.success(isRtl ? `تم استيراد ${result.importedCount} سجل بنجاح` : `Successfully imported ${result.importedCount} records`);
    } catch (err: any) {
      toast.error(err.message || (isRtl ? "حدث خطأ أثناء الاستيراد" : "Error during import"));
    } finally {
      setIsConfirming(false);
    }
  }, [parseResult, selectedType, duplicateHandling, isRtl]);

  const downloadTemplate = useCallback((type: ImportType) => {
    const headers = TEMPLATE_HEADERS[type] || [];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${type}_template.xlsx`);
    toast.success(isRtl ? "تم تحميل القالب" : "Template downloaded");
  }, [isRtl]);

  // ============================================================
  // RENDER: IMPORT TYPE SELECTION
  // ============================================================
  const renderTypeSelection = () => {
    const p1Types = IMPORT_TYPES.filter(t => t.category === "p1");
    const p2Types = IMPORT_TYPES.filter(t => t.category === "p2");
    const p3Types = IMPORT_TYPES.filter(t => t.category === "p3");

    return (
      <div className="space-y-6">
        {/* P1: Core Data */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {isRtl ? "البيانات الأساسية" : "Core Data"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {p1Types.map(({ type, icon: Icon, labelKey, descKey, requiredField }) => (
              <Card
                key={type}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => { setSelectedType(type); setStep("upload"); }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{t(labelKey)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{t(descKey)}</CardDescription>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isRtl ? "الحقل المطلوب: " : "Required: "}{requiredField}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* P2: Mandoubs & Finance */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {isRtl ? "المناديب والمالية" : "Mandoubs & Finance"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {p2Types.map(({ type, icon: Icon, labelKey, descKey, requiredField }) => (
              <Card
                key={type}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => { setSelectedType(type); setStep("upload"); }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                      <Icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-base">{t(labelKey)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{t(descKey)}</CardDescription>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isRtl ? "الحقل المطلوب: " : "Required: "}{requiredField}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* P3: Bookings, Coupons & Finance */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {isRtl ? "الحجوزات والكوبونات والتسويات" : "Bookings, Coupons & Settlements"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {p3Types.map(({ type, icon: Icon, labelKey, descKey, requiredField }) => (
              <Card
                key={type}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => { setSelectedType(type); setStep("upload"); }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                      <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base">{t(labelKey)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{t(descKey)}</CardDescription>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isRtl ? "الحقل المطلوب: " : "Required: "}{requiredField}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: UPLOAD STEP
  // ============================================================
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {t(IMPORT_TYPES.find(i => i.type === selectedType)?.labelKey || "")}
        </h3>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Duplicate handling */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isRtl ? "معالجة التكرارات" : "Duplicate Handling"}
            </label>
            <Select value={duplicateHandling} onValueChange={(v) => setDuplicateHandling(v as DuplicateHandling)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">{isRtl ? "تخطي التكرارات" : "Skip duplicates"}</SelectItem>
                <SelectItem value="import_anyway">{isRtl ? "استيراد على أي حال" : "Import anyway"}</SelectItem>
                <SelectItem value="update_existing">{isRtl ? "تحديث الموجود" : "Update existing"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File upload area */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{isRtl ? "جاري تحليل الملف..." : "Parsing file..."}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">{isRtl ? "اسحب الملف هنا أو اضغط للرفع" : "Drag file here or click to upload"}</p>
                <p className="text-sm text-muted-foreground">{isRtl ? "يدعم .xlsx و .csv فقط" : "Supports .xlsx and .csv only"}</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>

          {/* Download template */}
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => selectedType && downloadTemplate(selectedType)}>
              <Download className="h-4 w-4 me-2" />
              {isRtl ? "تحميل القالب" : "Download Template"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================
  // RENDER: PREVIEW STEP
  // ============================================================
  const renderPreviewStep = () => {
    if (!parseResult) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {isRtl ? "معاينة البيانات" : "Data Preview"}
          </h3>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-2xl font-bold">{parseResult.totalRows}</div>
            <div className="text-sm text-muted-foreground">{isRtl ? "إجمالي الصفوف" : "Total Rows"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{parseResult.validRows}</div>
            <div className="text-sm text-muted-foreground">{isRtl ? "صالحة" : "Valid"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{parseResult.invalidRows}</div>
            <div className="text-sm text-muted-foreground">{isRtl ? "غير صالحة" : "Invalid"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{parseResult.duplicateRows}</div>
            <div className="text-sm text-muted-foreground">{isRtl ? "مكررة" : "Duplicates"}</div>
          </Card>
        </div>

        {/* Preview table */}
        {parseResult.preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {isRtl ? `معاينة أول ${Math.min(parseResult.preview.length, 20)} سجل` : `Preview of first ${Math.min(parseResult.preview.length, 20)} records`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-start border-b">#</th>
                      {Object.keys(parseResult.preview[0]?.data || {}).slice(0, 8).map((key) => (
                        <th key={key} className="p-2 text-start border-b whitespace-nowrap">{key}</th>
                      ))}
                      {parseResult.preview[0]?.isDuplicate !== undefined && (
                        <th className="p-2 text-start border-b">{isRtl ? "مكرر" : "Dup"}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.preview.map((row, idx) => (
                      <tr key={idx} className={row.isDuplicate ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                        <td className="p-2 border-b">{row.rowNumber}</td>
                        {Object.values(row.data || {}).slice(0, 8).map((val: any, i) => (
                          <td key={i} className="p-2 border-b max-w-[200px] truncate">{val ?? "-"}</td>
                        ))}
                        {row.isDuplicate !== undefined && (
                          <td className="p-2 border-b">
                            {row.isDuplicate && <Badge variant="outline" className="text-yellow-600">⚠️</Badge>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {parseResult.errors.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-600 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {isRtl ? `${parseResult.errors.length} صف غير صالح` : `${parseResult.errors.length} invalid rows`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {parseResult.errors.slice(0, 20).map((err, idx) => (
                  <div key={idx} className="text-sm flex gap-2">
                    <span className="text-muted-foreground">{isRtl ? "صف" : "Row"} {err.rowNumber}:</span>
                    <span className="text-red-600">{err.reason}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setStep("upload")}>
            {isRtl ? "رجوع" : "Back"}
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={isConfirming || parseResult.validRows === 0}
          >
            {isConfirming && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isRtl ? `تأكيد استيراد ${parseResult.validRows} سجل` : `Confirm import of ${parseResult.validRows} records`}
          </Button>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: RESULT STEP
  // ============================================================
  const renderResultStep = () => {
    if (!confirmResult) return null;
    const isSuccess = confirmResult.status === "imported";

    return (
      <div className="space-y-6">
        <Card className={isSuccess ? "border-green-200" : "border-yellow-200"}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              {isSuccess ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
              )}
              <h3 className="text-xl font-semibold">
                {isSuccess
                  ? (isRtl ? "تم الاستيراد بنجاح" : "Import Successful")
                  : (isRtl ? "تم الاستيراد مع بعض الأخطاء" : "Import Completed with Errors")}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{isRtl ? "تم استيراد" : "Imported"}:</span>
                  <span className="font-bold text-green-600 ms-2">{confirmResult.importedCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{isRtl ? "تم تخطي" : "Skipped"}:</span>
                  <span className="font-bold text-yellow-600 ms-2">{confirmResult.skippedCount}</span>
                </div>
              </div>
              {confirmResult.errors?.length > 0 && (
                <div className="w-full text-start mt-4">
                  <p className="text-sm font-medium text-red-600 mb-2">
                    {isRtl ? "الأخطاء:" : "Errors:"}
                  </p>
                  <div className="max-h-[150px] overflow-y-auto space-y-1">
                    {confirmResult.errors.slice(0, 10).map((err: any, idx: number) => (
                      <div key={idx} className="text-xs text-red-500">
                        {isRtl ? "صف" : "Row"} {err.rowNumber}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={resetImport}>
            {isRtl ? "استيراد آخر" : "New Import"}
          </Button>
          <Button onClick={() => setActiveTab("history")}>
            <History className="h-4 w-4 me-2" />
            {isRtl ? "سجل الاستيراد" : "Import History"}
          </Button>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: HISTORY TAB
  // ============================================================
  const renderHistory = () => {
    const batches = historyQuery.data || [];

    const importTypeLabel = (type: string) => {
      const labels: Record<string, { ar: string; en: string }> = {
        stores: { ar: "المحلات", en: "Stores" },
        menu_products: { ar: "المنتجات", en: "Products" },
        customers: { ar: "العملاء", en: "Customers" },
        orders: { ar: "الطلبات", en: "Orders" },
        payments: { ar: "المدفوعات", en: "Payments" },
        mandoubs: { ar: "المناديب", en: "Mandoubs" },
        mandoub_performance: { ar: "أداء المناديب", en: "Performance" },
        mandoub_dues: { ar: "مستحقات المناديب", en: "Dues" },
        refunds: { ar: "الاسترجاعات", en: "Refunds" },
        revenues: { ar: "الإيرادات", en: "Revenues" },
      };
      return labels[type]?.[isRtl ? "ar" : "en"] || type;
    };

    return (
      <div className="space-y-4">
        {batches.length === 0 ? (
          <Card className="p-8 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{isRtl ? "لا يوجد سجل استيراد" : "No import history"}</p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">{isRtl ? "النوع" : "Type"}</th>
                  <th className="p-3 text-start">{isRtl ? "الملف" : "File"}</th>
                  <th className="p-3 text-start">{isRtl ? "بواسطة" : "By"}</th>
                  <th className="p-3 text-start">{isRtl ? "الإجمالي" : "Total"}</th>
                  <th className="p-3 text-start">{isRtl ? "تم استيراد" : "Imported"}</th>
                  <th className="p-3 text-start">{isRtl ? "تخطي" : "Skipped"}</th>
                  <th className="p-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="p-3 text-start">{isRtl ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch: any) => (
                  <tr key={batch.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{batch.id}</td>
                    <td className="p-3">
                      <Badge variant="outline">{importTypeLabel(batch.importType)}</Badge>
                    </td>
                    <td className="p-3 max-w-[150px] truncate">{batch.fileName}</td>
                    <td className="p-3">{batch.uploadedByName || "-"}</td>
                    <td className="p-3">{batch.totalRows}</td>
                    <td className="p-3 text-green-600">{batch.importedRows}</td>
                    <td className="p-3 text-yellow-600">{batch.skippedRows}</td>
                    <td className="p-3">
                      <Badge
                        variant={batch.status === "imported" ? "default" : batch.status === "imported_with_errors" ? "secondary" : "outline"}
                        className={batch.status === "imported" ? "bg-green-100 text-green-700" : batch.status === "failed" ? "bg-red-100 text-red-700" : ""}
                      >
                        {batch.status === "imported" ? (isRtl ? "مكتمل" : "Done") :
                         batch.status === "imported_with_errors" ? (isRtl ? "مع أخطاء" : "With Errors") :
                         batch.status === "failed" ? (isRtl ? "فشل" : "Failed") :
                         batch.status === "cancelled" ? (isRtl ? "ملغي" : "Cancelled") :
                         (isRtl ? "معلق" : "Pending")}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleDateString(isRtl ? "ar-OM" : "en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="p-4 md:p-6 space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isRtl ? "استيراد البيانات" : "Data Import"}</h1>
          <p className="text-muted-foreground text-sm">
            {isRtl ? "استيراد بيانات من ملفات Excel أو CSV" : "Import data from Excel or CSV files"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "import" ? "default" : "ghost"}
          size="sm"
          onClick={() => { setActiveTab("import"); resetImport(); }}
        >
          <Upload className="h-4 w-4 me-2" />
          {isRtl ? "استيراد جديد" : "New Import"}
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("history")}
        >
          <History className="h-4 w-4 me-2" />
          {isRtl ? "سجل الاستيراد" : "Import History"}
        </Button>
      </div>

      {/* Content */}
      {activeTab === "import" && (
        <>
          {step === "select" && renderTypeSelection()}
          {step === "upload" && renderUploadStep()}
          {step === "preview" && renderPreviewStep()}
          {step === "result" && renderResultStep()}
        </>
      )}
      {activeTab === "history" && renderHistory()}
    </div>
  );
}
