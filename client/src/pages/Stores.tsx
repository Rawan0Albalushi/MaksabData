import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Archive, Pencil, Power, PowerOff } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Fixed enum values matching database schema exactly
const COMMUNICATION_STATUS_OPTIONS = [
  { value: "yes", labelAr: "نعم", labelEn: "Yes" },
  { value: "no", labelAr: "لا", labelEn: "No" },
  { value: "no_response", labelAr: "لم يتم الرد", labelEn: "No Response" },
  { value: "needs_follow_up", labelAr: "يحتاج متابعة", labelEn: "Needs Follow Up" },
  { value: "not_specified", labelAr: "غير محدد", labelEn: "Not Specified" },
];

const MERCHANT_APPROVAL_OPTIONS = [
  { value: "yes", labelAr: "نعم", labelEn: "Yes" },
  { value: "no", labelAr: "لا", labelEn: "No" },
  { value: "waiting_response", labelAr: "بانتظار الرد", labelEn: "Waiting Response" },
  { value: "not_specified", labelAr: "غير محدد", labelEn: "Not Specified" },
];

const ADDED_IN_SYSTEM_OPTIONS = [
  { value: "yes", labelAr: "نعم", labelEn: "Yes" },
  { value: "no", labelAr: "لا", labelEn: "No" },
  { value: "in_progress", labelAr: "قيد الإضافة", labelEn: "In Progress" },
  { value: "missing_data", labelAr: "بيانات ناقصة", labelEn: "Missing Data" },
  { value: "not_specified", labelAr: "غير محدد", labelEn: "Not Specified" },
];

const ACTIVATION_STATUS_OPTIONS = [
  { value: "active", labelAr: "مفعل", labelEn: "Active" },
  { value: "inactive", labelAr: "غير مفعل", labelEn: "Inactive" },
  { value: "pending_activation", labelAr: "بانتظار التفعيل", labelEn: "Pending Activation" },
  { value: "temporarily_stopped", labelAr: "موقوف مؤقتاً", labelEn: "Temporarily Stopped" },
  { value: "hidden", labelAr: "مخفي", labelEn: "Hidden" },
  { value: "not_specified", labelAr: "غير محدد", labelEn: "Not Specified" },
];

const CLASSIFICATION_OPTIONS = [
  { value: "contracted", labelAr: "عقود", labelEn: "Contracted" },
  { value: "ezhalha", labelAr: "ازهلها", labelEn: "Ezhalha" },
  { value: "not_specified", labelAr: "غير محدد", labelEn: "Not Specified" },
];

const CATEGORY_OPTIONS = [
  { value: "restaurant", labelAr: "مطعم", labelEn: "Restaurant" },
  { value: "cafe", labelAr: "كوفي", labelEn: "Café" },
  { value: "supermarket", labelAr: "سوبرماركت", labelEn: "Supermarket" },
  { value: "sweets_shop", labelAr: "محل حلويات", labelEn: "Sweets Shop" },
  { value: "bakery", labelAr: "مخبز", labelEn: "Bakery" },
  { value: "store", labelAr: "متجر", labelEn: "Store" },
  { value: "other", labelAr: "غيره", labelEn: "Other" },
];

export default function Stores() {
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [activationFilter, setActivationFilter] = useState<string>("all");
  const [communicationFilter, setCommunicationFilter] = useState<string>("all");
  const [merchantApprovalFilter, setMerchantApprovalFilter] = useState<string>("all");
  const [addedInSystemFilter, setAddedInSystemFilter] = useState<string>("all");
  const [wilayatFilter, setWilayatFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const stores = trpc.store.list.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    classification: classificationFilter !== "all" ? classificationFilter : undefined,
    activationStatus: activationFilter !== "all" ? activationFilter : undefined,
    communicationStatus: communicationFilter !== "all" ? communicationFilter : undefined,
    merchantApproval: merchantApprovalFilter !== "all" ? merchantApprovalFilter : undefined,
    addedInSystem: addedInSystemFilter !== "all" ? addedInSystemFilter : undefined,
    wilayatId: wilayatFilter !== "all" ? Number(wilayatFilter) : undefined,
    search: search || undefined,
  });
  const wilayats = trpc.wilayat.list.useQuery();
  const employees = trpc.employee.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.store.create.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.store.list.invalidate();
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.store.archive.useMutation({
    onSuccess: () => {
      toast.success(t("common.archive") + " ✓");
      utils.store.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      nameAr: formData.get("nameAr") as string,
      nameEn: (formData.get("nameEn") as string) || undefined,
      merchantName: (formData.get("merchantName") as string) || undefined,
      merchantPhone: (formData.get("merchantPhone") as string) || undefined,
      category: (formData.get("category") as string) || undefined,
      classification: (formData.get("classification") as string) || undefined,
      communicationStatus: (formData.get("communicationStatus") as string) || undefined,
      merchantApproval: (formData.get("merchantApproval") as string) || undefined,
      addedInSystem: (formData.get("addedInSystem") as string) || undefined,
      activationStatus: (formData.get("activationStatus") as string) || undefined,
      wilayatId: formData.get("wilayatId") ? Number(formData.get("wilayatId")) : undefined,
      responsibleEmployeeId: formData.get("responsibleEmployeeId") ? Number(formData.get("responsibleEmployeeId")) : undefined,
      notes: (formData.get("notes") as string) || undefined,
    };
    createMutation.mutate(data);
  };

  const getLabel = (options: typeof CATEGORY_OPTIONS, value: string) => {
    const opt = options.find(o => o.value === value);
    return opt ? (language === "ar" ? opt.labelAr : opt.labelEn) : value;
  };

  const getActivationBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      temporarily_stopped: "bg-orange-100 text-orange-800",
      hidden: "bg-purple-100 text-purple-800",
      pending_activation: "bg-yellow-100 text-yellow-800",
      not_specified: "bg-gray-100 text-gray-600",
    };
    return <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>{getLabel(ACTIVATION_STATUS_OPTIONS, status)}</Badge>;
  };

  const getClassificationBadge = (classification: string) => {
    const variants: Record<string, string> = {
      contracted: "bg-blue-100 text-blue-800",
      ezhalha: "bg-pink-100 text-pink-800",
      not_specified: "bg-gray-100 text-gray-600",
    };
    return <Badge className={variants[classification] || "bg-gray-100 text-gray-600"}>{getLabel(CLASSIFICATION_OPTIONS, classification)}</Badge>;
  };

  const getCommBadge = (status: string) => {
    const variants: Record<string, string> = {
      yes: "bg-green-100 text-green-800",
      no: "bg-red-100 text-red-800",
      no_response: "bg-orange-100 text-orange-800",
      needs_follow_up: "bg-yellow-100 text-yellow-800",
      not_specified: "bg-gray-100 text-gray-600",
    };
    return <Badge className={variants[status] || "bg-gray-100 text-gray-600"}>{getLabel(COMMUNICATION_STATUS_OPTIONS, status)}</Badge>;
  };

  const getMerchantApprovalBadge = (status: string) => {
    const variants: Record<string, string> = {
      yes: "bg-green-100 text-green-800",
      no: "bg-red-100 text-red-800",
      waiting_response: "bg-yellow-100 text-yellow-800",
      not_specified: "bg-gray-100 text-gray-600",
    };
    return <Badge className={variants[status] || "bg-gray-100 text-gray-600"}>{getLabel(MERCHANT_APPROVAL_OPTIONS, status)}</Badge>;
  };

  const getAddedInSystemBadge = (status: string) => {
    const variants: Record<string, string> = {
      yes: "bg-green-100 text-green-800",
      no: "bg-red-100 text-red-800",
      in_progress: "bg-blue-100 text-blue-800",
      missing_data: "bg-orange-100 text-orange-800",
      not_specified: "bg-gray-100 text-gray-600",
    };
    return <Badge className={variants[status] || "bg-gray-100 text-gray-600"}>{getLabel(ADDED_IN_SYSTEM_OPTIONS, status)}</Badge>;
  };

  const renderSelectOptions = (options: typeof CATEGORY_OPTIONS) =>
    options.map(opt => (
      <option key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</option>
    ));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">{t("store.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("store.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("store.add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Store Name - REQUIRED */}
                <div className="col-span-2">
                  <Label>{t("store.nameAr")} *</Label>
                  <Input name="nameAr" required />
                </div>
                <div className="col-span-2">
                  <Label>{t("store.nameEn")}</Label>
                  <Input name="nameEn" />
                </div>
                {/* Merchant Info */}
                <div>
                  <Label>{t("store.merchantName")}</Label>
                  <Input name="merchantName" />
                </div>
                <div>
                  <Label>{t("store.merchantPhone")}</Label>
                  <Input name="merchantPhone" />
                </div>
                {/* Category - fixed enum */}
                <div>
                  <Label>{t("store.category")}</Label>
                  <select name="category" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t("common.all")}</option>
                    {renderSelectOptions(CATEGORY_OPTIONS)}
                  </select>
                </div>
                {/* Classification */}
                <div>
                  <Label>{t("store.classification")}</Label>
                  <select name="classification" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    {renderSelectOptions(CLASSIFICATION_OPTIONS)}
                  </select>
                </div>
                {/* Communication Status */}
                <div>
                  <Label>{t("store.communicationStatus")}</Label>
                  <select name="communicationStatus" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t("common.all")}</option>
                    {renderSelectOptions(COMMUNICATION_STATUS_OPTIONS)}
                  </select>
                </div>
                {/* Merchant Approval */}
                <div>
                  <Label>{t("store.merchantApproval")}</Label>
                  <select name="merchantApproval" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t("common.all")}</option>
                    {renderSelectOptions(MERCHANT_APPROVAL_OPTIONS)}
                  </select>
                </div>
                {/* Added In System */}
                <div>
                  <Label>{t("store.addedInSystem")}</Label>
                  <select name="addedInSystem" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t("common.all")}</option>
                    {renderSelectOptions(ADDED_IN_SYSTEM_OPTIONS)}
                  </select>
                </div>
                {/* Activation Status */}
                <div>
                  <Label>{t("store.activationStatus")}</Label>
                  <select name="activationStatus" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t("common.all")}</option>
                    {renderSelectOptions(ACTIVATION_STATUS_OPTIONS)}
                  </select>
                </div>
                {/* Wilayat */}
                <div>
                  <Label>{t("common.wilayat")}</Label>
                  <select name="wilayatId" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t("common.all")}</option>
                    {wilayats.data?.map((w) => (
                      <option key={w.id} value={w.id}>{w.nameAr}</option>
                    ))}
                  </select>
                </div>
                {/* Responsible Employee */}
                <div>
                  <Label>{t("store.responsibleEmployee")}</Label>
                  <select name="responsibleEmployeeId" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t("common.all")}</option>
                    {employees.data?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.fullName || emp.name || `#${emp.id}`}</option>
                    ))}
                  </select>
                </div>
                {/* Notes */}
                <div className="col-span-2">
                  <Label>{t("common.notes")}</Label>
                  <textarea name="notes" className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] bg-background" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters - Row 1: Search + main filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`${t("common.search")} (${language === "ar" ? "اسم المحل، التاجر، الهاتف" : "Store, Merchant, Phone"})`} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("store.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {CATEGORY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classificationFilter} onValueChange={setClassificationFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("store.classification")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {CLASSIFICATION_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activationFilter} onValueChange={setActivationFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("store.activationStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {ACTIVATION_STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filters - Row 2: Additional filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={communicationFilter} onValueChange={setCommunicationFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("store.communicationStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {COMMUNICATION_STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={merchantApprovalFilter} onValueChange={setMerchantApprovalFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("store.merchantApproval")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {MERCHANT_APPROVAL_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={addedInSystemFilter} onValueChange={setAddedInSystemFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("store.addedInSystem")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {ADDED_IN_SYSTEM_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={wilayatFilter} onValueChange={setWilayatFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("common.wilayat")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {wilayats.data?.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>{w.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">{t("store.nameAr")}</th>
                  <th className="text-start p-3 font-medium">{t("store.merchantName")}</th>
                  <th className="text-start p-3 font-medium">{t("store.merchantPhone")}</th>
                  <th className="text-start p-3 font-medium">{t("store.category")}</th>
                  <th className="text-start p-3 font-medium">{t("store.communicationStatus")}</th>
                  <th className="text-start p-3 font-medium">{t("store.merchantApproval")}</th>
                  <th className="text-start p-3 font-medium">{t("store.addedInSystem")}</th>
                  <th className="text-start p-3 font-medium">{t("store.activationStatus")}</th>
                  <th className="text-start p-3 font-medium">{t("store.classification")}</th>
                  <th className="text-start p-3 font-medium">{t("common.wilayat")}</th>
                  <th className="text-start p-3 font-medium">{t("store.responsibleEmployee")}</th>
                  <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {(stores.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-muted-foreground">{t("common.noData")}</td>
                  </tr>
                ) : (
                  (stores.data ?? []).map((store: any) => (
                    <tr key={store.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setLocation(`/stores/${store.id}`)}>
                      <td className="p-3 font-medium">{store.nameAr}</td>
                      <td className="p-3">{store.merchantName || "-"}</td>
                      <td className="p-3 text-xs">{store.merchantPhone || "-"}</td>
                      <td className="p-3">{store.category ? getLabel(CATEGORY_OPTIONS, store.category) : "-"}</td>
                      <td className="p-3">{store.communicationStatus ? getCommBadge(store.communicationStatus) : "-"}</td>
                      <td className="p-3">{store.merchantApproval ? getMerchantApprovalBadge(store.merchantApproval) : "-"}</td>
                      <td className="p-3">{store.addedInSystem ? getAddedInSystemBadge(store.addedInSystem) : "-"}</td>
                      <td className="p-3">{store.activationStatus ? getActivationBadge(store.activationStatus) : "-"}</td>
                      <td className="p-3">{store.classification ? getClassificationBadge(store.classification) : "-"}</td>
                      <td className="p-3">{wilayats.data?.find((w) => w.id === store.wilayatId)?.nameAr || "-"}</td>
                      <td className="p-3 text-xs">{store.responsibleEmployeeName || (employees.data as any)?.find((e: any) => e.id === store.responsibleEmployeeId)?.fullName || "-"}</td>
                      <td className="p-3">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/stores/${store.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(t("common.confirm") + "?")) archiveMutation.mutate({ id: store.id }); }}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
