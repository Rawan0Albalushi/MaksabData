import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  Building2,
  Camera,
} from "lucide-react";
import { useState } from "react";

export default function MyProfile() {
  const { user } = useAuth();
  const { language, dir } = useI18n();
  const isAr = language === "ar";
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const profileQuery = trpc.auth.getMyProfile.useQuery(undefined, { enabled: !!user });
  const wilayatsQuery = trpc.wilayat.list.useQuery(undefined, { enabled: editing });
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: (data) => {
      if (data.directUpdate) {
        toast.success(isAr ? "تم تحديث البيانات بنجاح" : "Profile updated successfully");
      } else {
        toast.success(isAr ? "تم إرسال طلب تعديل بياناتك وهو بانتظار الاعتماد" : "Your profile update request has been submitted and is pending approval.");
      }
      setEditing(false);
      setEditData({});
      profileQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!user) return null;
  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir={dir}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  if (!profile) return null;

  const { user: userData, wilayatName, managerName, employeeProfile, mandoubProfile, mandoubStats, pendingEdit } = profile;

  // Role labels
  const roleLabels: Record<string, { ar: string; en: string }> = {
    manager: { ar: "المدير", en: "Manager" },
    deputy_manager: { ar: "نائب المدير", en: "Deputy Manager" },
    top_employee_minister: { ar: "الوزير الأعلى للموظفين", en: "Top Employee Minister" },
    finance_manager: { ar: "المدير المالي", en: "Finance Manager" },
    state_employee_minister: { ar: "وزير موظفي الولاية", en: "State Employee Minister" },
    employee: { ar: "موظف", en: "Employee" },
    mandoub: { ar: "مندوب", en: "Mandoub" },
  };

  // Status labels
  const statusLabels: Record<string, { ar: string; en: string; color: string }> = {
    active: { ar: "نشط", en: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    inactive: { ar: "غير نشط", en: "Inactive", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
    pending_approval: { ar: "بانتظار الموافقة", en: "Pending Approval", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    suspended: { ar: "معلق", en: "Suspended", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
    archived: { ar: "مؤرشف", en: "Archived", color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300" },
    pending_role_assignment: { ar: "بانتظار تعيين المنصب", en: "Pending Role Assignment", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  };

  const mandoubTypeLabels: Record<string, { ar: string; en: string }> = {
    fast: { ar: "مندوب سريع", en: "Fast Mandoub" },
    long_distance: { ar: "مندوب المسافات الطويلة", en: "Long-distance Mandoub" },
  };

  const userStatus = userData.status || "active";
  const statusInfo = statusLabels[userStatus] || statusLabels.active;
  const userRoleKey = userData.maksabRole || (userData.role === "admin" ? "manager" : "employee");
  const roleInfo = roleLabels[userRoleKey] || { ar: "موظف", en: "Employee" };

  function startEditing() {
    setEditData({
      name: userData.name || "",
      fullNameWithTribe: userData.fullNameWithTribe || "",
      phone: userData.phone || "",
      email: userData.email || "",
      wilayatId: userData.wilayatId || undefined,
      profilePhoto: userData.profilePhoto || "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditData({});
  }

  function submitEdit() {
    const changes: Record<string, any> = {};
    if (editData.name && editData.name !== (userData.name || "")) changes.name = editData.name;
    if (editData.fullNameWithTribe && editData.fullNameWithTribe !== (userData.fullNameWithTribe || "")) changes.fullNameWithTribe = editData.fullNameWithTribe;
    if (editData.phone && editData.phone !== (userData.phone || "")) changes.phone = editData.phone;
    if (editData.email && editData.email !== (userData.email || "")) changes.email = editData.email;
    if (editData.wilayatId && editData.wilayatId !== userData.wilayatId) changes.wilayatId = editData.wilayatId;
    if (editData.profilePhoto && editData.profilePhoto !== (userData.profilePhoto || "")) changes.profilePhoto = editData.profilePhoto;

    if (Object.keys(changes).length === 0) {
      toast.info(isAr ? "لا توجد تغييرات" : "No changes detected");
      return;
    }
    updateProfileMutation.mutate(changes);
  }

  function formatDate(d: any) {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleDateString(isAr ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function InfoRow({ icon: Icon, label, value, valueAr }: { icon: any; label: string; value: any; valueAr?: string }) {
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium truncate">{(isAr && valueAr) ? valueAr : (value || "-")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir={dir}>
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAr ? "بياناتي" : "My Profile"}</h1>
        {!editing && !pendingEdit && (
          <Button onClick={startEditing} variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            {isAr ? "تعديل البيانات" : "Edit Profile"}
          </Button>
        )}
      </div>

      {/* Pending Edit Banner */}
      {pendingEdit && !editing && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {isAr ? "تعديلاتك بانتظار الاعتماد" : "Your changes are pending approval"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "سيتم تحديث بياناتك بعد اعتماد الطلب من المسؤول" : "Your profile will be updated once the request is approved by an authorized admin"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {userData.profilePhoto ? (
                <img src={userData.profilePhoto} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                  <span className="text-2xl font-bold text-primary">{userData.name?.charAt(0)?.toUpperCase() || "U"}</span>
                </div>
              )}
              {editing && (
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Name & Role */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{userData.fullNameWithTribe || userData.name || "-"}</h2>
              <p className="text-sm text-muted-foreground">{isAr ? roleInfo.ar : roleInfo.en}</p>
              {userData.jobTitle && <p className="text-xs text-muted-foreground mt-0.5">{userData.jobTitle}</p>}
            </div>
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {isAr ? statusInfo.ar : statusInfo.en}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editing && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {isAr ? "تعديل البيانات الشخصية" : "Edit Personal Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isAr ? "الاسم" : "Name"}</Label>
                <Input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الاسم الكامل مع القبيلة" : "Full Name with Tribe"}</Label>
                <Input value={editData.fullNameWithTribe || ""} onChange={(e) => setEditData({ ...editData, fullNameWithTribe: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "رقم الهاتف" : "Phone"}</Label>
                <Input value={editData.phone || ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                <Input value={editData.email || ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} dir="ltr" type="email" />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الولاية" : "Wilayat"}</Label>
                <Select value={editData.wilayatId?.toString() || ""} onValueChange={(v) => setEditData({ ...editData, wilayatId: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder={isAr ? "اختر الولاية" : "Select Wilayat"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(wilayatsQuery.data || []).map((w: any) => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.nameAr || w.nameEn || `#${w.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "صورة الملف الشخصي" : "Profile Photo"}</Label>
                <ImageUpload
                  currentImageUrl={editData.profilePhoto || undefined}
                  onUploadComplete={(url) => setEditData({ ...editData, profilePhoto: url })}
                  folder="profiles"
                  shape="circle"
                  size="md"
                  showUrlFallback={true}
                />
              </div>
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEditing} disabled={updateProfileMutation.isPending}>
                <X className="h-4 w-4 me-1" />
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={submitEdit} disabled={updateProfileMutation.isPending}>
                <Save className="h-4 w-4 me-1" />
                {updateProfileMutation.isPending
                  ? (isAr ? "جاري الإرسال..." : "Submitting...")
                  : (isAr ? "إرسال طلب التعديل" : "Submit Change Request")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {isAr
                ? "ملاحظة: التعديلات لن تُطبق فوراً وستحتاج لاعتماد من المسؤول (ما لم تكن المدير)"
                : "Note: Changes won't be applied immediately and require approval from an admin (unless you are the Manager)"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {isAr ? "البيانات الشخصية" : "Personal Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow icon={User} label={isAr ? "الاسم الكامل مع القبيلة" : "Full Name with Tribe"} value={userData.fullNameWithTribe || userData.name} />
            <InfoRow icon={Phone} label={isAr ? "رقم الهاتف" : "Phone"} value={userData.phone} />
            <InfoRow icon={Mail} label={isAr ? "البريد الإلكتروني" : "Email"} value={userData.email} />
            <InfoRow icon={MapPin} label={isAr ? "الولاية" : "Wilayat"} value={wilayatName || (userData.wilayatId ? `#${userData.wilayatId}` : "-")} />
            <InfoRow icon={Calendar} label={isAr ? "تاريخ إنشاء الحساب" : "Account Created"} value={formatDate(userData.createdAt)} />
            <InfoRow icon={Calendar} label={isAr ? "آخر تحديث" : "Last Updated"} value={formatDate(userData.updatedAt)} />
          </CardContent>
        </Card>

        {/* Work Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {isAr ? "بيانات العمل" : "Work Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow icon={Shield} label={isAr ? "الدور" : "Role"} value={isAr ? roleInfo.ar : roleInfo.en} />
            <InfoRow icon={Briefcase} label={isAr ? "المنصب / المسمى الوظيفي" : "Job Title"} value={userData.jobTitle} />
            <InfoRow icon={User} label={isAr ? "نوع المستخدم" : "User Type"} value={userData.role === "admin" ? (isAr ? "مدير النظام" : "Admin") : (isAr ? "مستخدم" : "User")} />
            <InfoRow icon={User} label={isAr ? "المسؤول المباشر" : "Direct Manager"} value={managerName} />
            <InfoRow icon={MapPin} label={isAr ? "الولاية المرتبطة" : "Assigned Wilayat"} value={wilayatName || "-"} />
            {(() => {
              const perms = userData.permissions as string[] | null;
              if (!perms || !Array.isArray(perms) || perms.length === 0) return null;
              return (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground mb-1">{isAr ? "ملخص الصلاحيات" : "Permissions Summary"}</p>
                  <div className="flex flex-wrap gap-1">
                    {perms.slice(0, 6).map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                    ))}
                    {perms.length > 6 && (
                      <Badge variant="outline" className="text-[10px]">+{perms.length - 6}</Badge>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Linked Employee Section */}
        {employeeProfile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {isAr ? "بيانات الموظف" : "Employee Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={User} label={isAr ? "معرف الموظف" : "Employee ID"} value={`#${employeeProfile.id}`} />
              <InfoRow icon={Briefcase} label={isAr ? "المسمى الوظيفي" : "Job Title"} value={employeeProfile.jobTitle} />
              <InfoRow icon={MapPin} label={isAr ? "الولاية" : "Wilayat"} value={employeeProfile.wilayatId ? `#${employeeProfile.wilayatId}` : "-"} />
              <InfoRow icon={Shield} label={isAr ? "الحالة" : "Status"} value={
                statusLabels[employeeProfile.status]
                  ? (isAr ? statusLabels[employeeProfile.status].ar : statusLabels[employeeProfile.status].en)
                  : employeeProfile.status
              } />
              {employeeProfile.notes && (
                <InfoRow icon={AlertCircle} label={isAr ? "ملاحظات" : "Notes"} value={employeeProfile.notes} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Linked Mandoub Section */}
        {mandoubProfile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {isAr ? "بيانات المندوب" : "Mandoub Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={User} label={isAr ? "معرف المندوب" : "Mandoub ID"} value={`#${mandoubProfile.id}`} />
              <InfoRow icon={Truck} label={isAr ? "نوع المندوب" : "Mandoub Type"} value={
                mandoubTypeLabels[mandoubProfile.mandoubType]
                  ? (isAr ? mandoubTypeLabels[mandoubProfile.mandoubType].ar : mandoubTypeLabels[mandoubProfile.mandoubType].en)
                  : mandoubProfile.mandoubType
              } />
              <InfoRow icon={Shield} label={isAr ? "الحالة" : "Status"} value={
                statusLabels[mandoubProfile.status]
                  ? (isAr ? statusLabels[mandoubProfile.status].ar : statusLabels[mandoubProfile.status].en)
                  : mandoubProfile.status
              } />
              <InfoRow icon={MapPin} label={isAr ? "الولاية" : "Wilayat"} value={mandoubProfile.wilayatId ? `#${mandoubProfile.wilayatId}` : "-"} />
              {mandoubProfile.responsibleEmployeeId && (
                <InfoRow icon={User} label={isAr ? "الموظف المسؤول" : "Responsible Employee"} value={`#${mandoubProfile.responsibleEmployeeId}`} />
              )}

              {/* Mandoub Stats */}
              {mandoubStats ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">{isAr ? "إحصائيات العمل" : "Work Statistics"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{mandoubStats.totalOrders}</p>
                      <p className="text-[10px] text-muted-foreground">{isAr ? "طلبات مكتملة" : "Completed Orders"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{mandoubStats.totalEarnings.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{isAr ? "إجمالي الأرباح" : "Total Earnings"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{mandoubStats.paidAmount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{isAr ? "المبلغ المدفوع" : "Paid Amount"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{mandoubStats.remainingAmount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{isAr ? "المبلغ المتبقي" : "Remaining"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    {isAr ? "لا توجد بيانات عمل مسجلة حتى الآن." : "No work data has been recorded yet."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {isAr ? "حالة الحساب" : "Account Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              {userStatus === "active" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-amber-500" />}
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "حالة الحساب" : "Account Status"}</p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                  {isAr ? statusInfo.ar : statusInfo.en}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "تاريخ الإنشاء" : "Created"}</p>
                <p className="text-sm font-medium">{formatDate(userData.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? "آخر تسجيل دخول" : "Last Sign In"}</p>
                <p className="text-sm font-medium">{formatDate(userData.lastSignedIn)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
