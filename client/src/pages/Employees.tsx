import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Archive } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { useState } from "react";
import { toast } from "sonner";

export default function Employees() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wilayatFilter, setWilayatFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [employeePhoto, setEmployeePhoto] = useState("");

  const employees = trpc.employee.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    wilayatId: wilayatFilter !== "all" ? Number(wilayatFilter) : undefined,
  });
  const wilayats = trpc.wilayat.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.employee.create.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.employee.list.invalidate();
      setDialogOpen(false);
      setEmployeePhoto("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.employee.update.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.employee.list.invalidate();
      setDialogOpen(false);
      setEditingEmployee(null);
      setEmployeePhoto("");
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.employee.archive.useMutation({
    onSuccess: () => {
      toast.success(t("common.archive") + " ✓");
      utils.employee.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredEmployees = (employees.data ?? []).filter((emp) => {
    if (!search) return true;
    return emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone?.includes(search) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      fullName: formData.get("fullName") as string,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      wilayatId: formData.get("wilayatId") ? Number(formData.get("wilayatId")) : undefined,
      maksabRole: formData.get("maksabRole") as string || undefined,
      jobTitle: formData.get("jobTitle") as string || undefined,
      notes: formData.get("notes") as string || undefined,
      profilePhoto: employeePhoto || undefined,
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, ...data });
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
        <h1 className="text-xl font-bold">{t("employee.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingEmployee(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("employee.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? t("common.edit") : t("employee.add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>{t("employee.fullName")} *</Label>
                  <Input name="fullName" required defaultValue={editingEmployee?.fullName || ""} />
                </div>
                <div>
                  <Label>{t("common.phone")}</Label>
                  <Input name="phone" defaultValue={editingEmployee?.phone || ""} />
                </div>
                <div>
                  <Label>{t("common.email")}</Label>
                  <Input name="email" type="email" defaultValue={editingEmployee?.email || ""} />
                </div>
                <div>
                  <Label>{t("common.wilayat")}</Label>
                  <select name="wilayatId" className="w-full border rounded-md px-3 py-2 text-sm" defaultValue={editingEmployee?.wilayatId || ""}>
                    <option value="">{t("common.all")}</option>
                    {wilayats.data?.map((w) => (
                      <option key={w.id} value={w.id}>{w.nameAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t("common.role")}</Label>
                  <select name="maksabRole" className="w-full border rounded-md px-3 py-2 text-sm" defaultValue={editingEmployee?.maksabRole || ""}>
                    <option value="">{t("common.all")}</option>
                    <option value="manager">{t("role.manager")}</option>
                    <option value="deputy_manager">{t("role.deputy_manager")}</option>
                    <option value="top_employee_minister">{t("role.top_employee_minister")}</option>
                    <option value="finance_manager">{t("role.finance_manager")}</option>
                    <option value="state_employee_minister">{t("role.state_employee_minister")}</option>
                    <option value="employee">{t("role.employee")}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>{t("employee.jobTitle")}</Label>
                  <Input name="jobTitle" defaultValue={editingEmployee?.jobTitle || ""} />
                </div>
                <div className="col-span-2">
                  <Label>{t("common.notes")}</Label>
                  <textarea name="notes" className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px]" defaultValue={editingEmployee?.notes || ""} />
                </div>
                <div className="col-span-2">
                  <Label>{t("profile.profilePhoto") || "Profile Photo"}</Label>
                  <ImageUpload folder="employees" size="sm" shape="circle" showUrlFallback={true} currentImageUrl={employeePhoto || editingEmployee?.profilePhoto || undefined} onUploadComplete={(url) => setEmployeePhoto(url)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingEmployee(null); }}>
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
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
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
        <Select value={wilayatFilter} onValueChange={setWilayatFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("common.wilayat")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {wilayats.data?.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>{w.nameAr}</SelectItem>
            ))}
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
                  <th className="text-start p-3 font-medium">{t("common.role")}</th>
                  <th className="text-start p-3 font-medium">{t("common.wilayat")}</th>
                  <th className="text-start p-3 font-medium">{t("common.status")}</th>
                  <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">{t("common.noData")}</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{emp.fullName}</td>
                      <td className="p-3">{emp.phone || "-"}</td>
                      <td className="p-3">{emp.maksabRole ? t(`role.${emp.maksabRole}`) : "-"}</td>
                      <td className="p-3">
                        {wilayats.data?.find((w) => w.id === emp.wilayatId)?.nameAr || "-"}
                      </td>
                      <td className="p-3">{getStatusBadge(emp.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingEmployee(emp); setDialogOpen(true); }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm(t("common.confirm") + "?")) archiveMutation.mutate({ id: emp.id });
                            }}
                          >
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
