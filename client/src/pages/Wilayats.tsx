import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Wilayats() {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const wilayats = trpc.wilayat.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.wilayat.create.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.wilayat.list.invalidate();
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.wilayat.update.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.wilayat.list.invalidate();
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      nameAr: fd.get("nameAr") as string,
      nameEn: fd.get("nameEn") as string || undefined,
      governorate: fd.get("governorate") as string || undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("settings.wilayats")}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> {t("common.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t("common.edit") : t("common.add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Name (Arabic) *</Label><Input name="nameAr" required defaultValue={editing?.nameAr || ""} /></div>
              <div><Label>Name (English)</Label><Input name="nameEn" defaultValue={editing?.nameEn || ""} /></div>
              <div><Label>Governorate</Label><Input name="governorate" defaultValue={editing?.governorate || ""} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditing(null); }}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{t("common.save")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">Name (AR)</th>
                  <th className="text-start p-3 font-medium">Name (EN)</th>
                  <th className="text-start p-3 font-medium">Governorate</th>
                  <th className="text-start p-3 font-medium">{t("common.status")}</th>
                  <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {(wilayats.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("common.noData")}</td></tr>
                ) : (
                  (wilayats.data ?? []).map((w) => (
                    <tr key={w.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{w.nameAr}</td>
                      <td className="p-3">{w.nameEn || "-"}</td>
                      <td className="p-3">{w.governorate || "-"}</td>
                      <td className="p-3">
                        <Badge className={w.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {w.isActive ? t("status.active") : t("status.inactive")}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(w); setDialogOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
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
