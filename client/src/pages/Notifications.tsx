import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const { t } = useI18n();
  const notifications = trpc.notification.list.useQuery();
  const utils = trpc.useUtils();

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("✓");
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("nav.notifications")}</h1>
        <Button size="sm" variant="outline" onClick={() => markAllReadMutation.mutate()} className="gap-1.5">
          <CheckCheck className="h-4 w-4" />
          {t("common.all")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {(notifications.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-30" />
              <p>{t("common.noData")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.data?.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/30 ${!n.isRead ? "bg-primary/5" : ""}`}
                  onClick={() => { if (!n.isRead) markReadMutation.mutate({ id: n.id }); }}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
