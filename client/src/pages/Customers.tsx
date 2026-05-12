import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Eye, Edit, Archive } from "lucide-react";

export default function Customers() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", wilayat: "", address: "", notes: "" });

  const filters = useMemo(() => ({ search: search || undefined }), [search]);
  const { data: customers, isLoading } = trpc.customer.list.useQuery(filters);
  const detail = trpc.customer.getById.useQuery({ id: showDetail! }, { enabled: !!showDetail });
  const utils = trpc.useUtils();

  const createMut = trpc.customer.create.useMutation({
    onSuccess: () => { toast.success(t("customer.add") + " ✓"); setShowCreate(false); utils.customer.list.invalidate(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.customer.update.useMutation({
    onSuccess: () => { toast.success(t("common.save") + " ✓"); setEditId(null); utils.customer.list.invalidate(); resetForm(); },
    onError: (e) => toast.error(e.message),
  });
  const archiveMut = trpc.customer.archive.useMutation({
    onSuccess: () => { toast.success("Archived"); utils.customer.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() { setForm({ fullName: "", phone: "", email: "", wilayat: "", address: "", notes: "" }); }
  function openEdit(c: any) {
    setForm({ fullName: c.fullName || "", phone: c.phone || "", email: c.email || "", wilayat: c.wilayat || "", address: c.address || "", notes: c.notes || "" });
    setEditId(c.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("customer.title")}</h1>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}><Plus className="w-4 h-4 me-2" />{t("customer.add")}</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("common.search")} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p> :
          !customers?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">{t("customer.fullName")}</th>
                  <th className="text-start p-3">{t("customer.phone")}</th>
                  <th className="text-start p-3">{t("customer.email")}</th>
                  <th className="text-start p-3">{t("common.wilayat")}</th>
                  <th className="text-start p-3">{t("customer.totalOrders")}</th>
                  <th className="text-start p-3">{t("customer.totalBookings")}</th>
                  <th className="text-start p-3">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{c.fullName}</td>
                    <td className="p-3">{c.phone || "-"}</td>
                    <td className="p-3">{c.email || "-"}</td>
                    <td className="p-3">{c.wilayat || "-"}</td>
                    <td className="p-3">{c.totalOrders ?? 0}</td>
                    <td className="p-3">{c.totalBookings ?? 0}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(c.id)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => archiveMut.mutate({ id: c.id })}><Archive className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{t("customer.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("customer.fullName")} *</Label><Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("customer.phone")}</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>{t("customer.email")}</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div><Label>{t("common.wilayat")}</Label><Input value={form.wilayat} onChange={e => setForm(p => ({ ...p, wilayat: e.target.value }))} /></div>
            <div><Label>{t("customer.address")}</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>{t("common.notes")}</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.fullName || createMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("common.edit")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("customer.fullName")} *</Label><Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("customer.phone")}</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>{t("customer.email")}</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div><Label>{t("common.wilayat")}</Label><Input value={form.wilayat} onChange={e => setForm(p => ({ ...p, wilayat: e.target.value }))} /></div>
            <div><Label>{t("customer.address")}</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>{t("common.notes")}</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => editId && updateMut.mutate({ id: editId, ...form })} disabled={!form.fullName || updateMut.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("customer.details")}</DialogTitle></DialogHeader>
          {detail.isLoading ? <p>{t("common.loading")}</p> : detail.data ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t("customer.fullName")}:</span> {detail.data.fullName}</div>
                <div><span className="text-muted-foreground">{t("customer.phone")}:</span> {detail.data.phone || "-"}</div>
                <div><span className="text-muted-foreground">{t("customer.email")}:</span> {detail.data.email || "-"}</div>
                <div><span className="text-muted-foreground">{t("common.wilayat")}:</span> {detail.data.wilayatId || "-"}</div>
              </div>
              {detail.data.address && <div><span className="text-muted-foreground">{t("customer.address")}:</span> {String(detail.data.address)}</div>}
              {detail.data.notes && <div><span className="text-muted-foreground">{t("common.notes")}:</span> {String(detail.data.notes)}</div>}
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t("customer.totalOrders")}:</span> {detail.data.totalOrders ?? 0}</div>
                <div><span className="text-muted-foreground">{t("customer.totalBookings")}:</span> {detail.data.totalBookings ?? 0}</div>
              </div>
              <div className="text-xs text-muted-foreground">{t("common.createdAt")}: {new Date(detail.data.createdAt).toLocaleString()}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
