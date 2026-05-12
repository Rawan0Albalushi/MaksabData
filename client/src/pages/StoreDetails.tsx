import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, CheckCircle, Image as ImageIcon, Plus, Save, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function StoreDetails() {
  const { id } = useParams<{ id: string }>();
  const { t, language, dir } = useI18n();
  const [, setLocation] = useLocation();
  const storeId = Number(id);

  const store = trpc.store.getById.useQuery({ id: storeId });
  const storeCategories = trpc.storeCategory.list.useQuery();
  const categories = trpc.menu.categories.useQuery({ storeId });
  const products = trpc.menu.products.useQuery({ storeId });
  const storeImages = trpc.storeImage.list.useQuery({ storeId });
  const followUps = trpc.storeFollowUp.list.useQuery({ storeId });
  const wilayats = trpc.wilayat.list.useQuery();
  const auditLogs = trpc.auditLog.list.useQuery({ entityType: "store", entityId: storeId });
  const utils = trpc.useUtils();

  const updateMutation = trpc.store.update.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.store.getById.invalidate({ id: storeId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const requestActivationMutation = trpc.store.requestActivation.useMutation({
    onSuccess: () => {
      toast.success(t("store.requestActivation") + " ✓");
      utils.store.getById.invalidate({ id: storeId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const activateMutation = trpc.store.activate.useMutation({
    onSuccess: () => {
      toast.success("✓");
      utils.store.getById.invalidate({ id: storeId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Category/Product mutations
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [newProductImage, setNewProductImage] = useState("");
  const [editProductImage, setEditProductImage] = useState("");
  const [newStoreImageUrl, setNewStoreImageUrl] = useState("");

  const createCategoryMutation = trpc.menu.createCategory.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.menu.categories.invalidate({ storeId });
      setCategoryDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createProductMutation = trpc.menu.createProduct.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.menu.products.invalidate({ storeId });
      setProductDialogOpen(false);
      setNewProductImage("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateProductMutation = trpc.menu.updateProduct.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.menu.products.invalidate({ storeId });
      setEditingProduct(null);
      setEditProductImage("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createImageMutation = trpc.storeImage.create.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.storeImage.list.invalidate({ storeId });
      setImageDialogOpen(false);
      setNewStoreImageUrl("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const archiveImageMutation = trpc.storeImage.update.useMutation({
    onSuccess: () => {
      toast.success("✓");
      utils.storeImage.list.invalidate({ storeId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createFollowUpMutation = trpc.storeFollowUp.create.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.storeFollowUp.list.invalidate({ storeId });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (store.isLoading) {
    return <div className="flex items-center justify-center h-64"><p>{t("common.loading")}</p></div>;
  }

  if (!store.data) {
    return <div className="flex items-center justify-center h-64"><p>{t("common.noData")}</p></div>;
  }

  const s = store.data;

  const handleFieldSave = (field: string, value: any) => {
    updateMutation.mutate({ id: storeId, [field]: value });
  };

  // Fixed category options matching DB enum
  const CATEGORY_OPTIONS = [
    { value: "restaurant", labelAr: "مطعم", labelEn: "Restaurant" },
    { value: "cafe", labelAr: "كوفي", labelEn: "Café" },
    { value: "supermarket", labelAr: "سوبرماركت", labelEn: "Supermarket" },
    { value: "sweets_shop", labelAr: "محل حلويات", labelEn: "Sweets Shop" },
    { value: "bakery", labelAr: "مخبز", labelEn: "Bakery" },
    { value: "store", labelAr: "متجر", labelEn: "Store" },
    { value: "other", labelAr: "غيره", labelEn: "Other" },
  ];

  const getCategoryLabel = (catValue: string | null | undefined) => {
    if (!catValue) return "-";
    const opt = CATEGORY_OPTIONS.find(o => o.value === catValue);
    return opt ? (language === "ar" ? opt.labelAr : opt.labelEn) : catValue;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/stores")}>
          {dir === "rtl" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{s.nameAr}</h1>
          {s.nameEn && <p className="text-sm text-muted-foreground">{s.nameEn}</p>}
        </div>
        <div className="flex gap-2">
          {s.activationStatus === "inactive" && (
            <Button size="sm" variant="outline" onClick={() => requestActivationMutation.mutate({ id: storeId })}>
              {t("store.requestActivation")}
            </Button>
          )}
          {s.activationStatus === "pending_activation" && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => activateMutation.mutate({ id: storeId, activate: true })}>
                <CheckCircle className="h-4 w-4 me-1" /> {t("common.activate")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => activateMutation.mutate({ id: storeId, activate: false })}>
                {t("common.reject")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {s.activationStatus && <Badge variant="outline">{t(`status.${s.activationStatus}`)}</Badge>}
        {s.classification && <Badge variant="secondary">{t(`store.${s.classification}`)}</Badge>}
        {s.category && <Badge variant="secondary">{getCategoryLabel(s.category)}</Badge>}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="basic">{t("store.basicData")}</TabsTrigger>
          <TabsTrigger value="merchant">{t("store.merchantData")}</TabsTrigger>
          <TabsTrigger value="location">{t("store.locationData")}</TabsTrigger>
          <TabsTrigger value="operation">{t("store.operationData")}</TabsTrigger>
          <TabsTrigger value="contracted">{t("store.contractedDetails")}</TabsTrigger>
          <TabsTrigger value="ezhalha">{t("store.ezhalhaDetails")}</TabsTrigger>
          <TabsTrigger value="menu">{t("store.menu")}</TabsTrigger>
          <TabsTrigger value="images">{t("store.images")}</TabsTrigger>
          <TabsTrigger value="notes">{t("store.internalNotes")}</TabsTrigger>
          <TabsTrigger value="followups">{t("store.followUpHistory")}</TabsTrigger>
          <TabsTrigger value="activation">{t("store.activationHistory")}</TabsTrigger>
        </TabsList>

        {/* Basic Data Tab */}
        <TabsContent value="basic">
          <Card>
            <CardContent className="p-4 space-y-4">
              <EditableField label={t("store.nameAr")} value={s.nameAr} onSave={(v) => handleFieldSave("nameAr", v)} />
              <EditableField label={t("store.nameEn")} value={s.nameEn || ""} onSave={(v) => handleFieldSave("nameEn", v)} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("store.category")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-background" value={s.category || ""} onChange={(e) => handleFieldSave("category", e.target.value || undefined)}>
                    <option value="">{t("store.not_specified")}</option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{language === "ar" ? opt.labelAr : opt.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("store.classification")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-background" value={s.classification || ""} onChange={(e) => handleFieldSave("classification", e.target.value || undefined)}>
                    <option value="not_specified">{t("store.not_specified")}</option>
                    <option value="contracted">{t("store.contracted")}</option>
                    <option value="ezhalha">{t("store.ezhalha")}</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("common.wilayat")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-background" value={s.wilayatId || ""} onChange={(e) => handleFieldSave("wilayatId", e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">{t("common.all")}</option>
                    {wilayats.data?.map((w) => (
                      <option key={w.id} value={w.id}>{w.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>
              <EditableField label={t("store.communicationStatus")} value={s.communicationStatus || ""} onSave={(v) => handleFieldSave("communicationStatus", v)} type="select" options={[
                { value: "yes", label: "نعم / Yes" },
                { value: "no", label: "لا / No" },
                { value: "no_response", label: "لم يتم الرد / No Response" },
                { value: "needs_follow_up", label: "يحتاج متابعة / Needs Follow Up" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.merchantApproval")} value={s.merchantApproval || ""} onSave={(v) => handleFieldSave("merchantApproval", v)} type="select" options={[
                { value: "yes", label: "نعم / Yes" },
                { value: "no", label: "لا / No" },
                { value: "waiting_response", label: "بانتظار الرد / Waiting" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.addedInSystem")} value={s.addedInSystem || ""} onSave={(v) => handleFieldSave("addedInSystem", v)} type="select" options={[
                { value: "yes", label: "نعم / Yes" },
                { value: "no", label: "لا / No" },
                { value: "in_progress", label: "قيد الإضافة / In Progress" },
                { value: "missing_data", label: "بيانات ناقصة / Missing Data" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.activationStatus")} value={s.activationStatus || ""} onSave={(v) => handleFieldSave("activationStatus", v)} type="select" options={[
                { value: "active", label: "مفعل / Active" },
                { value: "inactive", label: "غير مفعل / Inactive" },
                { value: "pending_activation", label: "بانتظار التفعيل / Pending Activation" },
                { value: "temporarily_stopped", label: "موقوف مؤقتاً / Temporarily Stopped" },
                { value: "hidden", label: "مخفي / Hidden" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merchant Data Tab */}
        <TabsContent value="merchant">
          <Card>
            <CardContent className="p-4 space-y-4">
              <EditableField label={t("store.merchantName")} value={s.merchantName || ""} onSave={(v) => handleFieldSave("merchantName", v)} />
              <EditableField label={t("store.merchantPhone")} value={s.merchantPhone || ""} onSave={(v) => handleFieldSave("merchantPhone", v)} />
              <EditableField label="WhatsApp" value={s.whatsappNumber || ""} onSave={(v) => handleFieldSave("whatsappNumber", v)} />
              <EditableField label={t("store.responsiblePersonName") || "Responsible Person"} value={s.responsiblePersonName || ""} onSave={(v) => handleFieldSave("responsiblePersonName", v)} />
              <EditableField label={t("store.responsiblePersonPhone") || "Responsible Phone"} value={s.responsiblePersonPhone || ""} onSave={(v) => handleFieldSave("responsiblePersonPhone", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location">
          <Card>
            <CardContent className="p-4 space-y-4">
              <EditableField label={t("store.governorate") || "Governorate"} value={s.governorate || ""} onSave={(v) => handleFieldSave("governorate", v)} />
              <EditableField label={t("store.region") || "Region"} value={s.region || ""} onSave={(v) => handleFieldSave("region", v)} />
              <EditableField label={t("store.detailedAddress") || "Detailed Address"} value={s.detailedAddress || ""} onSave={(v) => handleFieldSave("detailedAddress", v)} />
              <EditableField label={t("store.googleMapsLink") || "Google Maps Link"} value={s.googleMapsLink || ""} onSave={(v) => handleFieldSave("googleMapsLink", v)} />
              <EditableField label={t("store.locationNotes") || "Location Notes"} value={s.locationNotes || ""} onSave={(v) => handleFieldSave("locationNotes", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operation Tab */}
        <TabsContent value="operation">
          <Card>
            <CardContent className="p-4 space-y-4">
              <EditableField label={t("store.workingDays") || "Working Days"} value={s.workingDays || ""} onSave={(v) => handleFieldSave("workingDays", v)} />
              <div className="grid grid-cols-2 gap-4">
                <EditableField label={t("store.openingTime") || "Opening Time"} value={s.openingTime || ""} onSave={(v) => handleFieldSave("openingTime", v)} />
                <EditableField label={t("store.closingTime") || "Closing Time"} value={s.closingTime || ""} onSave={(v) => handleFieldSave("closingTime", v)} />
              </div>
              <EditableField label={t("store.avgPreparationTime") || "Avg Preparation Time"} value={s.avgPreparationTime || ""} onSave={(v) => handleFieldSave("avgPreparationTime", v)} />
              <EditableField label={t("store.operationNotes") || "Operation Notes"} value={s.operationNotes || ""} onSave={(v) => handleFieldSave("operationNotes", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracted Details Tab */}
        <TabsContent value="contracted">
          <Card>
            <CardContent className="p-4 space-y-4">
              <EditableField label={t("store.contractStatus") || "Contract Status"} value={s.contractStatus || ""} onSave={(v) => handleFieldSave("contractStatus", v)} type="select" options={[
                { value: "active", label: t("status.active") },
                { value: "expired", label: "Expired" },
                { value: "under_review", label: "Under Review" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.commissionPercentage") || "Commission %"} value={s.commissionPercentage || ""} onSave={(v) => handleFieldSave("commissionPercentage", v)} />
              <EditableField label={t("store.orderReceivingMethod") || "Order Receiving Method"} value={s.orderReceivingMethod || ""} onSave={(v) => handleFieldSave("orderReceivingMethod", v)} type="select" options={[
                { value: "whatsapp", label: "WhatsApp" },
                { value: "call", label: "Call" },
                { value: "manual_maksab", label: "Manual (Maksab)" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.agreementNotes") || "Agreement Notes"} value={s.agreementNotes || ""} onSave={(v) => handleFieldSave("agreementNotes", v)} multiline />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ezhalha Details Tab */}
        <TabsContent value="ezhalha">
          <Card>
            <CardContent className="p-4 space-y-4">
              <EditableField label={t("store.executionMethod") || "Execution Method"} value={s.ezhalhaExecutionMethod || ""} onSave={(v) => handleFieldSave("ezhalhaExecutionMethod", v)} type="select" options={[
                { value: "call_store", label: "Call Store" },
                { value: "whatsapp_store", label: "WhatsApp Store" },
                { value: "direct_order", label: "Direct Order" },
                { value: "send_mandoub", label: "Send Mandoub" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.pricesConfirmed") || "Prices Confirmed"} value={s.ezhalhaPricesConfirmed || ""} onSave={(v) => handleFieldSave("ezhalhaPricesConfirmed", v)} type="select" options={[
                { value: "confirmed", label: "Confirmed" },
                { value: "not_confirmed", label: "Not Confirmed" },
                { value: "approximate", label: "Approximate" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.menuConfirmed") || "Menu Confirmed"} value={s.ezhalhaMenuConfirmed || ""} onSave={(v) => handleFieldSave("ezhalhaMenuConfirmed", v)} type="select" options={[
                { value: "confirmed", label: "Confirmed" },
                { value: "not_confirmed", label: "Not Confirmed" },
                { value: "needs_update", label: "Needs Update" },
                { value: "not_specified", label: t("store.not_specified") },
              ]} />
              <EditableField label={t("store.operationsNotes") || "Operations Notes"} value={s.ezhalhaOperationsNotes || ""} onSave={(v) => handleFieldSave("ezhalhaOperationsNotes", v)} multiline />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menu/Products Tab */}
        <TabsContent value="menu">
          <div className="space-y-4">
            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("menu.category")}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setCategoryDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5 me-1" /> {t("menu.addCategory")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(categories.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
                ) : (
                  <div className="space-y-2">
                    {categories.data?.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-2 border rounded-md">
                        <span className="text-sm font-medium">{cat.name}</span>
                        <Badge variant={cat.isActive ? "default" : "secondary"}>{cat.isActive ? t("status.active") : t("status.inactive")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("menu.title")}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setProductDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5 me-1" /> {t("menu.addProduct")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(products.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-start p-2">{t("menu.image")}</th>
                          <th className="text-start p-2">{t("menu.productName")}</th>
                          <th className="text-start p-2">{t("menu.price")}</th>
                          <th className="text-start p-2">{t("menu.category")}</th>
                          <th className="text-start p-2">{t("common.status")}</th>
                          <th className="text-start p-2">{t("common.actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.data?.map((p) => (
                          <tr key={p.id} className="border-b">
                            <td className="p-2">
                              {p.productImage ? (
                                <img src={p.productImage} alt={p.name} className="h-10 w-10 rounded object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">-</div>
                              )}
                            </td>
                            <td className="p-2">{p.name}</td>
                            <td className="p-2">{p.price || "-"}</td>
                            <td className="p-2">{categories.data?.find((c) => c.id === p.categoryId)?.name || "-"}</td>
                            <td className="p-2"><Badge variant="outline">{p.productStatus || "N/A"}</Badge></td>
                            <td className="p-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingProduct(p)}>{t("common.edit")}</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Dialog */}
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("menu.addCategory")}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createCategoryMutation.mutate({ storeId, name: fd.get("name") as string, sortOrder: Number(fd.get("sortOrder")) || 0 });
              }} className="space-y-4">
                <div><Label>{t("common.name")} *</Label><Input name="name" required /></div>
                <div><Label>{t("common.sortOrder")}</Label><Input name="sortOrder" type="number" defaultValue="0" /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" disabled={createCategoryMutation.isPending}>{t("common.save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Product Dialog */}
          <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("menu.addProduct")}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createProductMutation.mutate({
                  storeId,
                  name: fd.get("name") as string,
                  price: fd.get("price") as string || undefined,
                  categoryId: fd.get("categoryId") ? Number(fd.get("categoryId")) : undefined,
                  description: fd.get("description") as string || undefined,
                  productImage: newProductImage || undefined,
                });
              }} className="space-y-4">
                <div><Label>{t("menu.productName")} *</Label><Input name="name" required /></div>
                <div><Label>{t("menu.price")}</Label><Input name="price" /></div>
                <div>
                  <Label>{t("menu.category")}</Label>
                  <select name="categoryId" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">-</option>
                    {categories.data?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div><Label>Description</Label><textarea name="description" className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] bg-background" /></div>
                <div><Label>{t("menu.image")}</Label><ImageUpload folder="products" size="sm" shape="square" showUrlFallback={true} currentImageUrl={newProductImage || undefined} onUploadComplete={(url) => setNewProductImage(url)} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" disabled={createProductMutation.isPending}>{t("common.save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Product Dialog */}
          <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("common.edit")} - {editingProduct?.name}</DialogTitle></DialogHeader>
              {editingProduct && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updateProductMutation.mutate({
                    id: editingProduct.id,
                    name: fd.get("name") as string || undefined,
                    price: fd.get("price") as string || undefined,
                    categoryId: fd.get("categoryId") ? Number(fd.get("categoryId")) : undefined,
                    description: fd.get("description") as string || undefined,
                    productImage: editProductImage || undefined,
                    productStatus: fd.get("productStatus") as string || undefined,
                  });
                }} className="space-y-4">
                  <div><Label>{t("menu.productName")} *</Label><Input name="name" defaultValue={editingProduct.name} required /></div>
                  <div><Label>{t("menu.price")}</Label><Input name="price" defaultValue={editingProduct.price || ""} /></div>
                  <div>
                    <Label>{t("menu.category")}</Label>
                    <select name="categoryId" defaultValue={editingProduct.categoryId || ""} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="">-</option>
                      {categories.data?.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div><Label>Description</Label><textarea name="description" defaultValue={editingProduct.description || ""} className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] bg-background" /></div>
                  <div><Label>{t("menu.image")}</Label><ImageUpload folder="products" size="sm" shape="square" showUrlFallback={true} currentImageUrl={editProductImage || editingProduct.productImage || undefined} onUploadComplete={(url) => setEditProductImage(url)} /></div>
                  <div>
                    <Label>{t("common.status")}</Label>
                    <select name="productStatus" defaultValue={editingProduct.productStatus || "not_specified"} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option value="available">{t("menu.available")}</option>
                      <option value="not_available">{t("menu.notAvailable")}</option>
                      <option value="not_specified">-</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>{t("common.cancel")}</Button>
                    <Button type="submit" disabled={updateProductMutation.isPending}>{t("common.save")}</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Images & Files Tab */}
        <TabsContent value="images">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t("store.images")}
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setImageDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 me-1" /> {t("common.add")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {(storeImages.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {storeImages.data?.filter((img) => !img.archived).map((img) => (
                    <div key={img.id} className="border rounded-lg overflow-hidden group relative">
                      <img src={img.imageUrl} alt={img.caption || img.title || ""} className="w-full h-32 object-cover" />
                      <div className="p-2">
                        {img.title && <p className="text-xs font-medium truncate">{img.title}</p>}
                        {img.caption && <p className="text-xs text-muted-foreground truncate">{img.caption}</p>}
                        <Badge variant="outline" className="text-[10px] mt-1">{img.imageType || "photo"}</Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 end-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => archiveImageMutation.mutate({ id: img.id, archived: true })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Dialog */}
          <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("common.add")} - {t("store.images")}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                if (!newStoreImageUrl) { toast.error(language === "ar" ? "يرجى رفع صورة" : "Please upload an image"); return; }
                createImageMutation.mutate({
                  storeId,
                  imageUrl: newStoreImageUrl,
                  imageType: fd.get("imageType") as string || undefined,
                  title: fd.get("title") as string || undefined,
                  caption: fd.get("caption") as string || undefined,
                  sortOrder: Number(fd.get("sortOrder")) || 0,
                });
              }} className="space-y-4">
                <div><Label>{language === "ar" ? "صورة المتجر" : "Store Image"} *</Label><ImageUpload folder="stores" size="md" shape="rectangle" showUrlFallback={true} currentImageUrl={newStoreImageUrl || undefined} onUploadComplete={(url) => setNewStoreImageUrl(url)} /></div>
                <div><Label>Title</Label><Input name="title" /></div>
                <div><Label>Caption</Label><Input name="caption" /></div>
                <div>
                  <Label>Type</Label>
                  <select name="imageType" className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="store_photo">Store Photo</option>
                    <option value="logo">Logo</option>
                    <option value="menu_photo">Menu Photo</option>
                    <option value="document">Document</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>{t("common.sortOrder")}</Label><Input name="sortOrder" type="number" defaultValue="0" /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setImageDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button type="submit" disabled={createImageMutation.isPending}>{t("common.save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Internal Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="p-4 space-y-4">
              <EditableField label={t("store.internalNotes")} value={s.internalManagementNotes || ""} onSave={(v) => handleFieldSave("internalManagementNotes", v)} multiline />
              <EditableField label={t("common.notes")} value={s.notes || ""} onSave={(v) => handleFieldSave("notes", v)} multiline />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-up History Tab */}
        <TabsContent value="followups">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("store.followUpHistory")}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => {
                  const notes = prompt(t("common.notes"));
                  if (notes) createFollowUpMutation.mutate({ storeId, actionType: "follow_up", notes });
                }}>
                  <Plus className="h-3.5 w-3.5 me-1" /> {t("common.add")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {(followUps.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              ) : (
                <div className="space-y-3">
                  {followUps.data?.map((fu) => (
                    <div key={fu.id} className="p-3 border rounded-md">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <Badge variant="outline" className="text-[10px]">{fu.actionType}</Badge>
                        <span>{fu.createdAt ? new Date(fu.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                      <p className="text-sm">{fu.notes || "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activation History Tab */}
        <TabsContent value="activation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("store.activationHistory")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {(auditLogs.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.data?.map((log) => (
                    <div key={log.id} className="p-3 border rounded-md">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{log.actionType}</Badge>
                          <span>{log.userName || "-"}</span>
                        </div>
                        <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</span>
                      </div>
                      {log.notes ? <p className="text-sm">{String(log.notes)}</p> : null}
                      {log.newValues ? (
                        <pre className="text-[10px] mt-1 bg-muted p-2 rounded overflow-x-auto">
                          {String(typeof log.newValues === "string" ? log.newValues : JSON.stringify(log.newValues, null, 2))}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Editable Field Component
function EditableField({ label, value, onSave, type = "text", options, multiline }: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  if (type === "select" && options) {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <select className="w-full border rounded-md px-3 py-2 text-sm mt-1 bg-background" value={value} onChange={(e) => onSave(e.target.value)}>
          <option value="">-</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex gap-2 mt-1">
          {multiline ? (
            <textarea className="flex-1 border rounded-md px-3 py-2 text-sm min-h-[80px] bg-background" value={localValue} onChange={(e) => setLocalValue(e.target.value)} autoFocus />
          ) : (
            <Input className="flex-1" value={localValue} onChange={(e) => setLocalValue(e.target.value)} autoFocus />
          )}
          <Button size="sm" onClick={() => { onSave(localValue); setEditing(false); }}>
            <Save className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="cursor-pointer hover:bg-muted/50 p-2 rounded-md -m-2" onClick={() => { setLocalValue(value); setEditing(true); }}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm mt-0.5">{value || <span className="text-muted-foreground italic">-</span>}</p>
    </div>
  );
}
