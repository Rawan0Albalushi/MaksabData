import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Eye, ArrowRight } from "lucide-react";

// Correct enum values matching database schema
const ORDER_TYPES = [
  "restaurant", "cafe", "shop", "ezhalha", "contracted",
  "long_distance", "customer_to_customer", "booking", "other",
] as const;

const ORDER_STATUSES = [
  "new", "under_review", "accepted", "contacting_store",
  "waiting_store_confirmation", "store_confirmed", "store_rejected",
  "preparing", "ready_for_pickup", "waiting_for_mandoub",
  "mandoub_accepted", "mandoub_rejected", "with_mandoub",
  "on_the_way", "delivered", "completed",
  "cancelled_by_customer", "cancelled_by_maksab",
  "failed", "needs_financial_review", "refunded",
  "partially_refunded", "archived",
] as const;

const PAYMENT_STATUSES = [
  "paid", "not_paid", "partially_paid", "refunded",
  "partially_refunded", "failed", "needs_review",
] as const;

const PAYMENT_METHODS = [
  "in_app", "cash", "bank_transfer", "card", "other",
] as const;

function statusColor(s: string) {
  const m: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    under_review: "bg-indigo-100 text-indigo-800",
    accepted: "bg-teal-100 text-teal-800",
    contacting_store: "bg-cyan-100 text-cyan-800",
    waiting_store_confirmation: "bg-sky-100 text-sky-800",
    store_confirmed: "bg-emerald-100 text-emerald-800",
    store_rejected: "bg-red-100 text-red-800",
    preparing: "bg-yellow-100 text-yellow-800",
    ready_for_pickup: "bg-lime-100 text-lime-800",
    waiting_for_mandoub: "bg-amber-100 text-amber-800",
    mandoub_accepted: "bg-green-100 text-green-800",
    mandoub_rejected: "bg-red-100 text-red-800",
    with_mandoub: "bg-purple-100 text-purple-800",
    on_the_way: "bg-violet-100 text-violet-800",
    delivered: "bg-green-200 text-green-900",
    completed: "bg-green-300 text-green-900",
    cancelled_by_customer: "bg-red-100 text-red-800",
    cancelled_by_maksab: "bg-red-200 text-red-900",
    failed: "bg-red-100 text-red-800",
    needs_financial_review: "bg-orange-100 text-orange-800",
    refunded: "bg-pink-100 text-pink-800",
    partially_refunded: "bg-pink-50 text-pink-700",
    archived: "bg-gray-200 text-gray-700",
    // Payment statuses
    paid: "bg-green-100 text-green-800",
    not_paid: "bg-red-100 text-red-800",
    partially_paid: "bg-amber-100 text-amber-800",
    needs_review: "bg-orange-100 text-orange-800",
  };
  return m[s] || "bg-gray-100 text-gray-800";
}

export default function Orders() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPayment, setFilterPayment] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [showStatusChange, setShowStatusChange] = useState<{ id: number; current: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  const [form, setForm] = useState({
    orderType: "restaurant", storeName: "", customerName: "", customerPhone: "",
    customerAddress: "", deliveryFee: "", totalAmount: "", paymentMethod: "cash",
    notes: "", internalNotes: "", scheduledDate: "",
  });

  const filters = useMemo(() => ({
    orderType: filterType || undefined,
    orderStatus: filterStatus || undefined,
    paymentStatus: filterPayment || undefined,
    search: search || undefined,
  }), [filterType, filterStatus, filterPayment, search]);

  const { data: orders, isLoading } = trpc.order.list.useQuery(filters);
  const detail = trpc.order.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });
  const utils = trpc.useUtils();

  const createMut = trpc.order.create.useMutation({
    onSuccess: () => { toast.success(t("order.add") + " ✓"); setShowCreate(false); utils.order.list.invalidate(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMut = trpc.order.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); setShowStatusChange(null); utils.order.list.invalidate(); utils.order.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ orderType: "restaurant", storeName: "", customerName: "", customerPhone: "", customerAddress: "", deliveryFee: "", totalAmount: "", paymentMethod: "cash", notes: "", internalNotes: "", scheduledDate: "" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("order.title")}</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 me-2" />{t("order.add")}</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
            </div>
            <Select value={filterType} onValueChange={v => setFilterType(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("order.orderType")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {ORDER_TYPES.map(ot => <SelectItem key={ot} value={ot}>{t(`order.type.${ot}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("order.orderStatus")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`order.status.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={v => setFilterPayment(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("order.paymentStatus")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`order.payment.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p> :
          !orders?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">{t("order.orderNumber")}</th>
                  <th className="text-start p-3">{t("order.orderType")}</th>
                  <th className="text-start p-3">{t("order.store")}</th>
                  <th className="text-start p-3">{t("order.customer")}</th>
                  <th className="text-start p-3">{t("order.totalAmount")}</th>
                  <th className="text-start p-3">{t("order.orderStatus")}</th>
                  <th className="text-start p-3">{t("order.paymentStatus")}</th>
                  <th className="text-start p-3">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                    <td className="p-3">{t(`order.type.${o.orderType}`)}</td>
                    <td className="p-3">{o.storeId || "-"}</td>
                    <td className="p-3">{o.customerName || "-"}</td>
                    <td className="p-3 font-medium">{o.orderAmount || "-"}</td>
                    <td className="p-3"><Badge className={statusColor(o.orderStatus)}>{t(`order.status.${o.orderStatus}`)}</Badge></td>
                    <td className="p-3"><Badge className={statusColor(o.paymentStatus)}>{t(`order.payment.${o.paymentStatus}`)}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(o.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowStatusChange({ id: o.id, current: o.orderStatus }); setNewStatus(""); setStatusNotes(""); }}>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("order.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("order.orderType")} *</Label>
              <Select value={form.orderType} onValueChange={v => setForm(p => ({ ...p, orderType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map(ot => <SelectItem key={ot} value={ot}>{t(`order.type.${ot}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("order.store")}</Label><Input value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("order.customer")}</Label><Input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} /></div>
              <div><Label>{t("common.phone")}</Label><Input value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} /></div>
            </div>
            <div><Label>{t("customer.address")}</Label><Input value={form.customerAddress} onChange={e => setForm(p => ({ ...p, customerAddress: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("order.deliveryFee")}</Label><Input type="number" value={form.deliveryFee} onChange={e => setForm(p => ({ ...p, deliveryFee: e.target.value }))} /></div>
              <div><Label>{t("order.totalAmount")}</Label><Input type="number" value={form.totalAmount} onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))} /></div>
            </div>
            <div>
              <Label>{t("order.paymentMethod")}</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(pm => <SelectItem key={pm} value={pm}>{t(`order.payment.${pm}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("order.scheduledDate")}</Label><Input type="datetime-local" value={form.scheduledDate} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} /></div>
            <div><Label>{t("common.notes")}</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div><Label>{t("order.internalNotes")}</Label><Textarea value={form.internalNotes} onChange={e => setForm(p => ({ ...p, internalNotes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMut.mutate(form as any)} disabled={createMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("order.details")}</DialogTitle></DialogHeader>
          {detail.isLoading ? <p>{t("common.loading")}</p> : detail.data ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t("order.orderNumber")}:</span> <span className="font-mono">{detail.data.orderNumber}</span></div>
                <div><span className="text-muted-foreground">{t("order.orderType")}:</span> {t(`order.type.${detail.data.orderType}`)}</div>
                <div><span className="text-muted-foreground">{t("order.orderStatus")}:</span> <Badge className={statusColor(detail.data.orderStatus)}>{t(`order.status.${detail.data.orderStatus}`)}</Badge></div>
                <div><span className="text-muted-foreground">{t("order.paymentStatus")}:</span> <Badge className={statusColor(detail.data.paymentStatus || "")}>{t(`order.payment.${detail.data.paymentStatus || ""}`)}</Badge></div>
                <div><span className="text-muted-foreground">{t("order.store")}:</span> {detail.data.storeId || "-"}</div>
                <div><span className="text-muted-foreground">{t("order.customer")}:</span> {detail.data.customerName || "-"}</div>
                <div><span className="text-muted-foreground">{t("common.phone")}:</span> {detail.data.customerPhone || "-"}</div>
                <div><span className="text-muted-foreground">{t("order.totalAmount")}:</span> {detail.data.orderAmount || "-"}</div>
                <div><span className="text-muted-foreground">{t("order.deliveryFee")}:</span> {detail.data.deliveryFee || "-"}</div>
                <div><span className="text-muted-foreground">{t("order.paymentMethod")}:</span> {detail.data.paymentMethod ? t(`order.payment.${detail.data.paymentMethod}`) : "-"}</div>
              </div>
              {detail.data.customerNotes && <div><span className="text-muted-foreground">{t("common.notes")}:</span><p className="mt-1">{String(detail.data.customerNotes)}</p></div>}
              {detail.data.internalNotes && <div><span className="text-muted-foreground">{t("order.internalNotes")}:</span><p className="mt-1">{String(detail.data.internalNotes)}</p></div>}
              <div className="text-xs text-muted-foreground">{t("common.createdAt")}: {new Date(detail.data.createdAt).toLocaleString()}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={!!showStatusChange} onOpenChange={() => setShowStatusChange(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("order.orderStatus")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Current: <Badge className={statusColor(showStatusChange?.current || "")}>{t(`order.status.${showStatusChange?.current || ""}`)}</Badge></Label></div>
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.filter(s => s !== showStatusChange?.current).map(s => <SelectItem key={s} value={s}>{t(`order.status.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("common.notes")}</Label><Textarea value={statusNotes} onChange={e => setStatusNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusChange(null)}>{t("common.cancel")}</Button>
            <Button disabled={!newStatus || updateStatusMut.isPending} onClick={() => showStatusChange && updateStatusMut.mutate({ id: showStatusChange.id, orderStatus: newStatus, notes: statusNotes || undefined })}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
