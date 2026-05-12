import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_NAMES, MaksabRole, isSuperAdmin } from "@shared/permissions";
import { Plus, Pencil, CheckCircle, XCircle, Truck, Tag, Shield, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { t, language } = useI18n();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState("users");

  // Category state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);

  // User role state
  const [editingUser, setEditingUser] = useState<any>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // Role management state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: "", nameAr: "", nameEn: "", description: "" });
  const [showRolePermsDialog, setShowRolePermsDialog] = useState(false);
  const [editingRolePerms, setEditingRolePerms] = useState<any>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  // Job title state
  const [showJobTitleDialog, setShowJobTitleDialog] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<any>(null);
  const [jobTitleForm, setJobTitleForm] = useState({ nameAr: "", nameEn: "", description: "" });

  const categories = trpc.storeCategory.list.useQuery();
  const users = trpc.auth.listUsers.useQuery();
  const wilayats = trpc.wilayat.list.useQuery();
  const rolesQuery = trpc.role.list.useQuery();
  const jobTitlesQuery = trpc.jobTitle.list.useQuery();
  const utils = trpc.useUtils();

  const canEditRoles = useMemo(() => {
    if (!currentUser) return false;
    return isSuperAdmin((currentUser as any).maksabRole) || (currentUser as any).role === "admin";
  }, [currentUser]);

  // Category mutations
  const createCat = trpc.storeCategory.create.useMutation({
    onSuccess: () => { toast.success(t("common.save") + " ✓"); utils.storeCategory.list.invalidate(); setCatDialogOpen(false); setEditingCat(null); },
    onError: (err) => toast.error(err.message),
  });
  const updateCat = trpc.storeCategory.update.useMutation({
    onSuccess: () => { toast.success(t("common.save") + " ✓"); utils.storeCategory.list.invalidate(); setCatDialogOpen(false); setEditingCat(null); },
    onError: (err: any) => toast.error(err.message),
  });

  // User admin mutation
  const adminUpdateUser = trpc.auth.adminUpdateUser.useMutation({
    onSuccess: () => { toast.success(t("common.save") + " ✓"); utils.auth.listUsers.invalidate(); setRoleDialogOpen(false); setEditingUser(null); },
    onError: (err: any) => toast.error(err.message),
  });

  // Role mutations
  const createRole = trpc.role.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم إنشاء الدور" : "Role created"); utils.role.list.invalidate(); setShowRoleDialog(false); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateRole = trpc.role.update.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم التحديث" : "Updated"); utils.role.list.invalidate(); setShowRoleDialog(false); },
    onError: (err: any) => toast.error(err.message),
  });
  const setRolePerms = trpc.role.setPermissions.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم تحديث الصلاحيات" : "Permissions updated"); setShowRolePermsDialog(false); },
    onError: (err: any) => toast.error(err.message),
  });

  // Job title mutations
  const createJobTitle = trpc.jobTitle.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم إنشاء المسمى الوظيفي" : "Job title created"); utils.jobTitle.list.invalidate(); setShowJobTitleDialog(false); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateJobTitle = trpc.jobTitle.update.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم التحديث" : "Updated"); utils.jobTitle.list.invalidate(); setShowJobTitleDialog(false); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nameAr: formData.get("nameAr") as string,
      nameEn: (formData.get("nameEn") as string) || undefined,
      sortOrder: formData.get("sortOrder") ? Number(formData.get("sortOrder")) : 0,
    };
    if (editingCat) {
      updateCat.mutate({ id: editingCat.id, ...data });
    } else {
      createCat.mutate(data);
    }
  };

  const handleRoleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(e.currentTarget);
    const selectedRole = formData.get("maksabRole") as string;
    const selectedPerms: string[] = [];
    PERMISSIONS.forEach((perm) => {
      if (formData.get(`perm_${perm}`) === "on") {
        selectedPerms.push(perm);
      }
    });
    adminUpdateUser.mutate({
      userId: editingUser.id,
      maksabRole: selectedRole,
      permissions: selectedPerms,
      status: formData.get("status") as string || undefined,
      jobTitle: formData.get("jobTitle") as string || undefined,
    });
  };

  const roles = Object.keys(ROLE_NAMES) as MaksabRole[];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="users"><Users className="w-4 h-4 me-1" />{language === "ar" ? "المستخدمين" : "Users"}</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="w-4 h-4 me-1" />{language === "ar" ? "الأدوار" : "Roles"}</TabsTrigger>
          <TabsTrigger value="jobTitles"><Briefcase className="w-4 h-4 me-1" />{language === "ar" ? "المسميات الوظيفية" : "Job Titles"}</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="w-4 h-4 me-1" />{t("settings.storeCategories")}</TabsTrigger>
          <TabsTrigger value="permissions"><Shield className="w-4 h-4 me-1" />{language === "ar" ? "مصفوفة الصلاحيات" : "Permissions Matrix"}</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {language === "ar" ? "إدارة المستخدمين والأدوار" : "User Role Management"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.data && users.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-start p-3 font-medium">{t("common.name")}</th>
                        <th className="text-start p-3 font-medium">{t("common.email")}</th>
                        <th className="text-start p-3 font-medium">{t("common.role")}</th>
                        <th className="text-start p-3 font-medium">{language === "ar" ? "المسمى الوظيفي" : "Job Title"}</th>
                        <th className="text-start p-3 font-medium">{t("common.status")}</th>
                        <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.data.map((u: any) => (
                        <tr key={u.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{u.name || u.fullNameWithTribe || "-"}</td>
                          <td className="p-3 text-muted-foreground text-xs">{u.email || "-"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {u.maksabRole ? (language === "ar" ? (ROLE_NAMES[u.maksabRole as MaksabRole]?.ar || u.maksabRole) : (ROLE_NAMES[u.maksabRole as MaksabRole]?.en || u.maksabRole)) : "-"}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs">{u.jobTitle || "-"}</td>
                          <td className="p-3">
                            <Badge className={u.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                              {t(`status.${u.status || "active"}`)}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {canEditRoles && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingUser(u); setRoleDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROLES TAB */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {language === "ar" ? "إدارة الأدوار" : "Role Management"}
              </CardTitle>
              {canEditRoles && (
                <Button size="sm" onClick={() => { setEditingRole(null); setRoleForm({ name: "", nameAr: "", nameEn: "", description: "" }); setShowRoleDialog(true); }}>
                  <Plus className="h-4 w-4 me-1" />{t("common.add")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {rolesQuery.data && rolesQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-start p-3 font-medium">{language === "ar" ? "المعرف" : "Key"}</th>
                        <th className="text-start p-3 font-medium">{t("common.nameAr")}</th>
                        <th className="text-start p-3 font-medium">{t("common.nameEn")}</th>
                        <th className="text-start p-3 font-medium">{language === "ar" ? "نظامي" : "System"}</th>
                        <th className="text-start p-3 font-medium">{t("common.status")}</th>
                        <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rolesQuery.data.map((r: any) => (
                        <tr key={r.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{r.name}</td>
                          <td className="p-3 font-medium">{r.nameAr}</td>
                          <td className="p-3">{r.nameEn || "-"}</td>
                          <td className="p-3">{r.isSystemRole ? <Badge className="bg-blue-100 text-blue-800">{language === "ar" ? "نظامي" : "System"}</Badge> : <Badge variant="outline">{language === "ar" ? "مخصص" : "Custom"}</Badge>}</td>
                          <td className="p-3"><Badge className={r.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{r.isActive ? t("status.active") : t("status.inactive")}</Badge></td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {canEditRoles && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => { setEditingRole(r); setRoleForm({ name: r.name, nameAr: r.nameAr, nameEn: r.nameEn || "", description: r.description || "" }); setShowRoleDialog(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={async () => {
                                    setEditingRolePerms(r);
                                    // Fetch current permissions for this role
                                    const roleData = await utils.role.getById.fetch({ id: r.id });
                                    setSelectedPerms(roleData?.permissions || []);
                                    setShowRolePermsDialog(true);
                                  }}>
                                    <Shield className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              )}

              {/* Static roles reference */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">{language === "ar" ? "الأدوار الثابتة (من النظام)" : "Built-in Static Roles"}</h3>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <Badge key={role} variant="outline" className="px-3 py-1">
                      {language === "ar" ? ROLE_NAMES[role].ar : ROLE_NAMES[role].en}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* JOB TITLES TAB */}
        <TabsContent value="jobTitles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {language === "ar" ? "المسميات الوظيفية" : "Job Titles"}
              </CardTitle>
              {canEditRoles && (
                <Button size="sm" onClick={() => { setEditingJobTitle(null); setJobTitleForm({ nameAr: "", nameEn: "", description: "" }); setShowJobTitleDialog(true); }}>
                  <Plus className="h-4 w-4 me-1" />{t("common.add")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {jobTitlesQuery.data && jobTitlesQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-start p-3 font-medium">{t("common.nameAr")}</th>
                        <th className="text-start p-3 font-medium">{t("common.nameEn")}</th>
                        <th className="text-start p-3 font-medium">{t("common.description")}</th>
                        <th className="text-start p-3 font-medium">{t("common.status")}</th>
                        <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobTitlesQuery.data.map((jt: any) => (
                        <tr key={jt.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{jt.nameAr}</td>
                          <td className="p-3">{jt.nameEn || "-"}</td>
                          <td className="p-3 text-xs max-w-[200px] truncate">{jt.description || "-"}</td>
                          <td className="p-3"><Badge className={jt.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{jt.isActive ? t("status.active") : t("status.inactive")}</Badge></td>
                          <td className="p-3">
                            {canEditRoles && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingJobTitle(jt); setJobTitleForm({ nameAr: jt.nameAr, nameEn: jt.nameEn || "", description: jt.description || "" }); setShowJobTitleDialog(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORE CATEGORIES TAB */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t("settings.storeCategories")}
              </CardTitle>
              <Button size="sm" className="gap-1.5" onClick={() => { setEditingCat(null); setCatDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                {t("common.add")}
              </Button>
            </CardHeader>
            <CardContent>
              {categories.data && categories.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-start p-3 font-medium">{t("common.nameAr")}</th>
                        <th className="text-start p-3 font-medium">{t("common.nameEn")}</th>
                        <th className="text-start p-3 font-medium">{t("common.sortOrder")}</th>
                        <th className="text-start p-3 font-medium">{t("common.status")}</th>
                        <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.data.map((cat) => (
                        <tr key={cat.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{cat.nameAr}</td>
                          <td className="p-3">{cat.nameEn || "-"}</td>
                          <td className="p-3">{cat.sortOrder ?? 0}</td>
                          <td className="p-3">
                            <Badge className={cat.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                              {cat.isActive ? t("status.active") : t("status.inactive")}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCat(cat); setCatDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERMISSIONS MATRIX TAB */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t("settings.rolesPermissions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-start p-2 font-medium sticky start-0 bg-muted/50">{t("common.permission")}</th>
                      {roles.map((role) => (
                        <th key={role} className="text-center p-2 font-medium whitespace-nowrap">
                          {language === "ar" ? ROLE_NAMES[role].ar : ROLE_NAMES[role].en}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((perm) => (
                      <tr key={perm} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium sticky start-0 bg-background whitespace-nowrap">{perm}</td>
                        {roles.map((role) => {
                          const has = DEFAULT_ROLE_PERMISSIONS[role]?.includes(perm);
                          return (
                            <td key={role} className="text-center p-2">
                              {has ? <CheckCircle className="h-4 w-4 text-green-600 inline" /> : <XCircle className="h-4 w-4 text-gray-300 inline" />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Store Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={(open) => { if (!open) { setCatDialogOpen(false); setEditingCat(null); } else setCatDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? t("common.edit") : t("common.add")} - {t("settings.storeCategories")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCatSubmit} className="space-y-4">
            <div><Label>{t("common.nameAr")} *</Label><Input name="nameAr" required defaultValue={editingCat?.nameAr || ""} /></div>
            <div><Label>{t("common.nameEn")}</Label><Input name="nameEn" defaultValue={editingCat?.nameEn || ""} /></div>
            <div><Label>{t("common.sortOrder")}</Label><Input name="sortOrder" type="number" defaultValue={editingCat?.sortOrder ?? 0} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCatDialogOpen(false); setEditingCat(null); }}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={createCat.isPending || updateCat.isPending}>{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role/Permission Edit Dialog for Users */}
      {editingUser && (
        <Dialog open={roleDialogOpen} onOpenChange={(open) => { if (!open) { setRoleDialogOpen(false); setEditingUser(null); } else setRoleDialogOpen(true); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("common.edit")} - {editingUser.name || editingUser.email || `User #${editingUser.id}`}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <Label>{t("common.role")} *</Label>
                <select name="maksabRole" defaultValue={editingUser.maksabRole || "employee"} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {language === "ar" ? ROLE_NAMES[role].ar : ROLE_NAMES[role].en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("common.status")}</Label>
                <select name="status" defaultValue={editingUser.status || "active"} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                  <option value="active">{t("status.active")}</option>
                  <option value="inactive">{t("status.inactive")}</option>
                  <option value="suspended">{t("status.suspended")}</option>
                  <option value="archived">{t("status.archived")}</option>
                </select>
              </div>
              <div>
                <Label>{language === "ar" ? "المسمى الوظيفي" : "Job Title"}</Label>
                <Input name="jobTitle" defaultValue={editingUser.jobTitle || ""} />
              </div>
              <div>
                <Label className="mb-2 block">{t("common.permission")}s</Label>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
                  {PERMISSIONS.map((perm) => {
                    const userPerms = (editingUser.permissions as string[]) ?? [];
                    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[editingUser.maksabRole as MaksabRole] ?? [];
                    const hasPerm = userPerms.includes(perm) || defaultPerms.includes(perm);
                    return (
                      <div key={perm} className="flex items-center gap-2">
                        <input type="checkbox" name={`perm_${perm}`} defaultChecked={hasPerm} className="h-4 w-4 rounded border-gray-300" />
                        <label className="text-sm">{perm}</label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setRoleDialogOpen(false); setEditingUser(null); }}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={adminUpdateUser.isPending}>{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? (language === "ar" ? "تعديل الدور" : "Edit Role") : (language === "ar" ? "دور جديد" : "New Role")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingRole && <div><Label>{language === "ar" ? "المعرف (بالإنجليزية)" : "Key (English)"} *</Label><Input value={roleForm.name} onChange={e => setRoleForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s/g, "_") }))} placeholder="e.g. regional_manager" /></div>}
            <div><Label>{t("common.nameAr")} *</Label><Input value={roleForm.nameAr} onChange={e => setRoleForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><Label>{t("common.nameEn")}</Label><Input value={roleForm.nameEn} onChange={e => setRoleForm(p => ({ ...p, nameEn: e.target.value }))} /></div>
            <div><Label>{t("common.description")}</Label><Textarea value={roleForm.description} onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => {
              if (editingRole) {
                updateRole.mutate({ id: editingRole.id, nameAr: roleForm.nameAr || undefined, nameEn: roleForm.nameEn || undefined, description: roleForm.description || undefined });
              } else {
                createRole.mutate({ name: roleForm.name, nameAr: roleForm.nameAr, nameEn: roleForm.nameEn || undefined, description: roleForm.description || undefined });
              }
            }} disabled={(!editingRole && (!roleForm.name || !roleForm.nameAr)) || createRole.isPending || updateRole.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Permissions Dialog */}
      {editingRolePerms && (
        <Dialog open={showRolePermsDialog} onOpenChange={setShowRolePermsDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{language === "ar" ? "صلاحيات الدور" : "Role Permissions"}: {editingRolePerms.nameAr || editingRolePerms.name}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto border rounded-md p-3">
              {PERMISSIONS.map((perm) => (
                <div key={perm} className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedPerms.includes(perm)} onChange={(e) => {
                    if (e.target.checked) setSelectedPerms(p => [...p, perm]);
                    else setSelectedPerms(p => p.filter(x => x !== perm));
                  }} className="h-4 w-4 rounded border-gray-300" />
                  <label className="text-sm">{perm}</label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRolePermsDialog(false)}>{t("common.cancel")}</Button>
              <Button onClick={() => setRolePerms.mutate({ roleId: editingRolePerms.id, permissions: selectedPerms })} disabled={setRolePerms.isPending}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Job Title Dialog */}
      <Dialog open={showJobTitleDialog} onOpenChange={setShowJobTitleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingJobTitle ? (language === "ar" ? "تعديل المسمى الوظيفي" : "Edit Job Title") : (language === "ar" ? "مسمى وظيفي جديد" : "New Job Title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{t("common.nameAr")} *</Label><Input value={jobTitleForm.nameAr} onChange={e => setJobTitleForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
            <div><Label>{t("common.nameEn")}</Label><Input value={jobTitleForm.nameEn} onChange={e => setJobTitleForm(p => ({ ...p, nameEn: e.target.value }))} /></div>
            <div><Label>{t("common.description")}</Label><Textarea value={jobTitleForm.description} onChange={e => setJobTitleForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobTitleDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => {
              if (editingJobTitle) {
                updateJobTitle.mutate({ id: editingJobTitle.id, nameAr: jobTitleForm.nameAr || undefined, nameEn: jobTitleForm.nameEn || undefined, description: jobTitleForm.description || undefined });
              } else {
                createJobTitle.mutate({ nameAr: jobTitleForm.nameAr, nameEn: jobTitleForm.nameEn || undefined, description: jobTitleForm.description || undefined });
              }
            }} disabled={!jobTitleForm.nameAr || createJobTitle.isPending || updateJobTitle.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
