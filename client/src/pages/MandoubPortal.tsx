import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, User, Phone, Mail, MapPin, Briefcase, Calendar } from "lucide-react";

export default function MandoubPortal() {
  const { user } = useAuth();
  const { t } = useI18n();

  // Query mandoub's own profile from the backend
  const myProfile = trpc.mandoub.myProfile.useQuery(undefined, {
    enabled: user?.maksabRole === "mandoub",
    retry: false,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-600",
      pending_approval: "bg-yellow-100 text-yellow-800",
      suspended: "bg-red-100 text-red-800",
    };
    return <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>{t(`status.${status}`)}</Badge>;
  };

  // If user is not a mandoub, show access denied
  if (user && user.maksabRole !== "mandoub") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t("common.noPermission")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profile = myProfile.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("mandoub.portal")}</h1>
        <p className="text-muted-foreground mt-1">{t("dashboard.welcome")}, {user?.name || "User"}</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("mandoub.myProfile")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myProfile.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : profile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.fullName")}</p>
                  <p className="text-sm font-medium">{profile.fullName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.phone")}</p>
                  <p className="text-sm font-medium">{profile.phone || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.email")}</p>
                  <p className="text-sm font-medium">{profile.email || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("mandoub.wilayat")}</p>
                  <p className="text-sm font-medium">{profile.wilayatId || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.type")}</p>
                  <p className="text-sm font-medium">
                    {profile.mandoubType === "fast" ? t("mandoub.typeFast") : t("mandoub.typeLongDistance")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.status")}</p>
                  {getStatusBadge(profile.status)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("common.noData")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t("mandoub.myWork")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{profile.status === "active" ? "✓" : "✗"}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("common.status")}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {profile.mandoubType === "fast" ? "⚡" : "🚗"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t("common.type")}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("common.noData")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
