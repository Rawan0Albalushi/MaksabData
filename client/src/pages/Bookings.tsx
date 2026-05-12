import { useState, useMemo } from "react";
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
import { toast } from "sonner";
import { Plus, Search, Eye, ArrowRight } from "lucide-react";

const SERVICE_TYPES = ["turf_field", "grass_field", "wedding_hall", "other"] as const;
const BOOKING_STATUSES = ["new", "waiting_confirmation", "confirmed", "completed", "cancelled", "rejected", "needs_follow_up", "refunded", "partially_refunded"] as const;

function statusColor(s: string) {
  const m: Record<string, string> = {
    new: "bg-blue-100 text-blue-800", waiting_confirmation: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-indigo-100 text-indigo-800", completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800", rejected: "bg-red-200 text-red-900",
    needs_follow_up: "bg-orange-100 text-orange-800",
    refunded: "bg-purple-100 text-purple-800",
    partially_refunded: "bg-pink-100 text-pink-800",
  };
  return m[s] || "bg-gray-100 text-gray-800";
}

const serviceTypeLabels: Record<string, { ar: string; en: string }> = {
  turf_field: { ar: "ملعب نجيل صناعي", en: "Turf Field" },
  grass_field: { ar: "ملعب عشبي", en: "Grass Field" },
  wedding_hall: { ar: "قاعة أفراح", en: "Wedding Hall" },
  other: { ar: "أخرى", en: "Other" },
};

const bookingStatusLabels: Record<string, { ar: string; en: string }> = {
  new: { ar: "جديد", en: "New" },
  waiting_confirmation: { ar: "بانتظار التأكيد", en: "Waiting Confirmation" },
  confirmed: { ar: "مؤكد", en: "Confirmed" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  needs_follow_up: { ar: "يحتاج متابعة", en: "Needs Follow-up" },
  refunded: { ar: "مسترد", en: "Refunded" },
  partially_refunded: { ar: "مسترد جزئياً", en: "Partially Refunded" },
};

export default function Bookings() {
  const { t, language } = useI18n();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [showStatusChange, setShowStatusChange] = useState<{ id: number; current: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const [form, setForm] = useState({
    serviceType: "turf_field" as string, customerName: "", customerPhone: "",
    serviceProviderName: "", bookingDate: "", startTime: "", endTime: "",
    totalAmount: "", depositAmount: "", notes: "",
  });

  const filters = useMemo(() => ({
    serviceType: filterType || undefined,
    bookingStatus: filterStatus || undefined,
    search: search || undefined,
  }), [filterType, filterStatus, search]);

  const { data: bookings, isLoading } = trpc.booking.list.useQuery(filters);
  const detail = trpc.booking.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });
  const utils = trpc.useUtils();

  const createMut = trpc.booking.create.useMutation({
    onSuccess: () => { toast.success(t("booking.add") + " ✓"); setShowCreate(false); utils.booking.list.invalidate(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMut = trpc.booking.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); setShowStatusChange(null); utils.booking.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ serviceType: "turf_field", customerName: "", customerPhone: "", serviceProviderName: "", bookingDate: "", startTime: "", endTime: "", totalAmount: "", depositAmount: "", notes: "" });
  }

  const stLabel = (s: string) => (serviceTypeLabels[s]?.[language] || s);
  const bsLabel = (s: string) => (bookingStatusLabels[s]?.[language] || s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("booking.title")}</h1>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}><Plus className="w-4 h-4 me-2" />{t("booking.add")}</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
            </div>
            <Select value={filterType} onValueChange={v => setFilterType(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("booking.serviceType")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {SERVICE_TYPES.map(st => <SelectItem key={st} value={st}>{stLabel(st)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("booking.bookingStatus")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {BOOKING_STATUSES.map(s => <SelectItem key={s} value={s}>{bsLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p> :
          !bookings?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">#</th>
                  <th className="text-start p-3">{t("booking.serviceType")}</th>
                  <th className="text-start p-3">{t("order.customer")}</th>
                  <th className="text-start p-3">{language === "ar" ? "مزود الخدمة" : "Provider"}</th>
                  <th className="text-start p-3">{t("common.amount")}</th>
                  <th className="text-start p-3">{t("booking.bookingStatus")}</th>
                  <th className="text-start p-3">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr key={b.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{b.id}</td>
                    <td className="p-3">{stLabel(b.serviceType)}</td>
                    <td className="p-3">{b.customerName || "-"}</td>
                    <td className="p-3">{b.serviceProviderName || "-"}</td>
                    <td className="p-3 font-medium">{b.totalAmount || "-"}</td>
                    <td className="p-3"><Badge className={statusColor(b.bookingStatus)}>{bsLabel(b.bookingStatus)}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(b.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowStatusChange({ id: b.id, current: b.bookingStatus }); setNewStatus(""); }}>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("booking.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("booking.serviceType")} *</Label>
              <Select value={form.serviceType} onValueChange={v => setForm(p => ({ ...p, serviceType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(st => <SelectItem key={st} value={st}>{stLabel(st)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("order.customer")}</Label><Input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} /></div>
              <div><Label>{t("common.phone")}</Label><Input value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} /></div>
            </div>
            <div><Label>{language === "ar" ? "مزود الخدمة" : "Service Provider"}</Label><Input value={form.serviceProviderName} onChange={e => setForm(p => ({ ...p, serviceProviderName: e.target.value }))} /></div>
            <div><Label>{t("booking.scheduledDate")} *</Label><Input type="date" value={form.bookingDate} onChange={e => setForm(p => ({ ...p, bookingDate: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{language === "ar" ? "وقت البداية" : "Start Time"}</Label><Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} /></div>
              <div><Label>{language === "ar" ? "وقت النهاية" : "End Time"}</Label><Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("common.amount")}</Label><Input type="number" value={form.totalAmount} onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))} /></div>
              <div><Label>{language === "ar" ? "العربون" : "Deposit"}</Label><Input type="number" value={form.depositAmount} onChange={e => setForm(p => ({ ...p, depositAmount: e.target.value }))} /></div>
            </div>
            <div><Label>{t("common.notes")}</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMut.mutate(form as any)} disabled={createMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("booking.details")}</DialogTitle></DialogHeader>
          {detail.isLoading ? <p>{t("common.loading")}</p> : detail.data ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t("booking.serviceType")}:</span> {stLabel(detail.data.serviceType)}</div>
                <div><span className="text-muted-foreground">{t("booking.bookingStatus")}:</span> <Badge className={statusColor(detail.data.bookingStatus)}>{bsLabel(detail.data.bookingStatus)}</Badge></div>
                <div><span className="text-muted-foreground">{t("order.customer")}:</span> {detail.data.customerName || "-"}</div>
                <div><span className="text-muted-foreground">{t("common.phone")}:</span> {detail.data.customerPhone || "-"}</div>
                <div><span className="text-muted-foreground">{language === "ar" ? "مزود الخدمة" : "Provider"}:</span> {detail.data.serviceProviderName || "-"}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><span className="text-muted-foreground">{t("common.amount")}:</span> {detail.data.totalAmount || "-"}</div>
                <div><span className="text-muted-foreground">{language === "ar" ? "العربون" : "Deposit"}:</span> {detail.data.depositAmount || "-"}</div>
                <div><span className="text-muted-foreground">{language === "ar" ? "المتبقي" : "Remaining"}:</span> {detail.data.remainingAmount || "-"}</div>
              </div>
              {detail.data.notes && <div><span className="text-muted-foreground">{t("common.notes")}:</span> {String(detail.data.notes)}</div>}
              <div className="text-xs text-muted-foreground">{t("common.createdAt")}: {new Date(detail.data.createdAt).toLocaleString()}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={!!showStatusChange} onOpenChange={() => setShowStatusChange(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("booking.bookingStatus")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Current: <Badge className={statusColor(showStatusChange?.current || "")}>{bsLabel(showStatusChange?.current || "")}</Badge></Label></div>
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.filter(s => s !== showStatusChange?.current).map(s => <SelectItem key={s} value={s}>{bsLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusChange(null)}>{t("common.cancel")}</Button>
            <Button disabled={!newStatus || updateStatusMut.isPending} onClick={() => showStatusChange && updateStatusMut.mutate({ id: showStatusChange.id, bookingStatus: newStatus })}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
