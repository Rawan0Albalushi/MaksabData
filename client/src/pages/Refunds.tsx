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
import { Plus, Search, Eye, CheckCircle, XCircle } from "lucide-react";

const REFUND_TYPES = ["full", "partial", "exchange"] as const;
const REFUND_STATUSES = ["pending_review", "approved", "rejected", "processed"] as const;

function statusColor(s: string) {
  const m: Record<string, string> = {
    pending_review: "bg-yellow-100 text-yellow-800", approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800", processed: "bg-blue-100 text-blue-800",
  };
  return m[s] || "bg-gray-100 text-gray-800";
}

export default function Refunds() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [form, setForm] = useState({ orderId: "", refundType: "full" as string, reason: "", originalAmount: "", refundAmount: "", refundMethod: "" });

  const filters = useMemo(() => ({ status: filterStatus || undefined, search: search || undefined }), [filterStatus, search]);
  const { data: refunds, isLoading } = trpc.refund.list.useQuery(filters);
  const detail = trpc.refund.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });
  const utils = trpc.useUtils();

  const createMut = trpc.refund.create.useMutation({
    onSuccess: () => { toast.success(t("refund.add") + " ✓"); setShowCreate(false); utils.refund.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const reviewMut = trpc.refund.review.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.refund.list.invalidate(); utils.refund.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("refund.title")}</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 me-2" />{t("refund.add")}</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
            </div>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("common.status")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {REFUND_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`refund.status.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p> :
          !refunds?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">#</th>
                  <th className="text-start p-3">{t("refund.refundType")}</th>
                  <th className="text-start p-3">{t("refund.reason")}</th>
                  <th className="text-start p-3">{t("refund.originalAmount")}</th>
                  <th className="text-start p-3">{t("refund.refundAmount")}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                  <th className="text-start p-3">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r: any) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{r.id}</td>
                    <td className="p-3">{t(`refund.type.${r.refundType}`)}</td>
                    <td className="p-3 max-w-[200px] truncate">{r.reason || "-"}</td>
                    <td className="p-3">{r.originalAmount || "-"}</td>
                    <td className="p-3 font-medium">{r.refundAmount || "-"}</td>
                    <td className="p-3"><Badge className={statusColor(r.status)}>{t(`refund.status.${r.status}`)}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(r.id)}><Eye className="w-4 h-4" /></Button>
                        {r.status === "pending_review" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => reviewMut.mutate({ id: r.id, status: "approved" })}><CheckCircle className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => reviewMut.mutate({ id: r.id, status: "rejected" })}><XCircle className="w-4 h-4" /></Button>
                          </>
                        )}
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
          <DialogHeader><DialogTitle>{t("refund.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("order.orderNumber")} (ID)</Label><Input value={form.orderId} onChange={e => setForm(p => ({ ...p, orderId: e.target.value }))} /></div>
            <div>
              <Label>{t("refund.refundType")}</Label>
              <Select value={form.refundType} onValueChange={v => setForm(p => ({ ...p, refundType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REFUND_TYPES.map(rt => <SelectItem key={rt} value={rt}>{t(`refund.type.${rt}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("refund.reason")}</Label><Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("refund.originalAmount")}</Label><Input type="number" value={form.originalAmount} onChange={e => setForm(p => ({ ...p, originalAmount: e.target.value }))} /></div>
              <div><Label>{t("refund.refundAmount")}</Label><Input type="number" value={form.refundAmount} onChange={e => setForm(p => ({ ...p, refundAmount: e.target.value }))} /></div>
            </div>
            <div><Label>{t("refund.refundMethod")}</Label><Input value={form.refundMethod} onChange={e => setForm(p => ({ ...p, refundMethod: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMut.mutate({ ...form, orderId: form.orderId ? parseInt(form.orderId) : undefined } as any)} disabled={createMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("refund.title")}</DialogTitle></DialogHeader>
          {detail.isLoading ? <p>{t("common.loading")}</p> : detail.data ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t("refund.refundType")}:</span> {t(`refund.type.${detail.data.refundType}`)}</div>
                <div><span className="text-muted-foreground">{t("common.status")}:</span> <Badge className={statusColor(detail.data.status)}>{t(`refund.status.${detail.data.status}`)}</Badge></div>
                <div><span className="text-muted-foreground">{t("refund.originalAmount")}:</span> {detail.data.paidAmount || "-"}</div>
                <div><span className="text-muted-foreground">{t("refund.refundAmount")}:</span> {detail.data.refundAmount || "-"}</div>
              </div>
              {detail.data.reason && <div><span className="text-muted-foreground">{t("refund.reason")}:</span> {String(detail.data.reason)}</div>}
              <div className="text-xs text-muted-foreground">{t("common.createdAt")}: {new Date(detail.data.createdAt).toLocaleString()}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
