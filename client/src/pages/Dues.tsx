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
import { Plus, DollarSign, Handshake, CheckCircle } from "lucide-react";

export default function Dues() {
  const { t, language } = useI18n();
  const [tab, setTab] = useState("mandoub_dues");
  const [showCreateMD, setShowCreateMD] = useState(false);
  const [showCreateSD, setShowCreateSD] = useState(false);
  const [showCreateSettlement, setShowCreateSettlement] = useState(false);

  // Aligned with schema: mandoubDues.earningType enum values
  const [mdForm, setMdForm] = useState({ mandoubId: "", orderId: "", amount: "", earningType: "per_order" as string, notes: "" });
  // Aligned with schema: storeDues uses commissionAmount/storeDueAmount
  const [sdForm, setSdForm] = useState({ storeId: "", orderId: "", amount: "", earningType: "commission" as string, notes: "" });
  // Aligned with schema: settlements.settlementType, relatedEntityType, relatedEntityId
  const [settForm, setSettForm] = useState({ settlementType: "mandoub" as string, relatedEntityType: "mandoub" as string, relatedEntityId: "", totalAmount: "", notes: "" });

  const { data: mandoubDues } = trpc.mandoubDue.list.useQuery({});
  const { data: storeDues } = trpc.storeDue.list.useQuery({});
  const { data: settlements } = trpc.settlement.list.useQuery({});
  const utils = trpc.useUtils();

  const createMD = trpc.mandoubDue.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم الإنشاء" : "Created"); setShowCreateMD(false); utils.mandoubDue.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const createSD = trpc.storeDue.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم الإنشاء" : "Created"); setShowCreateSD(false); utils.storeDue.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const createSettlement = trpc.settlement.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم الإنشاء" : "Created"); setShowCreateSettlement(false); utils.settlement.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      unpaid: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800",
      partial: "bg-blue-100 text-blue-800", under_review: "bg-orange-100 text-orange-800",
      unsettled: "bg-yellow-100 text-yellow-800", partially_settled: "bg-blue-100 text-blue-800",
      settled: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800", approved: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return m[s] || "bg-gray-100 text-gray-800";
  };

  const MANDOUB_EARNING_TYPES = [
    { value: "per_order", labelAr: "لكل طلب", labelEn: "Per Order" },
    { value: "daily", labelAr: "يومي", labelEn: "Daily" },
    { value: "weekly", labelAr: "أسبوعي", labelEn: "Weekly" },
    { value: "monthly", labelAr: "شهري", labelEn: "Monthly" },
    { value: "bonus", labelAr: "مكافأة", labelEn: "Bonus" },
    { value: "adjustment", labelAr: "تعديل", labelEn: "Adjustment" },
  ];

  const SETTLEMENT_TYPES = [
    { value: "mandoub", labelAr: "مندوب", labelEn: "Mandoub" },
    { value: "store", labelAr: "محل", labelEn: "Store" },
    { value: "internal", labelAr: "داخلي", labelEn: "Internal" },
    { value: "refund", labelAr: "استرجاع", labelEn: "Refund" },
    { value: "ezhalha_price_diff", labelAr: "فرق سعر ازهلها", labelEn: "Ezhalha Price Diff" },
    { value: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  const ENTITY_TYPES = [
    { value: "mandoub", labelAr: "مندوب", labelEn: "Mandoub" },
    { value: "store", labelAr: "محل", labelEn: "Store" },
    { value: "customer", labelAr: "عميل", labelEn: "Customer" },
    { value: "employee", labelAr: "موظف", labelEn: "Employee" },
    { value: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("dues.title")}</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="mandoub_dues"><DollarSign className="w-4 h-4 me-1" />{t("dues.mandoubDues")}</TabsTrigger>
            <TabsTrigger value="store_dues"><Handshake className="w-4 h-4 me-1" />{t("dues.storeDues")}</TabsTrigger>
            <TabsTrigger value="settlements"><CheckCircle className="w-4 h-4 me-1" />{t("dues.settlements")}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {tab === "mandoub_dues" && <Button size="sm" onClick={() => { setMdForm({ mandoubId: "", orderId: "", amount: "", earningType: "per_order", notes: "" }); setShowCreateMD(true); }}><Plus className="w-4 h-4 me-1" />{t("common.add")}</Button>}
            {tab === "store_dues" && <Button size="sm" onClick={() => { setSdForm({ storeId: "", orderId: "", amount: "", earningType: "commission", notes: "" }); setShowCreateSD(true); }}><Plus className="w-4 h-4 me-1" />{t("common.add")}</Button>}
            {tab === "settlements" && <Button size="sm" onClick={() => { setSettForm({ settlementType: "mandoub", relatedEntityType: "mandoub", relatedEntityId: "", totalAmount: "", notes: "" }); setShowCreateSettlement(true); }}><Plus className="w-4 h-4 me-1" />{t("common.add")}</Button>}
          </div>
        </div>

        <TabsContent value="mandoub_dues">
          <Card><CardContent className="pt-4">
            {!mandoubDues?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">#</th>
                  <th className="text-start p-3">{t("mandoub.title")}</th>
                  <th className="text-start p-3">{language === "ar" ? "نوع الاستحقاق" : "Earning Type"}</th>
                  <th className="text-start p-3">{t("common.amount")}</th>
                  <th className="text-start p-3">{language === "ar" ? "المدفوع" : "Paid"}</th>
                  <th className="text-start p-3">{language === "ar" ? "المتبقي" : "Remaining"}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                  <th className="text-start p-3">{t("common.createdAt")}</th>
                </tr></thead>
                <tbody>
                  {mandoubDues.map((d: any) => (
                    <tr key={d.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{d.id}</td>
                      <td className="p-3">{d.mandoubId}</td>
                      <td className="p-3">{MANDOUB_EARNING_TYPES.find(t => t.value === d.earningType)?.[language === "ar" ? "labelAr" : "labelEn"] || d.earningType}</td>
                      <td className="p-3 font-medium">{d.amount}</td>
                      <td className="p-3 text-green-600">{d.paidAmount || "0"}</td>
                      <td className="p-3 text-red-600">{d.remainingAmount || "0"}</td>
                      <td className="p-3"><Badge className={statusBadge(d.paymentStatus)}>{d.paymentStatus}</Badge></td>
                      <td className="p-3 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="store_dues">
          <Card><CardContent className="pt-4">
            {!storeDues?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">#</th>
                  <th className="text-start p-3">{t("store.title")}</th>
                  <th className="text-start p-3">{language === "ar" ? "مبلغ المبيعات" : "Sales Amount"}</th>
                  <th className="text-start p-3">{language === "ar" ? "العمولة" : "Commission"}</th>
                  <th className="text-start p-3">{language === "ar" ? "مستحق المحل" : "Store Due"}</th>
                  <th className="text-start p-3">{language === "ar" ? "المدفوع" : "Paid"}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                  <th className="text-start p-3">{t("common.createdAt")}</th>
                </tr></thead>
                <tbody>
                  {storeDues.map((d: any) => (
                    <tr key={d.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{d.id}</td>
                      <td className="p-3">{d.storeId}</td>
                      <td className="p-3">{d.totalSalesAmount || "0"}</td>
                      <td className="p-3">{d.commissionAmount || "0"}</td>
                      <td className="p-3 font-medium">{d.storeDueAmount || "0"}</td>
                      <td className="p-3 text-green-600">{d.paidAmount || "0"}</td>
                      <td className="p-3"><Badge className={statusBadge(d.settlementStatus)}>{d.settlementStatus}</Badge></td>
                      <td className="p-3 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="settlements">
          <Card><CardContent className="pt-4">
            {!settlements?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">#</th>
                  <th className="text-start p-3">{language === "ar" ? "النوع" : "Type"}</th>
                  <th className="text-start p-3">{language === "ar" ? "الجهة" : "Entity"}</th>
                  <th className="text-start p-3">{t("common.amount")}</th>
                  <th className="text-start p-3">{language === "ar" ? "السبب" : "Reason"}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                  <th className="text-start p-3">{t("common.createdAt")}</th>
                </tr></thead>
                <tbody>
                  {settlements.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{s.id}</td>
                      <td className="p-3">{SETTLEMENT_TYPES.find(t => t.value === s.settlementType)?.[language === "ar" ? "labelAr" : "labelEn"] || s.settlementType}</td>
                      <td className="p-3">{s.relatedEntityName || `${s.relatedEntityType} #${s.relatedEntityId}`}</td>
                      <td className="p-3 font-medium">{s.amount}</td>
                      <td className="p-3 max-w-[200px] truncate">{s.reason || "-"}</td>
                      <td className="p-3"><Badge className={statusBadge(s.status)}>{s.status}</Badge></td>
                      <td className="p-3 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Create Mandoub Due */}
      <Dialog open={showCreateMD} onOpenChange={setShowCreateMD}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dues.mandoubDues")} - {t("common.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("mandoub.title")} ID *</Label><Input type="number" value={mdForm.mandoubId} onChange={e => setMdForm(p => ({ ...p, mandoubId: e.target.value }))} /></div>
            <div><Label>{language === "ar" ? "رقم الطلب" : "Order ID"}</Label><Input type="number" value={mdForm.orderId} onChange={e => setMdForm(p => ({ ...p, orderId: e.target.value }))} /></div>
            <div><Label>{t("common.amount")} *</Label><Input type="number" value={mdForm.amount} onChange={e => setMdForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div>
              <Label>{language === "ar" ? "نوع الاستحقاق" : "Earning Type"} *</Label>
              <Select value={mdForm.earningType} onValueChange={v => setMdForm(p => ({ ...p, earningType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANDOUB_EARNING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.labelAr : t.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("common.notes")}</Label><Textarea value={mdForm.notes} onChange={e => setMdForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMD(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMD.mutate({ mandoubId: parseInt(mdForm.mandoubId), orderId: mdForm.orderId ? parseInt(mdForm.orderId) : undefined, earningType: mdForm.earningType, amount: mdForm.amount, notes: mdForm.notes || undefined } as any)} disabled={!mdForm.mandoubId || !mdForm.amount || createMD.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Store Due */}
      <Dialog open={showCreateSD} onOpenChange={setShowCreateSD}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dues.storeDues")} - {t("common.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("store.title")} ID *</Label><Input type="number" value={sdForm.storeId} onChange={e => setSdForm(p => ({ ...p, storeId: e.target.value }))} /></div>
            <div><Label>{language === "ar" ? "رقم الطلب" : "Order ID"}</Label><Input type="number" value={sdForm.orderId} onChange={e => setSdForm(p => ({ ...p, orderId: e.target.value }))} /></div>
            <div><Label>{t("common.amount")} *</Label><Input type="number" value={sdForm.amount} onChange={e => setSdForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div>
              <Label>{language === "ar" ? "نوع المستحق" : "Due Type"}</Label>
              <Select value={sdForm.earningType} onValueChange={v => setSdForm(p => ({ ...p, earningType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="commission">{language === "ar" ? "عمولة" : "Commission"}</SelectItem>
                  <SelectItem value="subscription">{language === "ar" ? "اشتراك" : "Subscription"}</SelectItem>
                  <SelectItem value="penalty">{language === "ar" ? "غرامة" : "Penalty"}</SelectItem>
                  <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("common.notes")}</Label><Textarea value={sdForm.notes} onChange={e => setSdForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSD(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createSD.mutate({ storeId: parseInt(sdForm.storeId), orderId: sdForm.orderId ? parseInt(sdForm.orderId) : undefined, earningType: sdForm.earningType, amount: sdForm.amount, notes: sdForm.notes || undefined } as any)} disabled={!sdForm.storeId || !sdForm.amount || createSD.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Settlement */}
      <Dialog open={showCreateSettlement} onOpenChange={setShowCreateSettlement}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dues.settlements")} - {t("common.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === "ar" ? "نوع التسوية" : "Settlement Type"} *</Label>
              <Select value={settForm.settlementType} onValueChange={v => setSettForm(p => ({ ...p, settlementType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SETTLEMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.labelAr : t.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === "ar" ? "نوع الجهة" : "Entity Type"} *</Label>
              <Select value={settForm.relatedEntityType} onValueChange={v => setSettForm(p => ({ ...p, relatedEntityType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.labelAr : t.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{language === "ar" ? "رقم الجهة" : "Entity ID"} *</Label><Input type="number" value={settForm.relatedEntityId} onChange={e => setSettForm(p => ({ ...p, relatedEntityId: e.target.value }))} /></div>
            <div><Label>{t("common.amount")} *</Label><Input type="number" value={settForm.totalAmount} onChange={e => setSettForm(p => ({ ...p, totalAmount: e.target.value }))} /></div>
            <div><Label>{t("common.notes")}</Label><Textarea value={settForm.notes} onChange={e => setSettForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSettlement(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createSettlement.mutate({ settlementType: settForm.settlementType, relatedEntityType: settForm.relatedEntityType, relatedEntityId: parseInt(settForm.relatedEntityId), totalAmount: settForm.totalAmount, notes: settForm.notes || undefined } as any)} disabled={!settForm.relatedEntityId || !settForm.totalAmount || createSettlement.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
