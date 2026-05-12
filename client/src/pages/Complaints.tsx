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

const COMPLAINT_TYPES = ["order_issue", "delivery_issue", "quality_issue", "payment_issue", "service_issue", "other"] as const;
const COMPLAINT_STATUSES = ["new", "in_progress", "resolved", "rejected", "escalated", "closed"] as const;

function statusColor(s: string) {
  const m: Record<string, string> = {
    open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800",
    escalated: "bg-red-100 text-red-800",
  };
  return m[s] || "bg-gray-100 text-gray-800";
}


export default function Complaints() {
  const { t, language } = useI18n();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [showStatusChange, setShowStatusChange] = useState<{ id: number; current: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [resolution, setResolution] = useState("");

  const [form, setForm] = useState({
    complaintType: "order_issue" as string,
    customerName: "", customerPhone: "", subject: "", description: "",
  });

  const filters = useMemo(() => ({
    status: filterStatus || undefined,
    search: search || undefined,
  }), [filterStatus, search]);

  const { data: complaints, isLoading } = trpc.complaint.list.useQuery(filters);
  const detail = trpc.complaint.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });
  const utils = trpc.useUtils();

  const createMut = trpc.complaint.create.useMutation({
    onSuccess: () => { toast.success(t("complaint.add") + " ✓"); setShowCreate(false); utils.complaint.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMut = trpc.complaint.update.useMutation({
    onSuccess: () => { toast.success("Updated"); setShowStatusChange(null); utils.complaint.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const ctLabel = (ct: string) => {
    const m: Record<string, { ar: string; en: string }> = {
      order_issue: { ar: "مشكلة طلب", en: "Order Issue" },
      delivery_issue: { ar: "مشكلة توصيل", en: "Delivery Issue" },
      quality_issue: { ar: "مشكلة جودة", en: "Quality Issue" },
      payment_issue: { ar: "مشكلة دفع", en: "Payment Issue" },
      service_issue: { ar: "مشكلة خدمة", en: "Service Issue" },
      other: { ar: "أخرى", en: "Other" },
    };
    return m[ct]?.[language] || ct;
  };
  const csLabel = (s: string) => {
    const m: Record<string, { ar: string; en: string }> = {
      open: { ar: "مفتوحة", en: "Open" }, in_progress: { ar: "قيد المعالجة", en: "In Progress" },
      resolved: { ar: "تم الحل", en: "Resolved" }, closed: { ar: "مغلقة", en: "Closed" },
      escalated: { ar: "مصعّدة", en: "Escalated" },
    };
    return m[s]?.[language] || s;
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("complaint.title")}</h1>
        <Button onClick={() => { setForm({ complaintType: "order_issue", customerName: "", customerPhone: "", subject: "", description: "" }); setShowCreate(true); }}>
          <Plus className="w-4 h-4 me-2" />{t("complaint.add")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
            </div>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("common.status")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {COMPLAINT_STATUSES.map(s => <SelectItem key={s} value={s}>{csLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p> :
          !complaints?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">#</th>
                  <th className="text-start p-3">{t("complaint.subject")}</th>
                  <th className="text-start p-3">{t("complaint.complaintType")}</th>
                  <th className="text-start p-3">{t("order.customer")}</th>

                  <th className="text-start p-3">{t("common.status")}</th>
                  <th className="text-start p-3">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{c.id}</td>
                    <td className="p-3 font-medium max-w-[200px] truncate">{c.subject || "-"}</td>
                    <td className="p-3">{ctLabel(c.complaintType)}</td>
                    <td className="p-3">{c.customerName || "-"}</td>

                    <td className="p-3"><Badge className={statusColor(c.status)}>{csLabel(c.status)}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(c.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowStatusChange({ id: c.id, current: c.status }); setNewStatus(""); setResolution(""); }}>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{t("complaint.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("complaint.subject")} *</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("complaint.complaintType")}</Label>
                <Select value={form.complaintType} onValueChange={v => setForm(p => ({ ...p, complaintType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPLAINT_TYPES.map(ct => <SelectItem key={ct} value={ct}>{ctLabel(ct)}</SelectItem>)}</SelectContent>
                </Select>
              </div>

            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("order.customer")}</Label><Input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} /></div>
              <div><Label>{t("common.phone")}</Label><Input value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} /></div>
            </div>
            <div><Label>{t("common.description")}</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMut.mutate(form as any)} disabled={!form.subject || createMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("complaint.details")}</DialogTitle></DialogHeader>
          {detail.isLoading ? <p>{t("common.loading")}</p> : detail.data ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t("complaint.complaintType")}:</span> {ctLabel(detail.data.complaintType)}</div>
                
                <div><span className="text-muted-foreground">{t("common.status")}:</span> <Badge className={statusColor(detail.data.status)}>{csLabel(detail.data.status)}</Badge></div>
                <div><span className="text-muted-foreground">{t("order.customer")}:</span> {detail.data.customerName || "-"}</div>
                <div><span className="text-muted-foreground">{t("common.phone")}:</span> {detail.data.customerPhone || "-"}</div>
              </div>
              {detail.data.description && <div><span className="text-muted-foreground">{t("common.description")}:</span> {String(detail.data.description)}</div>}
              {detail.data.resolutionNotes && <div className="p-3 bg-green-50 rounded border border-green-200"><span className="text-muted-foreground font-medium">{t("complaint.resolution")}:</span> {String(detail.data.resolutionNotes)}</div>}
              <div className="text-xs text-muted-foreground">{t("common.createdAt")}: {new Date(detail.data.createdAt).toLocaleString()}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={!!showStatusChange} onOpenChange={() => setShowStatusChange(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("common.status")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Current: <Badge className={statusColor(showStatusChange?.current || "")}>{csLabel(showStatusChange?.current || "")}</Badge></Label></div>
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {COMPLAINT_STATUSES.filter(s => s !== showStatusChange?.current).map(s => <SelectItem key={s} value={s}>{csLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("complaint.resolution")}</Label><Textarea value={resolution} onChange={e => setResolution(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusChange(null)}>{t("common.cancel")}</Button>
            <Button disabled={!newStatus || updateStatusMut.isPending} onClick={() => showStatusChange && updateStatusMut.mutate({ id: showStatusChange.id, status: newStatus, resolution: resolution || undefined })}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
