import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Edit, Archive, Tag, Gift } from "lucide-react";

// Schema-aligned discount types: "fixed", "percentage", "free_delivery"
const DISCOUNT_TYPES = ["percentage", "fixed", "free_delivery"] as const;

export default function Coupons() {
  const { t, language } = useI18n();
  const [tab, setTab] = useState("coupons");
  const [search, setSearch] = useState("");
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [editCouponId, setEditCouponId] = useState<number | null>(null);

  // Schema-aligned coupon form: name, code, discountType, discountValue, minimumOrderAmount, usageLimit
  const [couponForm, setCouponForm] = useState({
    name: "", code: "", description: "", discountType: "percentage" as string,
    discountValue: "", minimumOrderAmount: "", usageLimit: "",
  });
  // Schema-aligned offer form: name, description
  const [offerForm, setOfferForm] = useState({
    name: "", description: "",
  });

  const { data: coupons, isLoading: cLoading } = trpc.coupon.list.useQuery({});
  const { data: offers, isLoading: oLoading } = trpc.offer.list.useQuery({});
  const utils = trpc.useUtils();

  const createCoupon = trpc.coupon.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم إنشاء الكوبون" : "Coupon created"); setShowCreateCoupon(false); utils.coupon.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCoupon = trpc.coupon.update.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم التحديث" : "Updated"); setEditCouponId(null); utils.coupon.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const disableCoupon = trpc.coupon.update.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم التعطيل" : "Disabled"); utils.coupon.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const createOffer = trpc.offer.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم إنشاء العرض" : "Offer created"); setShowCreateOffer(false); utils.offer.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const disableOffer = trpc.offer.update.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم التعطيل" : "Disabled"); utils.offer.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  function openEditCoupon(c: any) {
    setCouponForm({
      name: c.name || "", code: c.code || "", description: c.notes || "",
      discountType: c.discountType || "percentage",
      discountValue: c.discountValue || "", minimumOrderAmount: c.minimumOrderAmount || "",
      usageLimit: c.usageLimit?.toString() || "",
    });
    setEditCouponId(c.id);
  }

  const dtLabel = (dt: string) => {
    const m: Record<string, { ar: string; en: string }> = {
      percentage: { ar: "نسبة مئوية", en: "Percentage" },
      fixed: { ar: "مبلغ ثابت", en: "Fixed Amount" },
      free_delivery: { ar: "توصيل مجاني", en: "Free Delivery" },
    };
    return m[dt]?.[language] || dt;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("coupon.title")}</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="coupons"><Tag className="w-4 h-4 me-1" />{language === "ar" ? "الكوبونات" : "Coupons"}</TabsTrigger>
            <TabsTrigger value="offers"><Gift className="w-4 h-4 me-1" />{t("offer.title")}</TabsTrigger>
          </TabsList>
          {tab === "coupons" ? (
            <Button onClick={() => { setCouponForm({ name: "", code: "", description: "", discountType: "percentage", discountValue: "", minimumOrderAmount: "", usageLimit: "" }); setShowCreateCoupon(true); }}>
              <Plus className="w-4 h-4 me-2" />{t("coupon.add")}
            </Button>
          ) : (
            <Button onClick={() => { setOfferForm({ name: "", description: "" }); setShowCreateOffer(true); }}>
              <Plus className="w-4 h-4 me-2" />{t("offer.add")}
            </Button>
          )}
        </div>

        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="relative max-w-sm mb-4">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
            </div>

            <TabsContent value="coupons" className="mt-0">
              {cLoading ? <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p> :
              !coupons?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start p-3">{language === "ar" ? "الاسم" : "Name"}</th>
                      <th className="text-start p-3">{t("coupon.code")}</th>
                      <th className="text-start p-3">{t("coupon.discountType")}</th>
                      <th className="text-start p-3">{t("coupon.discountValue")}</th>
                      <th className="text-start p-3">{language === "ar" ? "الاستخدام" : "Usage"}</th>
                      <th className="text-start p-3">{t("common.status")}</th>
                      <th className="text-start p-3">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.filter((c: any) => !search || c.code?.toLowerCase().includes(search.toLowerCase()) || c.name?.toLowerCase().includes(search.toLowerCase())).map((c: any) => (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{c.name || "-"}</td>
                        <td className="p-3 font-mono">{c.code}</td>
                        <td className="p-3">{dtLabel(c.discountType)}</td>
                        <td className="p-3">{c.discountValue}{c.discountType === "percentage" ? "%" : ""}</td>
                        <td className="p-3">{c.usageCount ?? 0} / {c.usageLimit ?? "∞"}</td>
                        <td className="p-3"><Badge className={c.status === "active" ? "bg-green-100 text-green-800" : c.status === "expired" ? "bg-gray-100 text-gray-800" : "bg-red-100 text-red-800"}>{c.status}</Badge></td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditCoupon(c)}><Edit className="w-4 h-4" /></Button>
                            {c.status === "active" && <Button variant="ghost" size="sm" onClick={() => disableCoupon.mutate({ id: c.id, status: "inactive" })}><Archive className="w-4 h-4" /></Button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </TabsContent>

            <TabsContent value="offers" className="mt-0">
              {oLoading ? <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p> :
              !offers?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start p-3">{language === "ar" ? "الاسم" : "Name"}</th>
                      <th className="text-start p-3">{t("common.description")}</th>
                      <th className="text-start p-3">{t("common.status")}</th>
                      <th className="text-start p-3">{t("common.createdAt")}</th>
                      <th className="text-start p-3">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.filter((o: any) => !search || o.name?.toLowerCase().includes(search.toLowerCase())).map((o: any) => (
                      <tr key={o.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{o.name}</td>
                        <td className="p-3 max-w-[200px] truncate">{o.description || "-"}</td>
                        <td className="p-3"><Badge className={o.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{o.status}</Badge></td>
                        <td className="p-3 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="p-3">
                          {o.status === "active" && <Button variant="ghost" size="sm" onClick={() => disableOffer.mutate({ id: o.id, status: "inactive" })}><Archive className="w-4 h-4" /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Create Coupon Dialog */}
      <Dialog open={showCreateCoupon} onOpenChange={setShowCreateCoupon}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("coupon.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{language === "ar" ? "اسم الكوبون" : "Coupon Name"} *</Label><Input value={couponForm.name} onChange={e => setCouponForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{t("coupon.code")} *</Label><Input value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="font-mono" /></div>
            <div>
              <Label>{t("coupon.discountType")}</Label>
              <Select value={couponForm.discountType} onValueChange={v => setCouponForm(p => ({ ...p, discountType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCOUNT_TYPES.map(dt => <SelectItem key={dt} value={dt}>{dtLabel(dt)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("coupon.discountValue")}</Label><Input type="number" value={couponForm.discountValue} onChange={e => setCouponForm(p => ({ ...p, discountValue: e.target.value }))} /></div>
              <div><Label>{language === "ar" ? "الحد الأدنى للطلب" : "Min Order Amount"}</Label><Input type="number" value={couponForm.minimumOrderAmount} onChange={e => setCouponForm(p => ({ ...p, minimumOrderAmount: e.target.value }))} /></div>
            </div>
            <div><Label>{language === "ar" ? "حد الاستخدام" : "Usage Limit"}</Label><Input type="number" value={couponForm.usageLimit} onChange={e => setCouponForm(p => ({ ...p, usageLimit: e.target.value }))} /></div>
            <div><Label>{t("common.notes")}</Label><Textarea value={couponForm.description} onChange={e => setCouponForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCoupon(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createCoupon.mutate({
              name: couponForm.name,
              code: couponForm.code,
              discountType: couponForm.discountType,
              discountValue: couponForm.discountValue || undefined,
              minimumOrderAmount: couponForm.minimumOrderAmount || undefined,
              usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit) : undefined,
              notes: couponForm.description || undefined,
            } as any)} disabled={!couponForm.code || !couponForm.name || createCoupon.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={!!editCouponId} onOpenChange={() => setEditCouponId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("common.edit")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{language === "ar" ? "اسم الكوبون" : "Coupon Name"}</Label><Input value={couponForm.name} onChange={e => setCouponForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{t("coupon.code")}</Label><Input value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="font-mono" disabled /></div>
            <div>
              <Label>{t("coupon.discountType")}</Label>
              <Select value={couponForm.discountType} onValueChange={v => setCouponForm(p => ({ ...p, discountType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCOUNT_TYPES.map(dt => <SelectItem key={dt} value={dt}>{dtLabel(dt)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("coupon.discountValue")}</Label><Input type="number" value={couponForm.discountValue} onChange={e => setCouponForm(p => ({ ...p, discountValue: e.target.value }))} /></div>
              <div><Label>{language === "ar" ? "الحد الأدنى للطلب" : "Min Order Amount"}</Label><Input type="number" value={couponForm.minimumOrderAmount} onChange={e => setCouponForm(p => ({ ...p, minimumOrderAmount: e.target.value }))} /></div>
            </div>
            <div><Label>{language === "ar" ? "حد الاستخدام" : "Usage Limit"}</Label><Input type="number" value={couponForm.usageLimit} onChange={e => setCouponForm(p => ({ ...p, usageLimit: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCouponId(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => editCouponId && updateCoupon.mutate({
              id: editCouponId,
              name: couponForm.name || undefined,
              discountType: couponForm.discountType || undefined,
              discountValue: couponForm.discountValue || undefined,
              minimumOrderAmount: couponForm.minimumOrderAmount || undefined,
              usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit) : undefined,
            } as any)} disabled={updateCoupon.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Offer Dialog */}
      <Dialog open={showCreateOffer} onOpenChange={setShowCreateOffer}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("offer.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{language === "ar" ? "اسم العرض" : "Offer Name"} *</Label><Input value={offerForm.name} onChange={e => setOfferForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{t("common.description")}</Label><Textarea value={offerForm.description} onChange={e => setOfferForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateOffer(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createOffer.mutate({ title: offerForm.name, description: offerForm.description || undefined } as any)} disabled={!offerForm.name || createOffer.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
