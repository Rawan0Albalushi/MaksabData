import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useState } from "react";

export default function AuditLog() {
  const { t } = useI18n();
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [detailLog, setDetailLog] = useState<any>(null);

  const logs = trpc.auditLog.list.useQuery({
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const entityTypes = ["user", "employee", "mandoub", "store", "wilayat", "approval", "menu_category", "product"];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("audit.title")}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("audit.entity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {entityTypes.map((et) => (
              <SelectItem key={et} value={et}>{et}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[160px]"
          placeholder={t("audit.from")}
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[160px]"
          placeholder={t("audit.to")}
        />
        {(entityTypeFilter !== "all" || startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setEntityTypeFilter("all"); setStartDate(""); setEndDate(""); }}>
            {t("common.clear")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">{t("audit.timestamp")}</th>
                  <th className="text-start p-3 font-medium">{t("audit.user")}</th>
                  <th className="text-start p-3 font-medium">{t("audit.action")}</th>
                  <th className="text-start p-3 font-medium">{t("audit.entity")}</th>
                  <th className="text-start p-3 font-medium">{t("common.notes")}</th>
                  <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">{t("common.noData")}</td>
                  </tr>
                ) : (
                  (logs.data ?? []).map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                      </td>
                      <td className="p-3">{log.userName || "-"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{log.actionType}</Badge>
                      </td>
                      <td className="p-3">{log.entityType} {log.entityId ? `#${log.entityId}` : ""}</td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{log.notes || "-"}</td>
                      <td className="p-3">
                        {(log.oldValues || log.newValues) ? (
                          <Button variant="ghost" size="sm" onClick={() => setDetailLog(log)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={(open) => { if (!open) setDetailLog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("audit.details")}</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{t("audit.action")}:</span> <Badge variant="outline">{detailLog.actionType}</Badge></div>
                <div><span className="text-muted-foreground">{t("audit.user")}:</span> {detailLog.userName}</div>
                <div><span className="text-muted-foreground">{t("audit.entity")}:</span> {detailLog.entityType} {detailLog.entityId ? `#${detailLog.entityId}` : ""}</div>
                <div><span className="text-muted-foreground">{t("audit.timestamp")}:</span> {detailLog.createdAt ? new Date(detailLog.createdAt).toLocaleString() : ""}</div>
              </div>
              {detailLog.oldValues && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("audit.oldValues")}</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {typeof detailLog.oldValues === "string" ? detailLog.oldValues : JSON.stringify(detailLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.newValues && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("audit.newValues")}</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {typeof detailLog.newValues === "string" ? detailLog.newValues : JSON.stringify(detailLog.newValues, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-1">{t("common.notes")}</h4>
                  <p className="text-sm">{detailLog.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
