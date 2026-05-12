import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Archive, CheckCircle, XCircle } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { useState } from "react";
import { toast } from "sonner";

export default function Mandoubs() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMandoub, setEditingMandoub] = useState<any>(null);
  const [mandoubPhoto, setMandoubPhoto] = useState("");

  const mandoubs = trpc.mandoub.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const wilayats = trpc.wilayat.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.mandoub.create.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.mandoub.list.invalidate();
      setDialogOpen(false);
      setMandoubPhoto("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.mandoub.update.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.mandoub.list.invalidate();
      setDialogOpen(false);
      setEditingMandoub(null);
      setMandoubPhoto("");
    },
    onError: (err) => toast.error(err.message),
  });

  const approveMutation = trpc.mandoub.approve.useMutation({
    onSuccess: () => {
      toast.success(t("common.approve") + " ✓");
      utils.mandoub.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.mandoub.archive.useMutation({
    onSuccess: () => {
      toast.success(t("common.archive") + " ✓");
      utils.mandoub.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredMandoubs = (mandoubs.data ?? []).filter((m) => {
    if (!search) return true;
    return m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search) ||
      m.email?.toLowerCase().includes(search.toLowerCase());
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      fullName: formData.get("fullName") as string,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      wilayatId: formData.get("wilayatId") ? Number(formData.get("wilayatId")) : undefined,
      mandoubType: formData.get("mandoubType") as "fast" | "long_distance",
      notes: formData.get("notes") as string || undefined,
      profilePhoto: mandoubPhoto || undefined,
    };

    if (editingMandoub) {
      updateMutation.mutate({ id: editingMandoub.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      pending_approval: "bg-yellow-100 text-yellow-800",
      suspended: "bg-red-100 text-red-800",
      archived: "bg-gray-200 text-gray-600",
    };
    return <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>{t(`status.${status}`)}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">{t("mandoub.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingMandoub(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("mandoub.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMandoub ? t("common.edit") : t("mandoub.add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>{t("employee.fullName")} *</Label>
                  <Input name="fullName" required defaultValue={editingMandoub?.fullName || ""} />
                </div>
                <div>
                  <Label>{t("common.phone")}</Label>
                  <Input name="phone" defaultValue={editingMandoub?.phone || ""} />
                </div>
                <div>
                  <Label>{t("common.email")}</Label>
                  <Input name="email" type="email" defaultValue={editingMandoub?.email || ""} />
                </div>
                <div>
                  <Label>{t("common.wilayat")}</Label>
                  <select name="wilayatId" className="w-full border rounded-md px-3 py-2 text-sm" defaultValue={editingMandoub?.wilayatId || ""}>
                    <option value="">{t("common.all")}</option>
                    {wilayats.data?.map((w) => (
                      <option key={w.id} value={w.id}>{w.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t("mandoub.type")} *</Label>
                  <select name="mandoubType" required className="w-full border rounded-md px-3 py-2 text-sm" defaultValue={editingMandoub?.mandoubType || "fast"}>
                    <option value="fast">{t("mandoub.fast")}</option>
                    <option value="long_distance">{t("mandoub.long_distance")}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>{t("common.notes")}</Label>
                  <textarea name="notes" className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px]" defaultValue={editingMandoub?.notes || ""} />
                </div>
                <div className="col-span-2">
                  <Label>{t("profile.profilePhoto") || "Profile Photo"}</Label>
                  <ImageUpload folder="mandoubs" size="sm" shape="circle" showUrlFallback={true} currentImageUrl={mandoubPhoto || editingMandoub?.profilePhoto || undefined} onUploadComplete={(url) => setMandoubPhoto(url)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingMandoub(null); }}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="active">{t("status.active")}</SelectItem>
            <SelectItem value="inactive">{t("status.inactive")}</SelectItem>
            <SelectItem value="pending_approval">{t("status.pending_approval")}</SelectItem>
            <SelectItem value="suspended">{t("status.suspended")}</SelectItem>
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
                  <th className="text-start p-3 font-medium">{t("employee.fullName")}</th>
                  <th className="text-start p-3 font-medium">{t("common.phone")}</th>
                  <th className="text-start p-3 font-medium">{t("mandoub.type")}</th>
                  <th className="text-start p-3 font-medium">{t("common.wilayat")}</th>
                  <th className="text-start p-3 font-medium">{t("common.status")}</th>
                  <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMandoubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">{t("common.noData")}</td>
                  </tr>
                ) : (
                  filteredMandoubs.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{m.fullName}</td>
                      <td className="p-3">{m.phone || "-"}</td>
                      <td className="p-3">{t(`mandoub.${m.mandoubType}`)}</td>
                      <td className="p-3">
                        {wilayats.data?.find((w) => w.id === m.wilayatId)?.nameAr || "-"}
                      </td>
                      <td className="p-3">{getStatusBadge(m.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {m.status === "pending_approval" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => approveMutation.mutate({ id: m.id, approved: true })}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => approveMutation.mutate({ id: m.id, approved: false })}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingMandoub(m); setDialogOpen(true); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(t("common.confirm") + "?")) archiveMutation.mutate({ id: m.id }); }}>
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
